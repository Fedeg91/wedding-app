import { describe, expect, it } from "vitest";
import { nicknameSchema, photoMetadataSchema } from "./api";

const valid = { guestId: "20000000-0000-4000-8000-000000000001", clientUploadId: "40000000-0000-4000-8000-000000000001", cloudinaryPublicId: "weddings/event/originals/id", width: 1200, height: 1600, caption: " Una foto ", format: "jpg", bytes: 500_000, originalFilename: "photo.jpg" };

describe("photoMetadataSchema", () => {
  it("accepts valid metadata", () => expect(photoMetadataSchema.safeParse(valid).success).toBe(true));
  it("rejects invalid formats, sizes, UUIDs, and long captions", () => {
    expect(photoMetadataSchema.safeParse({ ...valid, format: "svg" }).success).toBe(false);
    expect(photoMetadataSchema.safeParse({ ...valid, bytes: 21 * 1024 * 1024 }).success).toBe(false);
    expect(photoMetadataSchema.safeParse({ ...valid, guestId: "not-a-uuid" }).success).toBe(false);
    expect(photoMetadataSchema.safeParse({ ...valid, caption: "x".repeat(301) }).success).toBe(false);
    expect(photoMetadataSchema.safeParse({ ...valid, caption: "<script>alert(1)</script>" }).success).toBe(false);
    expect(photoMetadataSchema.safeParse({ ...valid, unexpected: true }).success).toBe(false);
  });
});

describe("nicknameSchema", () => {
  it("trims a valid nickname and rejects empty or oversized values", () => {
    expect(nicknameSchema.parse("  Anna  ")).toBe("Anna");
    expect(nicknameSchema.safeParse("   ").success).toBe(false);
    expect(nicknameSchema.safeParse("x".repeat(41)).success).toBe(false);
    expect(nicknameSchema.safeParse("<svg onload=alert(1)>").success).toBe(false);
  });
});
