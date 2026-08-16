import { Counter } from "k6/metrics";

export const responses429 = new Counter("responses_429");
export const responses5xx = new Counter("responses_5xx");

function target() {
  if (!__ENV.BASE_URL) throw new Error("BASE_URL is required; load tests never default to any target");
  const match = __ENV.BASE_URL.match(/^https?:\/\/([^/:\[]+|\[[^\]]+\])(?::\d+)?(?:\/|$)/i);
  if (!match) throw new Error("BASE_URL must be an absolute http(s) URL");
  const hostname = match[1].replace(/^\[|\]$/g, "").toLowerCase();
  const local = ["localhost", "127.0.0.1", "::1"].includes(hostname);
  if (!local && __ENV.ALLOW_PRODUCTION_LOAD_TEST !== "true") {
    throw new Error("Non-local targets require ALLOW_PRODUCTION_LOAD_TEST=true");
  }
  return __ENV.BASE_URL.replace(/\/$/, "");
}

export const baseUrl = target();
export const eventSlug = __ENV.EVENT_SLUG || "load-test-event";
export const vus = Number(__ENV.VUS || 20);
export const duration = __ENV.DURATION || "30s";

export function record(response) {
  if (response.status === 429) responses429.add(1);
  if (response.status >= 500) responses5xx.add(1);
}

export const thresholds = {
  http_req_failed: ["rate<0.01"],
  responses_5xx: ["count<1"],
  http_req_duration: ["p(95)<500", "p(99)<1000"],
};
export const summaryTrendStats = ["avg", "min", "med", "max", "p(90)", "p(95)", "p(99)"];
