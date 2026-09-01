import "server-only";

import { measureDatabase } from "@/lib/observability/request-context";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export type GuestAward = { id: string; message: string; createdAt: string };

export async function createGuestAward(eventId: string, guestId: string, message: string): Promise<{ award: GuestAward | null; error: unknown }> {
  const { data, error } = await measureDatabase("awards.create", () => getSupabaseServerClient().from("guest_awards").insert({ event_id: eventId, guest_id: guestId, message }).select("id, message, created_at").single());
  return { award: data ? { id: data.id, message: data.message, createdAt: data.created_at } : null, error };
}

export async function getUnreadGuestAward(eventId: string, guestId: string): Promise<{ award: GuestAward | null; error: unknown }> {
  const { data, error } = await measureDatabase("awards.unread", () => getSupabaseServerClient().from("guest_awards").select("id, message, created_at").eq("event_id", eventId).eq("guest_id", guestId).is("read_at", null).order("created_at", { ascending: false }).limit(1).maybeSingle());
  return { award: data ? { id: data.id, message: data.message, createdAt: data.created_at } : null, error };
}

export async function markGuestAwardRead(eventId: string, guestId: string, awardId: string): Promise<{ found: boolean; error: unknown }> {
  const { data, error } = await measureDatabase("awards.read", () => getSupabaseServerClient().from("guest_awards").update({ read_at: new Date().toISOString() }).eq("id", awardId).eq("event_id", eventId).eq("guest_id", guestId).is("read_at", null).select("id").maybeSingle());
  return { found: Boolean(data), error };
}
