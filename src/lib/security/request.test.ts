import { describe, expect, it } from "vitest";
import { readJsonBody, validateSameOrigin } from "./request";

describe("request hardening", () => {
  it("rejects oversized JSON before parsing", async () => { const request = new Request("https://app.test/api", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ value: "x".repeat(200) }) }); const result = await readJsonBody(request, 32); expect(result.response?.status).toBe(413); });
  it("rejects malformed JSON", async () => { const result = await readJsonBody(new Request("https://app.test/api", { method: "POST", body: "{" }), 100); expect(result.response?.status).toBe(400); });
  it("allows same origin and rejects cross-site or missing origins", () => { expect(validateSameOrigin(new Request("https://app.test/api", { method: "POST", headers: { origin: "https://app.test" } }))).toBeNull(); expect(validateSameOrigin(new Request("https://app.test/api", { method: "POST", headers: { origin: "https://evil.test" } }))?.status).toBe(403); expect(validateSameOrigin(new Request("https://app.test/api", { method: "POST" }))?.status).toBe(403); });
});
