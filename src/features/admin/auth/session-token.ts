import { createHmac, timingSafeEqual } from "node:crypto";

export const ADMIN_SESSION_TTL_SECONDS = 8 * 60 * 60;
type SessionPayload = { eventSlug: string; expiresAt: number };
export type LoginBackoff = { eventSlug: string; failures: number; blockedUntil: number; expiresAt: number };

function signature(payload: string, secret: string) { return createHmac("sha256", secret).update(payload).digest("base64url"); }

export function createAdminSessionToken(eventSlug: string, secret: string, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({ eventSlug, expiresAt: Math.floor(now / 1000) + ADMIN_SESSION_TTL_SECONDS } satisfies SessionPayload)).toString("base64url");
  return `${payload}.${signature(payload, secret)}`;
}

export function verifyAdminSessionToken(token: string, eventSlug: string, secret: string, now = Date.now()) {
  const [payload, suppliedSignature, ...rest] = token.split(".");
  if (!payload || !suppliedSignature || rest.length) return false;
  const expected = signature(payload, secret);
  const suppliedBuffer = Buffer.from(suppliedSignature);
  const expectedBuffer = Buffer.from(expected);
  if (suppliedBuffer.length !== expectedBuffer.length || !timingSafeEqual(suppliedBuffer, expectedBuffer)) return false;
  try { const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as SessionPayload; return parsed.eventSlug === eventSlug && Number.isInteger(parsed.expiresAt) && parsed.expiresAt > Math.floor(now / 1000); } catch { return false; }
}

export function passwordMatches(candidate: string, expected: string) {
  const candidateBuffer = Buffer.from(candidate);
  const expectedBuffer = Buffer.from(expected);
  return candidateBuffer.length === expectedBuffer.length && timingSafeEqual(candidateBuffer, expectedBuffer);
}

export function createLoginBackoffToken(state: LoginBackoff, secret: string) { const payload = Buffer.from(JSON.stringify(state)).toString("base64url"); return `${payload}.${signature(payload, secret)}`; }
export function verifyLoginBackoffToken(token: string, eventSlug: string, secret: string, now = Date.now()): LoginBackoff | null { const [payload, supplied, ...rest] = token.split("."); if (!payload || !supplied || rest.length) return null; const expected = signature(payload, secret); const a = Buffer.from(supplied); const b = Buffer.from(expected); if (a.length !== b.length || !timingSafeEqual(a, b)) return null; try { const state = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as LoginBackoff; return state.eventSlug === eventSlug && state.expiresAt > Math.floor(now / 1000) ? state : null; } catch { return null; } }
