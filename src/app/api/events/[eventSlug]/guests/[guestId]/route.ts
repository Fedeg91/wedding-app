import { apiError, databaseError, invalidInput } from "@/lib/api/errors";
import { findEventBySlug } from "@/features/events/server/event-repository";
import { updateGuest } from "@/features/guests/server/guest-repository";
import { eventSlugSchema, updateGuestSchema, uuidSchema } from "@/lib/validation/api";
import { withApiObservability } from "@/lib/observability/api";

async function updateGuestHandler(request: Request, { params }: { params: Promise<{ eventSlug: string; guestId: string }> }) {
  const raw = await params;
  const slug = eventSlugSchema.safeParse(raw.eventSlug);
  const guestId = uuidSchema.safeParse(raw.guestId);
  if (!slug.success || !guestId.success) return apiError("INVALID_INPUT", "Invalid event or guest", 400);
  let body: unknown;
  try { body = await request.json(); } catch { return apiError("INVALID_INPUT", "Request body must be valid JSON", 400); }
  const parsed = updateGuestSchema.safeParse(body);
  if (!parsed.success) return invalidInput(parsed.error);
  const { event, error: eventError } = await findEventBySlug(slug.data);
  if (eventError) return databaseError("resolve nickname event", eventError);
  if (!event) return apiError("EVENT_NOT_FOUND", "Event not found", 404);
  const { guest, error } = await updateGuest(event.id, guestId.data, parsed.data.nickname, parsed.data.avatarKey);
  if (error) return databaseError("update guest nickname", error);
  if (!guest) return apiError("INVALID_GUEST", "Guest does not belong to this event", 404);
  return Response.json(guest);
}
export const PATCH = withApiObservability("public.guests.update", updateGuestHandler);
