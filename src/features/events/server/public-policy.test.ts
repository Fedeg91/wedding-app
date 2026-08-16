import { describe, expect, it } from "vitest";
import { canUploadToEvent, canViewPublicGallery, isPublicPhotoStatus } from "./public-policy";

describe("public event enforcement", () => {
  it("blocks upload when disabled", () => expect(canUploadToEvent({ uploadEnabled: false })).toBe(false));
  it("blocks public feed when gallery is disabled", () => expect(canViewPublicGallery({ publicGalleryEnabled: false })).toBe(false));
  it("exposes only published photo statuses", () => { expect(isPublicPhotoStatus("published")).toBe(true); expect(isPublicPhotoStatus("hidden")).toBe(false); expect(isPublicPhotoStatus("processing")).toBe(false); });
});
