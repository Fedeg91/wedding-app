import { findEventBySlug } from "@/features/events/server/event-repository";
import { canViewPublicGallery } from "@/features/events/server/public-policy";
import { setPhotoLike } from "@/features/photos/server/photo-like-repository";
import { apiError, databaseError, invalidInput } from "@/lib/api/errors";
import { withApiObservability } from "@/lib/observability/api";
import { readJsonBody } from "@/lib/security/request";
import { eventSlugSchema, photoLikeSchema, uuidSchema } from "@/lib/validation/api";

async function changeLike(request: Request, context: { params: Promise<{ eventSlug: string; photoId: string }> }, liked: boolean) {
  const raw = await context.params;
  const slug = eventSlugSchema.safeParse(raw.eventSlug);
  const photoId = uuidSchema.safeParse(raw.photoId);
  if (!slug.success || !photoId.success) return apiError("INVALID_INPUT", "Invalid event or photo", 400);
  const body = await readJsonBody(request, 1024); if (body.response) return body.response;
  const parsed = photoLikeSchema.safeParse(body.data); if (!parsed.success) return invalidInput(parsed.error);
  const resolved = await findEventBySlug(slug.data);
  if (resolved.error) return databaseError("resolve like event", resolved.error);
  if (!resolved.event) return apiError("EVENT_NOT_FOUND", "Event not found", 404);
  if (!canViewPublicGallery(resolved.event)) return apiError("GALLERY_DISABLED", "This gallery is not available", 403);
  const result = await setPhotoLike(resolved.event.id, photoId.data, parsed.data.guestId, liked);
  if (result.error) return databaseError(liked ? "create photo like" : "remove photo like", result.error);
  if (!result.found) return apiError("PHOTO_NOT_LIKEABLE", "Photo is not published or guest does not belong to this event", 403);
  return Response.json({ liked });
}

async function likeHandler(request: Request, context: { params: Promise<{ eventSlug: string; photoId: string }> }) { return changeLike(request, context, true); }
async function unlikeHandler(request: Request, context: { params: Promise<{ eventSlug: string; photoId: string }> }) { return changeLike(request, context, false); }
export const POST = withApiObservability("public.photos.like", likeHandler);
export const DELETE = withApiObservability("public.photos.unlike", unlikeHandler);
