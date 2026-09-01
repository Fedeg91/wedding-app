import "server-only";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getCloudinaryEnv } from "@/lib/cloudinary/env";
import { buildCloudinaryImageUrl } from "@/features/photos/cloudinary/image-url";
import { encodeCursor, type PhotoCursor } from "@/features/photos/server/cursor";
import type { Event, PaginatedResponse } from "@/types";

export type AdminStats = { guests: number; publishedPhotos: number; hiddenPhotos: number; totalLikes: number; mostLikedPhotoLikes: number };
export type AdminPhoto = { id: string; thumbnailUrl: string; caption: string | null; createdAt: string; status: "published" | "hidden"; likeCount: number; guest: { id: string; nickname: string } };

export async function getAdminEvent(eventId: string): Promise<{ stats: AdminStats | null; error: unknown }> {
  const client = getSupabaseServerClient();
  const [guests, published, hidden, likes, top] = await Promise.all([
    client.from("guests").select("id", { count: "exact", head: true }).eq("event_id", eventId),
    client.from("photos").select("id", { count: "exact", head: true }).eq("event_id", eventId).eq("status", "published"),
    client.from("photos").select("id", { count: "exact", head: true }).eq("event_id", eventId).eq("status", "hidden"),
    client.from("photo_likes").select("id, photos!inner(event_id)", { count: "exact", head: true }).eq("photos.event_id", eventId),
    client.rpc("list_admin_photos_with_likes", { target_event_id: eventId, status_filter: "all", sort_order: "most_liked", page_limit: 1 }),
  ]);
  const error = guests.error ?? published.error ?? hidden.error ?? likes.error ?? top.error;
  return error ? { stats: null, error } : { stats: { guests: guests.count ?? 0, publishedPhotos: published.count ?? 0, hiddenPhotos: hidden.count ?? 0, totalLikes: likes.count ?? 0, mostLikedPhotoLikes: Number(top.data?.[0]?.like_count ?? 0) }, error: null };
}

export async function updateEventControls(eventId: string, updates: { uploadEnabled?: boolean; publicGalleryEnabled?: boolean }): Promise<{ event: Event | null; error: unknown }> {
  const databaseUpdates: { upload_enabled?: boolean; public_gallery_enabled?: boolean } = {};
  if (updates.uploadEnabled !== undefined) databaseUpdates.upload_enabled = updates.uploadEnabled;
  if (updates.publicGalleryEnabled !== undefined) databaseUpdates.public_gallery_enabled = updates.publicGalleryEnabled;
  const { data, error } = await getSupabaseServerClient().from("events").update(databaseUpdates).eq("id", eventId).select("id, slug, title, event_date, upload_enabled, public_gallery_enabled").single();
  return data ? { event: { id: data.id, slug: data.slug, title: data.title, eventDate: data.event_date, uploadEnabled: data.upload_enabled, publicGalleryEnabled: data.public_gallery_enabled }, error } : { event: null, error };
}

type AdminRow = { id: string; cloudinary_public_id: string | null; mock_image_url: string | null; caption: string | null; created_at: string; status: "published" | "hidden"; guest_id: string; guest_nickname: string; like_count: number };

export async function listAdminPhotos(eventId: string, options: { limit: number; status: "published" | "hidden" | "all"; sort: "newest" | "oldest" | "most_liked"; cursor?: PhotoCursor }): Promise<{ page: PaginatedResponse<AdminPhoto> | null; error: unknown }> {
  const { data, error } = await getSupabaseServerClient().rpc("list_admin_photos_with_likes", { target_event_id: eventId, status_filter: options.status, sort_order: options.sort, page_limit: options.limit + 1, cursor_created_at: options.cursor?.createdAt ?? null, cursor_id: options.cursor?.id ?? null, cursor_like_count: options.cursor?.likeCount ?? null });
  if (error) return { page: null, error };
  const rows = (data ?? []) as unknown as AdminRow[];
  const visible = rows.slice(0, options.limit);
  const cloudName = visible.some((row) => row.cloudinary_public_id) ? getCloudinaryEnv().CLOUDINARY_CLOUD_NAME : null;
  const items = visible.flatMap((row): AdminPhoto[] => { const thumbnailUrl = row.cloudinary_public_id && cloudName ? buildCloudinaryImageUrl(cloudName, row.cloudinary_public_id, "thumbnail") : row.mock_image_url; return thumbnailUrl ? [{ id: row.id, thumbnailUrl, caption: row.caption, createdAt: row.created_at, status: row.status as "published" | "hidden", likeCount: Number(row.like_count), guest: { id: row.guest_id, nickname: row.guest_nickname } }] : []; });
  const last = visible.at(-1);
  return { page: { items, nextCursor: rows.length > options.limit && last ? encodeCursor({ createdAt: last.created_at, id: last.id, ...(options.sort === "most_liked" ? { likeCount: Number(last.like_count) } : {}) }) : null }, error: null };
}

export async function setPhotoStatus(eventId: string, photoId: string, status: "published" | "hidden"): Promise<{ photo: { id: string; status: "published" | "hidden" } | null; error: unknown }> {
  const { data, error } = await getSupabaseServerClient().from("photos").update({ status }).eq("event_id", eventId).eq("id", photoId).in("status", ["published", "hidden"]).select("id, status").maybeSingle();
  return { photo: data as { id: string; status: "published" | "hidden" } | null, error };
}
