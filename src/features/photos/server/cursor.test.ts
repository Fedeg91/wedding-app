import { describe, expect, it } from "vitest";
import { decodeCursor, encodeCursor } from "./cursor";

describe("photo cursor", () => {
  it("accepts PostgreSQL timestamps with a UTC offset", () => {
    const cursor = { createdAt: "2026-06-01T12:16:33+00:00", id: "b6762c71-4b82-4ba2-82ff-da1dee041da8" };
    expect(decodeCursor(encodeCursor(cursor))).toEqual(cursor);
  });
  it("round trips timestamp and stable ID", () => {
    const cursor = { createdAt: "2026-08-16T12:00:00.000Z", id: "30000000-0000-4000-8000-000000000001" };
    expect(decodeCursor(encodeCursor(cursor))).toEqual(cursor);
  });
  it("rejects malformed cursors", () => expect(decodeCursor("not-a-cursor")).toBeNull());
});
