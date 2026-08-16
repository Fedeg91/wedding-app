import { describe, expect, it } from "vitest";
import { adminPhotoStatusSchema } from "../../lib/validation/api";

describe("photo moderation validation", () => {
  it("allows hide and restore transitions", () => { expect(adminPhotoStatusSchema.parse({ status: "hidden" }).status).toBe("hidden"); expect(adminPhotoStatusSchema.parse({ status: "published" }).status).toBe("published"); });
  it("rejects processing and arbitrary statuses", () => { expect(adminPhotoStatusSchema.safeParse({ status: "processing" }).success).toBe(false); expect(adminPhotoStatusSchema.safeParse({ status: "deleted" }).success).toBe(false); });
});
