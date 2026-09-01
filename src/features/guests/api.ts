import { fetchJson } from "@/lib/api/client";
import type { Guest } from "@/types";
import type { AvatarId } from "./avatars";

export function getGuests(eventSlug: string) { return fetchJson<{ items: Guest[] }>(`/api/events/${encodeURIComponent(eventSlug)}/guests`); }
export function registerGuest(eventSlug: string, nickname: string, avatarKey: AvatarId) { return fetchJson<Guest>(`/api/events/${encodeURIComponent(eventSlug)}/guests`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ nickname, avatarKey }) }); }
export function changeGuestProfile(eventSlug: string, guestId: string, nickname: string, avatarKey: AvatarId) { return fetchJson<Guest>(`/api/events/${encodeURIComponent(eventSlug)}/guests/${encodeURIComponent(guestId)}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ nickname, avatarKey }) }); }
