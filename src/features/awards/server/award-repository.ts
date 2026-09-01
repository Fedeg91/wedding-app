import "server-only";

import { measureDatabase } from "@/lib/observability/request-context";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export type GuestAward = { id: string; message: string; createdAt: string };
export type AdminGuestAward = GuestAward & { guest: { id: string; nickname: string }; readAt: string | null; claimedAt: string | null; deliveredAt: string | null };

export async function createGuestAward(eventId: string, guestId: string, message: string): Promise<{ award: GuestAward | null; error: unknown }> {
  const { data, error } = await measureDatabase("awards.create", () => getSupabaseServerClient().from("guest_awards").insert({ event_id: eventId, guest_id: guestId, message }).select("id, message, created_at").single());
  return { award: data ? { id: data.id, message: data.message, createdAt: data.created_at } : null, error };
}

export async function getUnreadGuestAward(eventId: string, guestId: string): Promise<{ award: GuestAward | null; error: unknown }> {
  const { data, error } = await measureDatabase("awards.unread", () => getSupabaseServerClient().from("guest_awards").select("id, message, created_at").eq("event_id", eventId).eq("guest_id", guestId).is("read_at", null).order("created_at", { ascending: false }).limit(1).maybeSingle());
  return { award: data ? { id: data.id, message: data.message, createdAt: data.created_at } : null, error };
}

export async function respondToGuestAward(eventId: string, guestId: string, awardId: string, claim: boolean): Promise<{ found: boolean; error: unknown }> {
  const now = new Date().toISOString();
  const { data, error } = await measureDatabase("awards.respond", () => getSupabaseServerClient().from("guest_awards").update({ read_at: now, ...(claim ? { claimed_at: now } : {}) }).eq("id", awardId).eq("event_id", eventId).eq("guest_id", guestId).is("read_at", null).select("id").maybeSingle());
  return { found: Boolean(data), error };
}

export async function listAdminGuestAwards(eventId: string): Promise<{ awards: AdminGuestAward[]; error: unknown }> {
  const { data, error } = await measureDatabase("awards.admin_list", () => getSupabaseServerClient().from("guest_awards").select("id, message, created_at, read_at, claimed_at, delivered_at, guests!inner(id, nickname)").eq("event_id", eventId).order("created_at", { ascending: false }).limit(20));
  return { awards: (data ?? []).map((row) => ({ id: row.id, message: row.message, createdAt: row.created_at, readAt: row.read_at, claimedAt: row.claimed_at, deliveredAt: row.delivered_at, guest: row.guests as unknown as { id: string; nickname: string } })), error };
}

export async function markGuestAwardDelivered(eventId: string, awardId: string): Promise<{ found: boolean; error: unknown }> {
  const { data, error } = await measureDatabase("awards.delivered", () => getSupabaseServerClient().from("guest_awards").update({ delivered_at: new Date().toISOString() }).eq("id", awardId).eq("event_id", eventId).not("claimed_at", "is", null).is("delivered_at", null).select("id").maybeSingle());
  return { found: Boolean(data), error };
}

export async function resendGuestAward(eventId: string, awardId: string): Promise<{ found: boolean; error: unknown }> {
  const { data, error } = await measureDatabase("awards.resend", () => getSupabaseServerClient().from("guest_awards").update({ read_at: null, claimed_at: null, created_at: new Date().toISOString() }).eq("id", awardId).eq("event_id", eventId).is("delivered_at", null).select("id").maybeSingle());
  return { found: Boolean(data), error };
}
