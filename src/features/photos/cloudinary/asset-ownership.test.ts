import { describe, expect, it } from "vitest";
import { isEventCloudinaryAsset } from "./asset-ownership";

describe("isEventCloudinaryAsset", () => {
  const id = "10000000-0000-4000-8000-000000000001";
  it("accepts a server-generated event asset", () => expect(isEventCloudinaryAsset(id, `weddings/${id}/originals/8a759706-2937-46e4-9b3a-94aaf6471683`)).toBe(true));
  it("rejects another event and arbitrary suffixes", () => {
    expect(isEventCloudinaryAsset(id, "weddings/other/originals/8a759706-2937-46e4-9b3a-94aaf6471683")).toBe(false);
    expect(isEventCloudinaryAsset(id, `weddings/${id}/originals/my-file`)).toBe(false);
  });
});
