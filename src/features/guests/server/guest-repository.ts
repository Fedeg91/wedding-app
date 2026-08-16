import "server-only";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { Guest } from "@/types";
import { measureDatabase } from "@/lib/observability/request-context";

export async function listGuests(eventId: string): Promise<{ guests: Guest[]; error: unknown }> {
  const { data, error } = await measureDatabase("guests.list", () => getSupabaseServerClient().from("guests").select("id, nickname").eq("event_id", eventId).order("nickname"));
  return { guests: data ?? [], error };
}

export async function createGuest(eventId: string, nickname: string): Promise<{ guest: Guest | null; error: unknown }> {
  const { data, error } = await measureDatabase("guests.create", () => getSupabaseServerClient().from("guests").insert({ event_id: eventId, nickname }).select("id, nickname").single());
  return { guest: data, error };
}

export async function guestBelongsToEvent(eventId: string, guestId: string) {
  const { data, error } = await measureDatabase("guests.exists", () => getSupabaseServerClient().from("guests").select("id").eq("event_id", eventId).eq("id", guestId).maybeSingle());
  return { exists: Boolean(data), error };
}

export async function updateGuest(eventId: string, guestId: string, nickname: string): Promise<{ guest: Guest | null; error: unknown }> {
  const { data, error } = await measureDatabase("guests.update", () => getSupabaseServerClient().from("guests").update({ nickname }).eq("event_id", eventId).eq("id", guestId).select("id, nickname").maybeSingle());
  return { guest: data, error };
}
