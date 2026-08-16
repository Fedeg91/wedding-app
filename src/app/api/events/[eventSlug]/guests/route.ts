import { apiError, databaseError, invalidInput } from "@/lib/api/errors";
import { findEventBySlug } from "@/features/events/server/event-repository";
import { createGuest, listGuests } from "@/features/guests/server/guest-repository";
import { createGuestSchema, eventSlugSchema } from "@/lib/validation/api";
import { readJsonBody } from "@/lib/security/request";
import { withApiObservability } from "@/lib/observability/api";

async function resolveEvent(rawSlug: string) {
  const slug = eventSlugSchema.safeParse(rawSlug);
  if (!slug.success) return { response: apiError("INVALID_INPUT", "Invalid event slug", 400), event: null };
  const result = await findEventBySlug(slug.data);
  if (result.error) return { response: databaseError("resolve guest event", result.error), event: null };
  if (!result.event) return { response: apiError("EVENT_NOT_FOUND", "Event not found", 404), event: null };
  return { response: null, event: result.event };
}

async function getGuestsHandler(_request: Request, { params }: { params: Promise<{ eventSlug: string }> }) {
  const resolved = await resolveEvent((await params).eventSlug);
  if (!resolved.event) return resolved.response!;
  const { guests, error } = await listGuests(resolved.event.id);
  if (error) return databaseError("list guests", error);
  return Response.json({ items: guests });
}

async function createGuestHandler(request: Request, { params }: { params: Promise<{ eventSlug: string }> }) {
  const eventSlug = (await params).eventSlug;
  const resolved = await resolveEvent(eventSlug);
  if (!resolved.event) return resolved.response!;
  const body = await readJsonBody(request, 2 * 1024); if (body.response) return body.response;
  const parsed = createGuestSchema.safeParse(body.data);
  if (!parsed.success) return invalidInput(parsed.error);
  const { guest, error } = await createGuest(resolved.event.id, parsed.data.nickname);
  if (error || !guest) return databaseError("create guest", error);
  return Response.json(guest, { status: 201 });
}
export const GET = withApiObservability("public.guests.list", getGuestsHandler);
export const POST = withApiObservability("public.guests.create", createGuestHandler);
