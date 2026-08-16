import http from "k6/http";
import { check, sleep } from "k6";
import { baseUrl, duration, eventSlug, record, summaryTrendStats, thresholds, vus } from "./lib/config.js";

if (!__ENV.LOAD_TEST_GUEST_ID) throw new Error("LOAD_TEST_GUEST_ID is required");
export const options = { vus, duration, thresholds, summaryTrendStats };

export default function uploadSignature() {
  const response = http.post(`${baseUrl}/api/events/${eventSlug}/uploads/sign`, JSON.stringify({ guestId: __ENV.LOAD_TEST_GUEST_ID }), { headers: { "Content-Type": "application/json" } });
  record(response);
  check(response, { "valid signature returned": (item) => item.status === 200 && Boolean(item.json("signature")) && Boolean(item.json("uploadUrl")) });
  sleep(1);
}
