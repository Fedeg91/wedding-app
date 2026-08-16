import { requireAdmin } from "@/features/admin/auth/guard";
import { getAdminEvent, updateEventControls } from "@/features/admin/server/admin-repository";
import { findEventBySlug } from "@/features/events/server/event-repository";
import { apiError, databaseError, invalidInput } from "@/lib/api/errors";
import { logServerEvent } from "@/lib/logger";
import { adminEventUpdateSchema, eventSlugSchema } from "@/lib/validation/api";
import { readJsonBody, validateSameOrigin } from "@/lib/security/request";
import { withApiObservability } from "@/lib/observability/api";

async function resolve(rawSlug: string) {
  const slug = eventSlugSchema.safeParse(rawSlug);
  if (!slug.success) return { event: null, response: apiError("INVALID_INPUT", "Invalid event slug", 400) };
  const unauthorized = await requireAdmin(slug.data); if (unauthorized) return { event: null, response: unauthorized };
  const result = await findEventBySlug(slug.data);
  if (result.error) return { event: null, response: databaseError("admin resolve event", result.error) };
  if (!result.event) return { event: null, response: apiError("EVENT_NOT_FOUND", "Event not found", 404) };
  return { event: result.event, response: null };
}

async function getAdminEventHandler(_request: Request, { params }: { params: Promise<{ eventSlug: string }> }) { const resolved = await resolve((await params).eventSlug); if (!resolved.event) return resolved.response!; const { stats, error } = await getAdminEvent(resolved.event.id); if (error || !stats) return databaseError("admin event stats", error); return Response.json({ event: resolved.event, stats }); }

async function updateAdminEventHandler(request: Request, { params }: { params: Promise<{ eventSlug: string }> }) {
  const csrf = validateSameOrigin(request); if (csrf) return csrf;
  const resolved = await resolve((await params).eventSlug); if (!resolved.event) return resolved.response!;
  const body = await readJsonBody(request, 4 * 1024); if (body.response) return body.response;
  const parsed = adminEventUpdateSchema.safeParse(body.data); if (!parsed.success) return invalidInput(parsed.error);
  const { event, error } = await updateEventControls(resolved.event.id, parsed.data); if (error || !event) return databaseError("admin update event", error);
  if (parsed.data.uploadEnabled !== undefined) logServerEvent("admin_upload_setting_changed", { eventSlug: event.slug, enabled: parsed.data.uploadEnabled });
  if (parsed.data.publicGalleryEnabled !== undefined) logServerEvent("admin_gallery_setting_changed", { eventSlug: event.slug, enabled: parsed.data.publicGalleryEnabled });
  return Response.json(event);
}
export const GET = withApiObservability("admin.event.get", getAdminEventHandler);
export const PATCH = withApiObservability("admin.event.update", updateAdminEventHandler);
