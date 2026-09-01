import { fetchJson } from "@/lib/api/client";
import type { GuestAward } from "./server/award-repository";

export function getGuestAward(eventSlug: string, guestId: string) { return fetchJson<{ award: GuestAward | null }>(`/api/events/${encodeURIComponent(eventSlug)}/guests/${encodeURIComponent(guestId)}/awards`); }
export function respondToGuestAward(eventSlug: string, guestId: string, awardId: string, action: "dismiss" | "claim") { return fetchJson<{ updated: boolean }>(`/api/events/${encodeURIComponent(eventSlug)}/guests/${encodeURIComponent(guestId)}/awards`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ awardId, action }) }); }
