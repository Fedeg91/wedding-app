import "server-only";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { PaginatedResponse, PhotoFeedItem } from "@/types";
import { encodeCursor, type PhotoCursor } from "./cursor";
import { buildCloudinaryImageUrl } from "../cloudinary/image-url";
import { getCloudinaryEnv } from "@/lib/cloudinary/env";
import { measureDatabase } from "@/lib/observability/request-context";

type FeedOptions = { limit: number; guestId?: string; sort: "newest" | "oldest"; cursor?: PhotoCursor };
type PhotoRow = { id: string; mock_image_url: string | null; cloudinary_public_id: string | null; width: number | null; height: number | null; caption: string | null; created_at: string; guests: { id: string; nickname: string } | null };

export async function listPhotos(eventId: string, options: FeedOptions): Promise<{ page: PaginatedResponse<PhotoFeedItem> | null; error: unknown }> {
  const ascending = options.sort === "oldest";
  let query = getSupabaseServerClient()
    .from("photos")
    .select("id, mock_image_url, cloudinary_public_id, width, height, caption, created_at, guests!inner(id, nickname)")
    .eq("event_id", eventId)
    .eq("status", "published")
    .order("created_at", { ascending })
    .order("id", { ascending })
    .limit(options.limit + 1);

  if (options.guestId) query = query.eq("guest_id", options.guestId);
  if (options.cursor) {
    const comparison = ascending ? "gt" : "lt";
    query = query.or(`created_at.${comparison}.${options.cursor.createdAt},and(created_at.eq.${options.cursor.createdAt},id.${comparison}.${options.cursor.id})`);
  }

  const { data, error } = await measureDatabase("photos.feed", () => query);
  if (error) return { page: null, error };
  const rows = (data ?? []) as unknown as PhotoRow[];
  const hasMore = rows.length > options.limit;
  const visibleRows = rows.slice(0, options.limit);
  const cloudName = visibleRows.some((row) => row.cloudinary_public_id) ? getCloudinaryEnv().CLOUDINARY_CLOUD_NAME : null;
  const items = visibleRows.flatMap((row): PhotoFeedItem[] => {
    const imageUrl = row.cloudinary_public_id && cloudName ? buildCloudinaryImageUrl(cloudName, row.cloudinary_public_id, "feed") : row.mock_image_url;
    const fullscreenUrl = row.cloudinary_public_id && cloudName ? buildCloudinaryImageUrl(cloudName, row.cloudinary_public_id, "fullscreen") : imageUrl;
    return imageUrl && fullscreenUrl && row.guests ? [{ id: row.id, imageUrl, fullscreenUrl, width: row.width, height: row.height, caption: row.caption, createdAt: row.created_at, guest: row.guests }] : [];
  });
  const last = visibleRows.at(-1);
  return { page: { items, nextCursor: hasMore && last ? encodeCursor({ createdAt: last.created_at, id: last.id }) : null }, error: null };
}

export type CreatePhotoInput = { eventId: string; guestId: string; clientUploadId: string; cloudinaryPublicId: string; width: number; height: number; caption: string | null; format: string; bytes: number; originalFilename: string | null };

export async function createPublishedPhoto(input: CreatePhotoInput): Promise<{ item: PhotoFeedItem | null; error: unknown }> {
  const client = getSupabaseServerClient();
  const { data: existing, error: existingError } = await measureDatabase("photos.find_idempotent", () => client.from("photos").select("id, event_id, guest_id, cloudinary_public_id, width, height, caption, created_at, guests!inner(id, nickname)").eq("event_id", input.eventId).or(`client_upload_id.eq.${input.clientUploadId},cloudinary_public_id.eq.${input.cloudinaryPublicId}`).maybeSingle());
  if (existingError) return { item: null, error: existingError };
  const cloudName = getCloudinaryEnv().CLOUDINARY_CLOUD_NAME;
  if (existing) {
    if (existing.event_id !== input.eventId || existing.guest_id !== input.guestId || !existing.cloudinary_public_id) return { item: null, error: new Error("Cloudinary asset already belongs to another guest or event") };
    const joinedGuest = existing.guests as unknown as { id: string; nickname: string };
    return { item: { id: existing.id, imageUrl: buildCloudinaryImageUrl(cloudName, existing.cloudinary_public_id), fullscreenUrl: buildCloudinaryImageUrl(cloudName, existing.cloudinary_public_id, "fullscreen"), width: existing.width, height: existing.height, caption: existing.caption, createdAt: existing.created_at, guest: joinedGuest }, error: null };
  }
  let { data, error } = await measureDatabase("photos.create", () => client.from("photos").insert({ event_id: input.eventId, guest_id: input.guestId, client_upload_id: input.clientUploadId, cloudinary_public_id: input.cloudinaryPublicId, width: input.width, height: input.height, caption: input.caption, format: input.format, bytes: input.bytes, original_filename: input.originalFilename, status: "published" }).select("id, cloudinary_public_id, width, height, caption, created_at, guests!inner(id, nickname)").single());
  if (error?.code === "23505") {
    const retry = await client.from("photos").select("id, cloudinary_public_id, width, height, caption, created_at, guests!inner(id, nickname)").eq("event_id", input.eventId).or(`client_upload_id.eq.${input.clientUploadId},cloudinary_public_id.eq.${input.cloudinaryPublicId}`).maybeSingle();
    data = retry.data; error = retry.error;
  }
  if (error || !data || !data.cloudinary_public_id) return { item: null, error };
  return { item: { id: data.id, imageUrl: buildCloudinaryImageUrl(cloudName, data.cloudinary_public_id), fullscreenUrl: buildCloudinaryImageUrl(cloudName, data.cloudinary_public_id, "fullscreen"), width: data.width, height: data.height, caption: data.caption, createdAt: data.created_at, guest: data.guests as unknown as { id: string; nickname: string } }, error: null };
}
