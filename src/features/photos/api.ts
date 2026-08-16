import { fetchJson } from "@/lib/api/client";
import type { PaginatedResponse, PhotoFeedItem } from "@/types";

export type PhotoFeedFilters = { guestId?: string; sort: "newest" | "oldest"; limit?: number };

export function getPhotoPage(eventSlug: string, filters: PhotoFeedFilters, cursor?: string) {
  const query = new URLSearchParams({ limit: String(filters.limit ?? 20), sort: filters.sort });
  if (filters.guestId) query.set("guestId", filters.guestId);
  if (cursor) query.set("cursor", cursor);
  return fetchJson<PaginatedResponse<PhotoFeedItem>>(`/api/events/${encodeURIComponent(eventSlug)}/photos?${query}`);
}
