import { clearAdminSession } from "@/features/admin/auth/server";
import { validateSameOrigin } from "@/lib/security/request";
import { withApiObservability } from "@/lib/observability/api";
async function logoutHandler(request: Request) { const csrf = validateSameOrigin(request); if (csrf) return csrf; await clearAdminSession(); return Response.json({ ok: true }); }
export const POST = withApiObservability("admin.logout", logoutHandler);
