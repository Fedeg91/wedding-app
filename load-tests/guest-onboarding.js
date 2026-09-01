import http from "k6/http";
import { check, sleep } from "k6";
import { baseUrl, eventSlug, record, summaryTrendStats, thresholds, vus } from "./lib/config.js";

export const options = { vus, iterations: vus, thresholds, summaryTrendStats };
const headers = { "Content-Type": "application/json" };

export default function guestOnboarding() {
  const event = http.get(`${baseUrl}/api/events/${eventSlug}`); record(event);
  const nickname = `Load-${__VU}-${__ITER}-${Date.now()}`;
  const guest = http.post(`${baseUrl}/api/events/${eventSlug}/guests`, JSON.stringify({ nickname }), { headers }); record(guest);
  const feed = http.get(`${baseUrl}/api/events/${eventSlug}/photos?limit=20`); record(feed);
  check({ event, guest, feed }, { "onboarding succeeds": (flow) => flow.event.status === 200 && flow.guest.status === 201 && flow.feed.status === 200 });
  sleep(2);
}
