import { requireAdmin } from "@/features/admin/auth/guard";
import { listAdminPhotos } from "@/features/admin/server/admin-repository";
import { findEventBySlug } from "@/features/events/server/event-repository";
import { decodeCursor } from "@/features/photos/server/cursor";
import { apiError, databaseError, invalidInput } from "@/lib/api/errors";
import { adminPhotoQuerySchema, eventSlugSchema } from "@/lib/validation/api";
import { withApiObservability } from "@/lib/observability/api";

async function getAdminPhotosHandler(request: Request, { params }: { params: Promise<{ eventSlug: string }> }) {
  const slug = eventSlugSchema.safeParse((await params).eventSlug); if (!slug.success) return apiError("INVALID_INPUT", "Invalid event slug", 400);
  const unauthorized = await requireAdmin(slug.data); if (unauthorized) return unauthorized;
  const { event, error: eventError } = await findEventBySlug(slug.data); if (eventError) return databaseError("admin photo event", eventError); if (!event) return apiError("EVENT_NOT_FOUND", "Event not found", 404);
  const parsed = adminPhotoQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams)); if (!parsed.success) return invalidInput(parsed.error);
  const cursor = parsed.data.cursor ? decodeCursor(parsed.data.cursor) : undefined; if (parsed.data.cursor && !cursor) return apiError("INVALID_CURSOR", "Malformed pagination cursor", 400);
  const { page, error } = await listAdminPhotos(event.id, { limit: parsed.data.limit, status: parsed.data.status, cursor: cursor ?? undefined }); if (error || !page) return databaseError("admin list photos", error);
  return Response.json(page);
}
export const GET = withApiObservability("admin.photos.list", getAdminPhotosHandler);
