import { apiError, invalidInput } from "@/lib/api/errors";
import { findEventBySlug } from "@/features/events/server/event-repository";
import { clearAdminLoginBackoff, getAdminEnv, getAdminLoginBackoff, recordAdminLoginFailure, setAdminSession } from "@/features/admin/auth/server";
import { passwordMatches } from "@/features/admin/auth/session-token";
import { adminLoginSchema } from "@/lib/validation/api";
import { logServerError } from "@/lib/logger";
import { readJsonBody, validateSameOrigin } from "@/lib/security/request";
import { withApiObservability } from "@/lib/observability/api";

async function loginHandler(request: Request) {
  const csrf = validateSameOrigin(request); if (csrf) return csrf;
  const body = await readJsonBody(request, 4 * 1024); if (body.response) return body.response;
  const parsed = adminLoginSchema.safeParse(body.data);
  if (!parsed.success) return invalidInput(parsed.error);
  const backoff = await getAdminLoginBackoff(parsed.data.eventSlug); const now = Math.floor(Date.now() / 1000); if (backoff && backoff.blockedUntil > now) return apiError("UNAUTHORIZED", "Please wait before trying again", 429);
  const { event, error } = await findEventBySlug(parsed.data.eventSlug);
  if (error || !event) { await recordAdminLoginFailure(parsed.data.eventSlug); logServerError("admin_login_failed", error ?? new Error("Event not found"), { eventSlug: parsed.data.eventSlug, reason: "invalid_credentials" }); return apiError("UNAUTHORIZED", "Invalid credentials", 401); }
  let valid = false;
  try { valid = passwordMatches(parsed.data.password, getAdminEnv().ADMIN_PASSWORD); } catch (error) { logServerError("admin_auth_configuration_error", error, { eventSlug: parsed.data.eventSlug }); return apiError("INTERNAL_ERROR", "Admin authentication is not configured", 500); }
  if (!valid) { await recordAdminLoginFailure(parsed.data.eventSlug); logServerError("admin_login_failed", new Error("Invalid password"), { eventSlug: parsed.data.eventSlug, reason: "invalid_credentials" }); return apiError("UNAUTHORIZED", "Invalid credentials", 401); }
  await setAdminSession(event.slug);
  await clearAdminLoginBackoff();
  return Response.json({ ok: true });
}
export const POST = withApiObservability("admin.login", loginHandler);
