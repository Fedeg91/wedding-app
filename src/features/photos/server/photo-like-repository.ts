import "server-only";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { measureDatabase } from "@/lib/observability/request-context";

export async function setPhotoLike(eventId: string, photoId: string, guestId: string, liked: boolean): Promise<{ found: boolean; error: unknown }> {
  const client = getSupabaseServerClient();
  const [photo, guest] = await Promise.all([
    measureDatabase("photo_likes.validate_photo", () => client.from("photos").select("id").eq("id", photoId).eq("event_id", eventId).eq("status", "published").maybeSingle()),
    measureDatabase("photo_likes.validate_guest", () => client.from("guests").select("id").eq("id", guestId).eq("event_id", eventId).maybeSingle()),
  ]);
  const validationError = photo.error ?? guest.error;
  if (validationError) return { found: false, error: validationError };
  if (!photo.data || !guest.data) return { found: false, error: null };

  if (liked) {
    const result = await measureDatabase("photo_likes.create", () => client.from("photo_likes").upsert({ photo_id: photoId, guest_id: guestId }, { onConflict: "photo_id,guest_id", ignoreDuplicates: true }));
    return { found: true, error: result.error };
  }
  const result = await measureDatabase("photo_likes.delete", () => client.from("photo_likes").delete().eq("photo_id", photoId).eq("guest_id", guestId));
  return { found: true, error: result.error };
}
