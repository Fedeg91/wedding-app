import "server-only";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { PaginatedResponse, PhotoFeedItem, PhotoPost } from "@/types";
import { encodeCursor, type PhotoCursor } from "./cursor";
import { buildCloudinaryImageUrl } from "../cloudinary/image-url";
import { getCloudinaryEnv } from "@/lib/cloudinary/env";
import { measureDatabase } from "@/lib/observability/request-context";

type FeedOptions = { limit: number; guestId?: string; currentGuestId?: string; sort: "newest" | "oldest"; cursor?: PhotoCursor };
type PhotoRow = { id: string; post_id: string; post_created_at: string; group_position: number; mock_image_url: string | null; cloudinary_public_id: string | null; width: number | null; height: number | null; caption: string | null; created_at: string; guest_id: string; guest_nickname: string; like_count: number; liked_by_current_guest: boolean };

export async function listPhotos(eventId: string, options: FeedOptions): Promise<{ page: PaginatedResponse<PhotoPost> | null; error: unknown }> {
  const { data, error } = await measureDatabase("photos.feed_rpc", () => getSupabaseServerClient().rpc("list_public_photos_with_likes", {
    target_event_id: eventId,
    target_guest_id: options.guestId ?? null,
    target_current_guest_id: options.currentGuestId ?? null,
    sort_order: options.sort,
    page_limit: options.limit + 1,
    cursor_created_at: options.cursor?.createdAt ?? null,
    cursor_id: options.cursor?.id ?? null,
  }));
  if (error) return { page: null, error };
  const rows = (data ?? []) as unknown as PhotoRow[];
  const grouped = new Map<string, PhotoRow[]>();
  for (const row of rows) grouped.set(row.post_id, [...(grouped.get(row.post_id) ?? []), row]);
  const groups = [...grouped.entries()];
  const hasMore = groups.length > options.limit;
  const visibleGroups = groups.slice(0, options.limit);
  const visibleRows = visibleGroups.flatMap(([, groupRows]) => groupRows);
  const cloudName = visibleRows.some((row) => row.cloudinary_public_id) ? getCloudinaryEnv().CLOUDINARY_CLOUD_NAME : null;
  const items = visibleGroups.flatMap(([postId, groupRows]): PhotoPost[] => {
    const photos = groupRows.flatMap((row): PhotoFeedItem[] => {
      const imageUrl = row.cloudinary_public_id && cloudName ? buildCloudinaryImageUrl(cloudName, row.cloudinary_public_id, "feed") : row.mock_image_url;
      const fullscreenUrl = row.cloudinary_public_id && cloudName ? buildCloudinaryImageUrl(cloudName, row.cloudinary_public_id, "fullscreen") : imageUrl;
      return imageUrl && fullscreenUrl ? [{ id: row.id, imageUrl, fullscreenUrl, width: row.width, height: row.height, caption: row.caption, createdAt: row.created_at, likeCount: Number(row.like_count), likedByCurrentGuest: row.liked_by_current_guest, guest: { id: row.guest_id, nickname: row.guest_nickname } }] : [];
    });
    const first = groupRows[0];
    return photos.length ? [{ id: postId, createdAt: first.post_created_at, caption: first.caption, guest: { id: first.guest_id, nickname: first.guest_nickname }, photos }] : [];
  });
  const last = visibleGroups.at(-1)?.[1][0];
  return { page: { items, nextCursor: hasMore && last ? encodeCursor({ createdAt: last.post_created_at, id: last.post_id }) : null }, error: null };
}

export type CreatePhotoInput = { eventId: string; guestId: string; clientUploadId: string; uploadGroupId: string; uploadGroupCreatedAt: string; uploadGroupPosition: number; cloudinaryPublicId: string; width: number; height: number; caption: string | null; format: string; bytes: number; originalFilename: string | null };

export async function createPublishedPhoto(input: CreatePhotoInput): Promise<{ item: PhotoFeedItem | null; error: unknown }> {
  const client = getSupabaseServerClient();
  const { data: existing, error: existingError } = await measureDatabase("photos.find_idempotent", () => client.from("photos").select("id, event_id, guest_id, cloudinary_public_id, width, height, caption, created_at, guests!inner(id, nickname)").eq("event_id", input.eventId).or(`client_upload_id.eq.${input.clientUploadId},cloudinary_public_id.eq.${input.cloudinaryPublicId}`).maybeSingle());
  if (existingError) return { item: null, error: existingError };
  const cloudName = getCloudinaryEnv().CLOUDINARY_CLOUD_NAME;
  if (existing) {
    if (existing.event_id !== input.eventId || existing.guest_id !== input.guestId || !existing.cloudinary_public_id) return { item: null, error: new Error("Cloudinary asset already belongs to another guest or event") };
    const joinedGuest = existing.guests as unknown as { id: string; nickname: string };
    return { item: { id: existing.id, imageUrl: buildCloudinaryImageUrl(cloudName, existing.cloudinary_public_id), fullscreenUrl: buildCloudinaryImageUrl(cloudName, existing.cloudinary_public_id, "fullscreen"), width: existing.width, height: existing.height, caption: existing.caption, createdAt: existing.created_at, likeCount: 0, likedByCurrentGuest: false, guest: joinedGuest }, error: null };
  }
  const groupOwner = await client.from("photos").select("guest_id").eq("event_id", input.eventId).eq("upload_group_id", input.uploadGroupId).limit(1).maybeSingle();
  if (groupOwner.error || (groupOwner.data && groupOwner.data.guest_id !== input.guestId)) return { item: null, error: groupOwner.error ?? new Error("Upload group belongs to another guest") };
  let { data, error } = await measureDatabase("photos.create", () => client.from("photos").insert({ event_id: input.eventId, guest_id: input.guestId, client_upload_id: input.clientUploadId, upload_group_id: input.uploadGroupId, upload_group_created_at: input.uploadGroupCreatedAt, upload_group_position: input.uploadGroupPosition, cloudinary_public_id: input.cloudinaryPublicId, width: input.width, height: input.height, caption: input.caption, format: input.format, bytes: input.bytes, original_filename: input.originalFilename, status: "published" }).select("id, cloudinary_public_id, width, height, caption, created_at, guests!inner(id, nickname)").single());
  if (error?.code === "23505") {
    const retry = await client.from("photos").select("id, cloudinary_public_id, width, height, caption, created_at, guests!inner(id, nickname)").eq("event_id", input.eventId).or(`client_upload_id.eq.${input.clientUploadId},cloudinary_public_id.eq.${input.cloudinaryPublicId}`).maybeSingle();
    data = retry.data; error = retry.error;
  }
  if (error || !data || !data.cloudinary_public_id) return { item: null, error };
  return { item: { id: data.id, imageUrl: buildCloudinaryImageUrl(cloudName, data.cloudinary_public_id), fullscreenUrl: buildCloudinaryImageUrl(cloudName, data.cloudinary_public_id, "fullscreen"), width: data.width, height: data.height, caption: data.caption, createdAt: data.created_at, likeCount: 0, likedByCurrentGuest: false, guest: data.guests as unknown as { id: string; nickname: string } }, error: null };
}
