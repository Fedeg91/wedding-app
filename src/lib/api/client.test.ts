import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiClientError, fetchJson } from "./client";

afterEach(() => vi.unstubAllGlobals());

describe("fetchJson", () => {
  it("turns malformed responses into a typed friendly error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("gateway error", { status: 502 })));
    await expect(fetchJson("/api/test")).rejects.toMatchObject({ code: "INVALID_RESPONSE", status: 502 } satisfies Partial<ApiClientError>);
  });
});
