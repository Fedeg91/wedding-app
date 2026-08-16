import "server-only";

import { apiError } from "@/lib/api/errors";
import { hasAdminSession } from "./server";

export async function requireAdmin(eventSlug: string) {
  return await hasAdminSession(eventSlug) ? null : apiError("UNAUTHORIZED", "Admin authentication required", 401);
}
