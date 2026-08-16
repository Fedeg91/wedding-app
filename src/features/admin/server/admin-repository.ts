import "server-only";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getCloudinaryEnv } from "@/lib/cloudinary/env";
import { buildCloudinaryImageUrl } from "@/features/photos/cloudinary/image-url";
import { encodeCursor, type PhotoCursor } from "@/features/photos/server/cursor";
import type { Event, PaginatedResponse } from "@/types";

export type AdminStats = { guests: number; publishedPhotos: number; hiddenPhotos: number };
export type AdminPhoto = { id: string; thumbnailUrl: string; caption: string | null; createdAt: string; status: "published" | "hidden"; guest: { id: string; nickname: string } };

export async function getAdminEvent(eventId: string): Promise<{ stats: AdminStats | null; error: unknown }> {
  const client = getSupabaseServerClient();
  const [guests, published, hidden] = await Promise.all([
    client.from("guests").select("id", { count: "exact", head: true }).eq("event_id", eventId),
    client.from("photos").select("id", { count: "exact", head: true }).eq("event_id", eventId).eq("status", "published"),
    client.from("photos").select("id", { count: "exact", head: true }).eq("event_id", eventId).eq("status", "hidden"),
  ]);
  const error = guests.error ?? published.error ?? hidden.error;
  return error ? { stats: null, error } : { stats: { guests: guests.count ?? 0, publishedPhotos: published.count ?? 0, hiddenPhotos: hidden.count ?? 0 }, error: null };
}

export async function updateEventControls(eventId: string, updates: { uploadEnabled?: boolean; publicGalleryEnabled?: boolean }): Promise<{ event: Event | null; error: unknown }> {
  const databaseUpdates: { upload_enabled?: boolean; public_gallery_enabled?: boolean } = {};
  if (updates.uploadEnabled !== undefined) databaseUpdates.upload_enabled = updates.uploadEnabled;
  if (updates.publicGalleryEnabled !== undefined) databaseUpdates.public_gallery_enabled = updates.publicGalleryEnabled;
  const { data, error } = await getSupabaseServerClient().from("events").update(databaseUpdates).eq("id", eventId).select("id, slug, title, event_date, upload_enabled, public_gallery_enabled").single();
  return data ? { event: { id: data.id, slug: data.slug, title: data.title, eventDate: data.event_date, uploadEnabled: data.upload_enabled, publicGalleryEnabled: data.public_gallery_enabled }, error } : { event: null, error };
}

type AdminRow = { id: string; cloudinary_public_id: string | null; mock_image_url: string | null; caption: string | null; created_at: string; status: "published" | "hidden"; guests: { id: string; nickname: string } | null };

export async function listAdminPhotos(eventId: string, options: { limit: number; status: "published" | "hidden" | "all"; cursor?: PhotoCursor }): Promise<{ page: PaginatedResponse<AdminPhoto> | null; error: unknown }> {
  let query = getSupabaseServerClient().from("photos").select("id, cloudinary_public_id, mock_image_url, caption, created_at, status, guests!inner(id, nickname)").eq("event_id", eventId).in("status", options.status === "all" ? ["published", "hidden"] : [options.status]).order("created_at", { ascending: false }).order("id", { ascending: false }).limit(options.limit + 1);
  if (options.cursor) query = query.or(`created_at.lt.${options.cursor.createdAt},and(created_at.eq.${options.cursor.createdAt},id.lt.${options.cursor.id})`);
  const { data, error } = await query;
  if (error) return { page: null, error };
  const rows = (data ?? []) as unknown as AdminRow[];
  const visible = rows.slice(0, options.limit);
  const cloudName = visible.some((row) => row.cloudinary_public_id) ? getCloudinaryEnv().CLOUDINARY_CLOUD_NAME : null;
  const items = visible.flatMap((row): AdminPhoto[] => { const thumbnailUrl = row.cloudinary_public_id && cloudName ? buildCloudinaryImageUrl(cloudName, row.cloudinary_public_id, "thumbnail") : row.mock_image_url; return thumbnailUrl && row.guests ? [{ id: row.id, thumbnailUrl, caption: row.caption, createdAt: row.created_at, status: row.status, guest: row.guests }] : []; });
  const last = visible.at(-1);
  return { page: { items, nextCursor: rows.length > options.limit && last ? encodeCursor({ createdAt: last.created_at, id: last.id }) : null }, error: null };
}

export async function setPhotoStatus(eventId: string, photoId: string, status: "published" | "hidden"): Promise<{ photo: { id: string; status: "published" | "hidden" } | null; error: unknown }> {
  const { data, error } = await getSupabaseServerClient().from("photos").update({ status }).eq("event_id", eventId).eq("id", photoId).in("status", ["published", "hidden"]).select("id, status").maybeSingle();
  return { photo: data as { id: string; status: "published" | "hidden" } | null, error };
}
