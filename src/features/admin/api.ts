import { fetchJson } from "@/lib/api/client";
import type { Event, PaginatedResponse } from "@/types";
import type { AdminPhoto, AdminStats } from "./server/admin-repository";
import type { GuestAward } from "@/features/awards/server/award-repository";

export function adminLogin(eventSlug: string, password: string) { return fetchJson<{ ok: true }>("/api/admin/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ eventSlug, password }) }); }
export function adminLogout() { return fetchJson<{ ok: true }>("/api/admin/logout", { method: "POST" }); }
export function getAdminEvent(eventSlug: string) { return fetchJson<{ event: Event; stats: AdminStats }>(`/api/admin/events/${encodeURIComponent(eventSlug)}`); }
export function patchAdminEvent(eventSlug: string, updates: { uploadEnabled?: boolean; publicGalleryEnabled?: boolean }) { return fetchJson<Event>(`/api/admin/events/${encodeURIComponent(eventSlug)}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(updates) }); }
export function getAdminPhotos(eventSlug: string, status: "all" | "published" | "hidden", sort: "newest" | "oldest" | "most_liked", cursor?: string) { const query = new URLSearchParams({ limit: "30", status, sort }); if (cursor) query.set("cursor", cursor); return fetchJson<PaginatedResponse<AdminPhoto>>(`/api/admin/events/${encodeURIComponent(eventSlug)}/photos?${query}`); }
export function patchAdminPhoto(eventSlug: string, photoId: string, status: "published" | "hidden") { return fetchJson<{ id: string; status: "published" | "hidden" }>(`/api/admin/events/${encodeURIComponent(eventSlug)}/photos/${encodeURIComponent(photoId)}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status }) }); }
export function sendGuestAward(eventSlug: string, guestId: string, message: string) { return fetchJson<GuestAward>(`/api/admin/events/${encodeURIComponent(eventSlug)}/awards`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ guestId, message }) }); }
