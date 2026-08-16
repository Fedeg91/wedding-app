import { describe, expect, it } from "vitest";
import { buildCloudinaryImageUrl } from "./image-url";

describe("buildCloudinaryImageUrl", () => {
  it("builds an optimized feed URL without exposing the original", () => {
    expect(buildCloudinaryImageUrl("demo", "weddings/event/originals/photo", "feed")).toBe("https://res.cloudinary.com/demo/image/upload/c_limit,w_1000/f_auto,q_auto/weddings/event/originals/photo");
  });

  it("encodes public ID segments", () => {
    expect(buildCloudinaryImageUrl("my cloud", "folder/a photo", "thumbnail")).toContain("my%20cloud/image/upload/c_limit,w_400/f_auto,q_auto/folder/a%20photo");
  });
});
