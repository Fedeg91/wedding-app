import { fetchJson } from "@/lib/api/client";
import type { Guest } from "@/types";

export function getGuests(eventSlug: string) { return fetchJson<{ items: Guest[] }>(`/api/events/${encodeURIComponent(eventSlug)}/guests`); }
export function registerGuest(eventSlug: string, nickname: string) { return fetchJson<Guest>(`/api/events/${encodeURIComponent(eventSlug)}/guests`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ nickname }) }); }
export function changeGuestNickname(eventSlug: string, guestId: string, nickname: string) { return fetchJson<Guest>(`/api/events/${encodeURIComponent(eventSlug)}/guests/${encodeURIComponent(guestId)}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ nickname }) }); }
