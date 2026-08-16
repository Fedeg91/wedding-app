import { apiError, databaseError } from "@/lib/api/errors";
import { findEventBySlug } from "@/features/events/server/event-repository";
import { eventSlugSchema } from "@/lib/validation/api";
import { withApiObservability } from "@/lib/observability/api";

async function getEventHandler(_request: Request, { params }: { params: Promise<{ eventSlug: string }> }) {
  const parsed = eventSlugSchema.safeParse((await params).eventSlug);
  if (!parsed.success) return apiError("INVALID_INPUT", "Invalid event slug", 400);
  const { event, error } = await findEventBySlug(parsed.data);
  if (error) return databaseError("find event", error);
  if (!event) return apiError("EVENT_NOT_FOUND", "Event not found", 404);
  return Response.json(event);
}
export const GET = withApiObservability("public.event.get", getEventHandler);
