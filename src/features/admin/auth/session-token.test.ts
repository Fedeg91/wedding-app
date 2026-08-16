import { describe, expect, it } from "vitest";
import { ADMIN_SESSION_TTL_SECONDS, createAdminSessionToken, createLoginBackoffToken, passwordMatches, verifyAdminSessionToken, verifyLoginBackoffToken } from "./session-token";

const secret = "a-secure-test-secret-that-is-long-enough";
describe("admin session", () => {
  it("accepts a valid event-bound session", () => { const token = createAdminSessionToken("alessandro-anna", secret, 1_000_000); expect(verifyAdminSessionToken(token, "alessandro-anna", secret, 1_000_001)).toBe(true); });
  it("rejects another event, tampering, and expiration", () => { const now = 1_000_000; const token = createAdminSessionToken("alessandro-anna", secret, now); expect(verifyAdminSessionToken(token, "other-event", secret, now)).toBe(false); expect(verifyAdminSessionToken(`${token}x`, "alessandro-anna", secret, now)).toBe(false); expect(verifyAdminSessionToken(token, "alessandro-anna", secret, now + (ADMIN_SESSION_TTL_SECONDS + 1) * 1000)).toBe(false); });
  it("validates login passwords without exposing them", () => { expect(passwordMatches("correct-password", "correct-password")).toBe(true); expect(passwordMatches("wrong", "correct-password")).toBe(false); });
  it("signs browser-local login backoff state", () => { const state = { eventSlug: "alessandro-anna", failures: 3, blockedUntil: 120, expiresAt: 900 }; const token = createLoginBackoffToken(state, secret); expect(verifyLoginBackoffToken(token, "alessandro-anna", secret, 100_000)).toEqual(state); expect(verifyLoginBackoffToken(token, "other-event", secret, 100_000)).toBeNull(); });
});
