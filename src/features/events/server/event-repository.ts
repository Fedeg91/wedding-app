import "server-only";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { Event } from "@/types";
import { measureDatabase } from "@/lib/observability/request-context";

export async function findEventBySlug(slug: string): Promise<{ event: Event | null; error: unknown }> {
  const { data, error } = await measureDatabase("events.find_by_slug", () => getSupabaseServerClient().from("events").select("id, slug, title, event_date, upload_enabled, public_gallery_enabled").eq("slug", slug).maybeSingle());
  if (error) return { event: null, error };
  if (!data) return { event: null, error: null };
  return { event: { id: data.id, slug: data.slug, title: data.title, eventDate: data.event_date, uploadEnabled: data.upload_enabled, publicGalleryEnabled: data.public_gallery_enabled }, error: null };
}
