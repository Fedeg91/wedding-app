import http from "k6/http";
import { check, sleep } from "k6";
import { baseUrl, eventSlug, record, summaryTrendStats, thresholds, vus } from "./lib/config.js";

export const options = {
  scenarios: {
    qr_arrivals: {
      executor: "constant-arrival-rate",
      rate: vus,
      timeUnit: "15s",
      duration: "15s",
      preAllocatedVUs: vus,
      maxVUs: vus,
    },
  },
  thresholds,
  summaryTrendStats,
};

export default function qrBurst() {
  const urls = [
    `${baseUrl}/api/events/${eventSlug}`,
    `${baseUrl}/api/events/${eventSlug}/photos?limit=20`,
    `${baseUrl}/api/events/${eventSlug}/guests`,
  ];
  const responses = http.batch(urls.map((url) => ["GET", url]));
  responses.forEach(record);
  check(responses, { "QR flow returns 2xx": (items) => items.every((item) => item.status >= 200 && item.status < 300) });
  sleep(1);
}
