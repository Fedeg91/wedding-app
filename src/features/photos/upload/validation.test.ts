import { describe, expect, it } from "vitest";
import { MAX_BATCH_SIZE, MAX_FILE_SIZE } from "./constants";
import { validateUploadFiles } from "./validation";

function image(name: string, type = "image/jpeg", size = 10) { return new File([new Uint8Array(size)], name, { type }); }

describe("validateUploadFiles", () => {
  it("limits each batch to four photos", () => expect(MAX_BATCH_SIZE).toBe(4));
  it("accepts supported raster images", () => expect(validateUploadFiles([image("photo.jpg"), image("photo.webp", "image/webp")])).toEqual([]));
  it("rejects SVG and oversized files", () => {
    expect(validateUploadFiles([image("bad.svg", "image/svg+xml")])[0]?.message).toContain("Formato");
    const oversized = { name: "large.jpg", type: "image/jpeg", size: MAX_FILE_SIZE + 1 } as File;
    expect(validateUploadFiles([oversized])[0]?.message).toContain("20 MB");
  });
  it("rejects batches over the maximum", () => expect(validateUploadFiles(Array.from({ length: MAX_BATCH_SIZE + 1 }, (_, index) => image(`${index}.jpg`)))[0]?.message).toContain(String(MAX_BATCH_SIZE)));
});
