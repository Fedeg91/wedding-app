import { requireAdmin } from "@/features/admin/auth/guard";
import { setPhotoStatus } from "@/features/admin/server/admin-repository";
import { findEventBySlug } from "@/features/events/server/event-repository";
import { apiError, databaseError, invalidInput } from "@/lib/api/errors";
import { logServerEvent } from "@/lib/logger";
import { adminPhotoStatusSchema, eventSlugSchema, uuidSchema } from "@/lib/validation/api";
import { readJsonBody, validateSameOrigin } from "@/lib/security/request";
import { withApiObservability } from "@/lib/observability/api";

async function moderatePhotoHandler(request: Request, { params }: { params: Promise<{ eventSlug: string; photoId: string }> }) {
  const csrf = validateSameOrigin(request); if (csrf) return csrf;
  const raw = await params; const slug = eventSlugSchema.safeParse(raw.eventSlug); const photoId = uuidSchema.safeParse(raw.photoId); if (!slug.success || !photoId.success) return apiError("INVALID_INPUT", "Invalid event or photo", 400);
  const unauthorized = await requireAdmin(slug.data); if (unauthorized) return unauthorized;
  const body = await readJsonBody(request, 2 * 1024); if (body.response) return body.response;
  const parsed = adminPhotoStatusSchema.safeParse(body.data); if (!parsed.success) return invalidInput(parsed.error);
  const { event, error: eventError } = await findEventBySlug(slug.data); if (eventError) return databaseError("admin moderation event", eventError); if (!event) return apiError("EVENT_NOT_FOUND", "Event not found", 404);
  const { photo, error } = await setPhotoStatus(event.id, photoId.data, parsed.data.status); if (error) return databaseError("admin moderate photo", error); if (!photo) return apiError("INVALID_INPUT", "Photo not found", 404);
  logServerEvent(photo.status === "hidden" ? "admin_photo_hidden" : "admin_photo_restored", { eventSlug: event.slug, photoId: photo.id });
  return Response.json(photo);
}
export const PATCH = withApiObservability("admin.photos.moderate", moderatePhotoHandler);
