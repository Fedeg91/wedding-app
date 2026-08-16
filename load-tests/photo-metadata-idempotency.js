import http from "k6/http";
import { check } from "k6";
import { baseUrl, eventSlug, record, summaryTrendStats, thresholds, vus } from "./lib/config.js";

if (!__ENV.PHOTO_METADATA_JSON) throw new Error("PHOTO_METADATA_JSON is required and must describe a dedicated Cloudinary test asset");
const metadata = JSON.parse(__ENV.PHOTO_METADATA_JSON);
export const options = { vus, iterations: vus, thresholds, summaryTrendStats };

export default function photoMetadataIdempotency() {
  const response = http.post(`${baseUrl}/api/events/${eventSlug}/photos`, JSON.stringify(metadata), { headers: { "Content-Type": "application/json" } });
  record(response);
  check(response, { "idempotent metadata succeeds": (item) => item.status === 200 || item.status === 201 });
}
