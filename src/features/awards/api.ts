import { fetchJson } from "@/lib/api/client";
import type { GuestAward } from "./server/award-repository";

export function getGuestAward(eventSlug: string, guestId: string) { return fetchJson<{ award: GuestAward | null }>(`/api/events/${encodeURIComponent(eventSlug)}/guests/${encodeURIComponent(guestId)}/awards`); }
export function markGuestAwardRead(eventSlug: string, guestId: string, awardId: string) { return fetchJson<{ read: boolean }>(`/api/events/${encodeURIComponent(eventSlug)}/guests/${encodeURIComponent(guestId)}/awards`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ awardId }) }); }
