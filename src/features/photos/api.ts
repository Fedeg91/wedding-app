import { fetchJson } from "@/lib/api/client";
import type { PaginatedResponse, PhotoPost } from "@/types";

export type PhotoFeedFilters = { guestId?: string; currentGuestId?: string; sort: "newest" | "oldest"; limit?: number };

export function getPhotoPage(eventSlug: string, filters: PhotoFeedFilters, cursor?: string) {
  const query = new URLSearchParams({ limit: String(filters.limit ?? 20), sort: filters.sort });
  if (filters.guestId) query.set("guestId", filters.guestId);
  if (filters.currentGuestId) query.set("currentGuestId", filters.currentGuestId);
  if (cursor) query.set("cursor", cursor);
  return fetchJson<PaginatedResponse<PhotoPost>>(`/api/events/${encodeURIComponent(eventSlug)}/photos?${query}`);
}

export function setPhotoLike(eventSlug: string, photoId: string, guestId: string, liked: boolean) {
  return fetchJson<{ liked: boolean }>(`/api/events/${encodeURIComponent(eventSlug)}/photos/${encodeURIComponent(photoId)}/like`, { method: liked ? "POST" : "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ guestId }) });
}
