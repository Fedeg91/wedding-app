import http from "k6/http";
import { check, sleep } from "k6";
import { baseUrl, duration, eventSlug, record, summaryTrendStats, thresholds, vus } from "./lib/config.js";

export const options = { vus, duration, thresholds, summaryTrendStats };

export default function feedScroll() {
  const event = http.get(`${baseUrl}/api/events/${eventSlug}`); record(event);
  let cursor = "";
  for (let page = 0; page < 3; page += 1) {
    const response = http.get(`${baseUrl}/api/events/${eventSlug}/photos?limit=20${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`);
    record(response);
    check(response, { "feed page succeeds": (item) => item.status === 200 });
    if (response.status !== 200) break;
    cursor = response.json("nextCursor") || "";
    if (!cursor) break;
    sleep(1 + Math.random() * 2);
  }
  sleep(1);
}
