import "server-only";

import { randomUUID } from "node:crypto";
import { apiError } from "@/lib/api/errors";
import { logServerError, logServerEvent } from "@/lib/logger";
import { runWithRequestContext } from "./request-context";

type RouteContext = { params?: Promise<Record<string, string>> };
type Handler<TContext extends RouteContext> = (request: Request, context: TContext) => Promise<Response>;

export function withApiObservability<TContext extends RouteContext>(route: string, handler: Handler<TContext>) {
  return async (request: Request, context: TContext) => {
    const started = performance.now();
    const incomingId = request.headers.get("x-request-id");
    const requestId = incomingId && /^[a-zA-Z0-9_-]{8,80}$/.test(incomingId) ? incomingId : randomUUID();
    let response: Response;
    const params = context.params ? await context.params : undefined;
    try {
      response = await runWithRequestContext(
        { requestId, route, method: request.method, eventSlug: params?.eventSlug },
        () => handler(request, context),
      );
    }
    catch (error) { logServerError("unhandled_api_error", error, { requestId, route, method: request.method }); response = apiError("INTERNAL_ERROR", "Unable to complete the request", 500); }
    const durationMs = Math.round((performance.now() - started) * 10) / 10;
    response.headers.set("x-request-id", requestId);
    response.headers.set("Server-Timing", `app;dur=${durationMs}`);
    logServerEvent("api_request", { requestId, route, method: request.method, eventSlug: params?.eventSlug, status: response.status, durationMs, errorCategory: response.status >= 500 ? "server" : response.status >= 400 ? "client" : undefined });
    return response;
  };
}
