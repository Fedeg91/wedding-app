import { getUnreadGuestAward, markGuestAwardRead } from "@/features/awards/server/award-repository";
import { findEventBySlug } from "@/features/events/server/event-repository";
import { guestBelongsToEvent } from "@/features/guests/server/guest-repository";
import { apiError, databaseError, invalidInput } from "@/lib/api/errors";
import { withApiObservability } from "@/lib/observability/api";
import { readJsonBody, validateSameOrigin } from "@/lib/security/request";
import { awardReadSchema, eventSlugSchema, uuidSchema } from "@/lib/validation/api";

async function resolve(raw: { eventSlug: string; guestId: string }) {
  const slug = eventSlugSchema.safeParse(raw.eventSlug); const guestId = uuidSchema.safeParse(raw.guestId);
  if (!slug.success || !guestId.success) return { response: apiError("INVALID_INPUT", "Invalid event or guest", 400), eventId: null, guestId: null };
  const event = await findEventBySlug(slug.data); if (event.error) return { response: databaseError("resolve award event", event.error), eventId: null, guestId: null }; if (!event.event) return { response: apiError("EVENT_NOT_FOUND", "Event not found", 404), eventId: null, guestId: null };
  const guest = await guestBelongsToEvent(event.event.id, guestId.data); if (guest.error) return { response: databaseError("validate award guest", guest.error), eventId: null, guestId: null }; if (!guest.exists) return { response: apiError("INVALID_GUEST", "Guest does not belong to this event", 404), eventId: null, guestId: null };
  return { response: null, eventId: event.event.id, guestId: guestId.data };
}

async function getAwardHandler(_request: Request, { params }: { params: Promise<{ eventSlug: string; guestId: string }> }) {
  const resolved = await resolve(await params); if (!resolved.eventId || !resolved.guestId) return resolved.response!;
  const result = await getUnreadGuestAward(resolved.eventId, resolved.guestId); if (result.error) return databaseError("get guest award", result.error);
  return Response.json({ award: result.award });
}

async function readAwardHandler(request: Request, { params }: { params: Promise<{ eventSlug: string; guestId: string }> }) {
  const csrf = validateSameOrigin(request); if (csrf) return csrf;
  const resolved = await resolve(await params); if (!resolved.eventId || !resolved.guestId) return resolved.response!;
  const body = await readJsonBody(request, 1024); if (body.response) return body.response;
  const parsed = awardReadSchema.safeParse(body.data); if (!parsed.success) return invalidInput(parsed.error);
  const result = await markGuestAwardRead(resolved.eventId, resolved.guestId, parsed.data.awardId); if (result.error) return databaseError("read guest award", result.error);
  return Response.json({ read: result.found });
}

export const GET = withApiObservability("public.awards.get", getAwardHandler);
export const PATCH = withApiObservability("public.awards.read", readAwardHandler);
