import { describe, expect, it, vi } from "vitest";
import { nextQueuedIds, withBoundedRetry } from "./queue";

describe("upload queue", () => {
  it("never schedules more than three active uploads", () => {
    const items = [
      { id: "active", status: "uploading" as const },
      { id: "1", status: "queued" as const }, { id: "2", status: "queued" as const }, { id: "3", status: "queued" as const },
    ];
    expect(nextQueuedIds(items)).toEqual(["1", "2"]);
  });

  it("does not reschedule active or completed items", () => {
    expect(nextQueuedIds([{ id: "a", status: "success" }, { id: "b", status: "failed" }, { id: "c", status: "queued" }])).toEqual(["c"]);
  });

  it("retries only within the configured bound", async () => {
    vi.useFakeTimers();
    const operation = vi.fn().mockRejectedValueOnce(new Error("network")).mockResolvedValue("ok");
    const resultPromise = withBoundedRetry(operation, 1, 10);
    await vi.runAllTimersAsync();
    await expect(resultPromise).resolves.toBe("ok");
    expect(operation).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });
});
