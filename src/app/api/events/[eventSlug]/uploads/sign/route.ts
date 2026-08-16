import { randomUUID } from "node:crypto";
import { apiError, databaseError, invalidInput } from "@/lib/api/errors";
import { getCloudinaryEnv } from "@/lib/cloudinary/env";
import { getCloudinaryServer } from "@/lib/cloudinary/server";
import { findEventBySlug } from "@/features/events/server/event-repository";
import { guestBelongsToEvent } from "@/features/guests/server/guest-repository";
import { ALLOWED_CLOUDINARY_FORMATS } from "@/features/photos/upload/constants";
import { eventSlugSchema, uploadSignatureSchema } from "@/lib/validation/api";
import { logServerError } from "@/lib/logger";
import { canUploadToEvent } from "@/features/events/server/public-policy";
import { readJsonBody } from "@/lib/security/request";
import { withApiObservability } from "@/lib/observability/api";

async function signUploadHandler(request: Request, { params }: { params: Promise<{ eventSlug: string }> }) {
  const slug = eventSlugSchema.safeParse((await params).eventSlug);
  if (!slug.success) return apiError("INVALID_INPUT", "Invalid event slug", 400);
  const body = await readJsonBody(request, 2 * 1024); if (body.response) return body.response;
  const parsed = uploadSignatureSchema.safeParse(body.data);
  if (!parsed.success) return invalidInput(parsed.error);

  const { event, error: eventError } = await findEventBySlug(slug.data);
  if (eventError) return databaseError("resolve upload event", eventError);
  if (!event) return apiError("EVENT_NOT_FOUND", "Event not found", 404);
  if (!canUploadToEvent(event)) return apiError("UPLOAD_DISABLED", "Uploads are disabled for this event", 403);
  const guest = await guestBelongsToEvent(event.id, parsed.data.guestId);
  if (guest.error) return databaseError("validate upload guest", guest.error);
  if (!guest.exists) return apiError("INVALID_GUEST", "Guest does not belong to this event", 403);

  try {
    const env = getCloudinaryEnv();
    const timestamp = Math.floor(Date.now() / 1000);
    const publicId = `weddings/${event.id}/originals/${randomUUID()}`;
    const allowedFormats = [...ALLOWED_CLOUDINARY_FORMATS];
    const overwrite = false as const;
    const uploadPreset = env.CLOUDINARY_UPLOAD_PRESET;
    const signature = getCloudinaryServer().utils.api_sign_request({ timestamp, public_id: publicId, upload_preset: uploadPreset, allowed_formats: allowedFormats, overwrite }, env.CLOUDINARY_API_SECRET);
    return Response.json({ cloudName: env.CLOUDINARY_CLOUD_NAME, apiKey: env.CLOUDINARY_API_KEY, timestamp, expiresAt: timestamp + 5 * 60, signature, publicId, uploadPreset, uploadUrl: `https://api.cloudinary.com/v1_1/${encodeURIComponent(env.CLOUDINARY_CLOUD_NAME)}/image/upload`, allowedFormats: allowedFormats.join(","), overwrite });
  } catch (error) {
    logServerError("upload_signature_failed", error, { eventSlug: slug.data, guestId: parsed.data.guestId });
    return apiError("CLOUDINARY_ERROR", "Unable to prepare image upload", 500);
  }
}
export const POST = withApiObservability("public.upload.sign", signUploadHandler);
