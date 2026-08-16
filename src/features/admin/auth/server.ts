import "server-only";

import { cookies } from "next/headers";
import { z } from "zod";
import { ADMIN_SESSION_TTL_SECONDS, createAdminSessionToken, createLoginBackoffToken, verifyAdminSessionToken, verifyLoginBackoffToken } from "./session-token";

export const ADMIN_COOKIE_NAME = "wedding_admin_session";
export const ADMIN_BACKOFF_COOKIE_NAME = "wedding_admin_login_backoff";
const adminEnvSchema = z.object({ ADMIN_PASSWORD: z.string().min(8), ADMIN_SESSION_SECRET: z.string().min(32) });

export function getAdminEnv() { return adminEnvSchema.parse({ ADMIN_PASSWORD: process.env.ADMIN_PASSWORD, ADMIN_SESSION_SECRET: process.env.ADMIN_SESSION_SECRET }); }

export async function hasAdminSession(eventSlug: string) {
  const token = (await cookies()).get(ADMIN_COOKIE_NAME)?.value;
  if (!token) return false;
  try { return verifyAdminSessionToken(token, eventSlug, getAdminEnv().ADMIN_SESSION_SECRET); } catch { return false; }
}

export async function setAdminSession(eventSlug: string) {
  const store = await cookies();
  store.set(ADMIN_COOKIE_NAME, createAdminSessionToken(eventSlug, getAdminEnv().ADMIN_SESSION_SECRET), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: ADMIN_SESSION_TTL_SECONDS });
}

export async function clearAdminSession() { (await cookies()).set(ADMIN_COOKIE_NAME, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 }); }

export async function getAdminLoginBackoff(eventSlug: string) { const token = (await cookies()).get(ADMIN_BACKOFF_COOKIE_NAME)?.value; if (!token) return null; return verifyLoginBackoffToken(token, eventSlug, getAdminEnv().ADMIN_SESSION_SECRET); }
export async function recordAdminLoginFailure(eventSlug: string) { const store = await cookies(); const currentToken = store.get(ADMIN_BACKOFF_COOKIE_NAME)?.value; const current = currentToken ? verifyLoginBackoffToken(currentToken, eventSlug, getAdminEnv().ADMIN_SESSION_SECRET) : null; const failures = (current?.failures ?? 0) + 1; const now = Math.floor(Date.now() / 1000); const delay = failures >= 3 ? Math.min(30, 2 ** (failures - 3)) : 0; const state = { eventSlug, failures, blockedUntil: now + delay, expiresAt: now + 15 * 60 }; store.set(ADMIN_BACKOFF_COOKIE_NAME, createLoginBackoffToken(state, getAdminEnv().ADMIN_SESSION_SECRET), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/api/admin/login", maxAge: 15 * 60 }); return state; }
export async function clearAdminLoginBackoff() { (await cookies()).set(ADMIN_BACKOFF_COOKIE_NAME, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/api/admin/login", maxAge: 0 }); }
