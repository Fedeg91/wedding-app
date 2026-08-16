import { fetchJson } from "@/lib/api/client";
import type { Event } from "@/types";

export function getEvent(eventSlug: string) { return fetchJson<Event>(`/api/events/${encodeURIComponent(eventSlug)}`); }
