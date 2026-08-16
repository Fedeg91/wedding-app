import "server-only";

import { AsyncLocalStorage } from "node:async_hooks";
import { logServerEvent } from "@/lib/logger";

type RequestContext = { requestId: string; route: string; method: string; eventSlug?: string };

const requestContext = new AsyncLocalStorage<RequestContext>();

export function runWithRequestContext<T>(context: RequestContext, operation: () => T): T {
  return requestContext.run(context, operation);
}

export async function measureDatabase<T>(operation: string, query: () => PromiseLike<T>): Promise<T> {
  const started = performance.now();
  try {
    return await query();
  } finally {
    const context = requestContext.getStore();
    logServerEvent("database_query", {
      ...context,
      operation,
      dbDurationMs: Math.round((performance.now() - started) * 10) / 10,
    });
  }
}
