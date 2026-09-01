import { requireAdmin } from "@/features/admin/auth/guard";
import { createGuestAward } from "@/features/awards/server/award-repository";
import { findEventBySlug } from "@/features/events/server/event-repository";
import { guestBelongsToEvent } from "@/features/guests/server/guest-repository";
import { apiError, databaseError, invalidInput } from "@/lib/api/errors";
import { withApiObservability } from "@/lib/observability/api";
import { readJsonBody, validateSameOrigin } from "@/lib/security/request";
import { adminAwardSchema, eventSlugSchema } from "@/lib/validation/api";

async function createAwardHandler(request: Request, { params }: { params: Promise<{ eventSlug: string }> }) {
  const csrf = validateSameOrigin(request); if (csrf) return csrf;
  const slug = eventSlugSchema.safeParse((await params).eventSlug); if (!slug.success) return apiError("INVALID_INPUT", "Invalid event slug", 400);
  const unauthorized = await requireAdmin(slug.data); if (unauthorized) return unauthorized;
  const body = await readJsonBody(request, 2 * 1024); if (body.response) return body.response;
  const parsed = adminAwardSchema.safeParse(body.data); if (!parsed.success) return invalidInput(parsed.error);
  const resolved = await findEventBySlug(slug.data); if (resolved.error) return databaseError("resolve award event", resolved.error); if (!resolved.event) return apiError("EVENT_NOT_FOUND", "Event not found", 404);
  const guest = await guestBelongsToEvent(resolved.event.id, parsed.data.guestId); if (guest.error) return databaseError("validate award guest", guest.error); if (!guest.exists) return apiError("INVALID_GUEST", "Guest does not belong to this event", 404);
  const result = await createGuestAward(resolved.event.id, parsed.data.guestId, parsed.data.message); if (result.error || !result.award) return databaseError("create award", result.error);
  return Response.json(result.award, { status: 201 });
}

export const POST = withApiObservability("admin.awards.create", createAwardHandler);
