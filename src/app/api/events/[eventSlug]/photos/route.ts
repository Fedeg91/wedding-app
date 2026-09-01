import { apiError, databaseError, invalidInput } from "@/lib/api/errors";
import { findEventBySlug } from "@/features/events/server/event-repository";
import { guestBelongsToEvent } from "@/features/guests/server/guest-repository";
import { decodeCursor } from "@/features/photos/server/cursor";
import { listPhotos } from "@/features/photos/server/photo-repository";
import { createPublishedPhoto } from "@/features/photos/server/photo-repository";
import { getCloudinaryServer } from "@/lib/cloudinary/server";
import { isEventCloudinaryAsset } from "@/features/photos/cloudinary/asset-ownership";
import { eventSlugSchema, photoFeedQuerySchema, photoMetadataSchema } from "@/lib/validation/api";
import { logServerError } from "@/lib/logger";
import { canUploadToEvent, canViewPublicGallery } from "@/features/events/server/public-policy";
import { readJsonBody } from "@/lib/security/request";
import { withApiObservability } from "@/lib/observability/api";

async function getPhotosHandler(request: Request, { params }: { params: Promise<{ eventSlug: string }> }) {
  const slug = eventSlugSchema.safeParse((await params).eventSlug);
  if (!slug.success) return apiError("INVALID_INPUT", "Invalid event slug", 400);
  const { event, error: eventError } = await findEventBySlug(slug.data);
  if (eventError) return databaseError("resolve photo event", eventError);
  if (!event) return apiError("EVENT_NOT_FOUND", "Event not found", 404);
  if (!canViewPublicGallery(event)) return apiError("GALLERY_DISABLED", "This gallery is not available", 403);

  const url = new URL(request.url);
  const parsed = photoFeedQuerySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) return invalidInput(parsed.error);
  const cursor = parsed.data.cursor ? decodeCursor(parsed.data.cursor) : undefined;
  if (parsed.data.cursor && !cursor) return apiError("INVALID_CURSOR", "Malformed pagination cursor", 400);

  if (parsed.data.guestId) {
    const guest = await guestBelongsToEvent(event.id, parsed.data.guestId);
    if (guest.error) return databaseError("validate photo guest", guest.error);
    if (!guest.exists) return apiError("INVALID_GUEST", "Guest does not belong to this event", 400);
  }
  if (parsed.data.currentGuestId) {
    const guest = await guestBelongsToEvent(event.id, parsed.data.currentGuestId);
    if (guest.error) return databaseError("validate current photo guest", guest.error);
    if (!guest.exists) return apiError("INVALID_GUEST", "Guest does not belong to this event", 400);
  }

  const { page, error } = await listPhotos(event.id, { limit: parsed.data.limit, guestId: parsed.data.guestId, currentGuestId: parsed.data.currentGuestId, sort: parsed.data.sort, cursor: cursor ?? undefined });
  if (error || !page) return databaseError("list photos", error);
  return Response.json(page);
}

async function createPhotoHandler(request: Request, { params }: { params: Promise<{ eventSlug: string }> }) {
  const slug = eventSlugSchema.safeParse((await params).eventSlug);
  if (!slug.success) return apiError("INVALID_INPUT", "Invalid event slug", 400);
  const body = await readJsonBody(request, 8 * 1024); if (body.response) return body.response;
  const parsed = photoMetadataSchema.safeParse(body.data);
  if (!parsed.success) return invalidInput(parsed.error);
  const { event, error: eventError } = await findEventBySlug(slug.data);
  if (eventError) return databaseError("resolve metadata event", eventError);
  if (!event) return apiError("EVENT_NOT_FOUND", "Event not found", 404);
  if (!canUploadToEvent(event)) return apiError("UPLOAD_DISABLED", "Uploads are disabled for this event", 403);
  const guest = await guestBelongsToEvent(event.id, parsed.data.guestId);
  if (guest.error) return databaseError("validate metadata guest", guest.error);
  if (!guest.exists) return apiError("INVALID_GUEST", "Guest does not belong to this event", 403);
  if (!isEventCloudinaryAsset(event.id, parsed.data.cloudinaryPublicId)) return apiError("INVALID_CLOUDINARY_ASSET", "Image does not belong to this event", 400);

  try {
    const asset = await getCloudinaryServer().api.resource(parsed.data.cloudinaryPublicId, { resource_type: "image", type: "upload" });
    const matches = asset.resource_type === "image" && asset.public_id === parsed.data.cloudinaryPublicId && asset.width === parsed.data.width && asset.height === parsed.data.height && asset.bytes === parsed.data.bytes && asset.format === parsed.data.format;
    if (!matches) return apiError("INVALID_CLOUDINARY_ASSET", "Image metadata could not be verified", 400);
  } catch (error) {
    logServerError("cloudinary_asset_verification_failed", error, { eventSlug: slug.data, guestId: parsed.data.guestId });
    return apiError("INVALID_CLOUDINARY_ASSET", "Uploaded image could not be verified", 400);
  }

  const { item, error } = await createPublishedPhoto({ eventId: event.id, guestId: parsed.data.guestId, clientUploadId: parsed.data.clientUploadId, cloudinaryPublicId: parsed.data.cloudinaryPublicId, width: parsed.data.width, height: parsed.data.height, caption: parsed.data.caption?.trim() || null, format: parsed.data.format, bytes: parsed.data.bytes, originalFilename: parsed.data.originalFilename?.trim() || null });
  if (error || !item) { logServerError("photo_metadata_persistence_failed", error, { eventSlug: slug.data, guestId: parsed.data.guestId, clientUploadId: parsed.data.clientUploadId }); return databaseError("persist uploaded photo", error); }
  return Response.json(item, { status: 201 });
}
export const GET = withApiObservability("public.photos.feed", getPhotosHandler);
export const POST = withApiObservability("public.photos.create", createPhotoHandler);
