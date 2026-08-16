export const MAX_CONCURRENT_UPLOADS = 3;
export type QueueStatus = "selected" | "queued" | "signing" | "uploading" | "saving" | "success" | "failed";

export function nextQueuedIds(items: Array<{ id: string; status: QueueStatus }>, maxConcurrent = MAX_CONCURRENT_UPLOADS) {
  const active = items.filter((item) => item.status === "signing" || item.status === "uploading" || item.status === "saving").length;
  return items.filter((item) => item.status === "queued").slice(0, Math.max(0, maxConcurrent - active)).map((item) => item.id);
}

export async function withBoundedRetry<T>(operation: () => Promise<T>, retries = 1, delayMs = 250): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try { return await operation(); } catch (error) { lastError = error; if (attempt < retries) await new Promise((resolve) => setTimeout(resolve, delayMs * (attempt + 1))); }
  }
  throw lastError;
}
