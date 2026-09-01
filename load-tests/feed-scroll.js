import http from "k6/http";
import { check, sleep } from "k6";
import { baseUrl, duration, eventSlug, record, summaryTrendStats, thresholds, vus } from "./lib/config.js";

if (!__ENV.LOAD_TEST_GUEST_ID) throw new Error("LOAD_TEST_GUEST_ID is required for a realistic liked-state feed");
export const options = { vus, duration, thresholds, summaryTrendStats };

export default function feedScroll() {
  const event = http.get(`${baseUrl}/api/events/${eventSlug}`); record(event);
  const guests = http.get(`${baseUrl}/api/events/${eventSlug}/guests`); record(guests);
  check({ event, guests }, { "event and guest list succeed": (flow) => flow.event.status === 200 && flow.guests.status === 200 });
  let cursor = "";
  for (let page = 0; page < 3; page += 1) {
    const response = http.get(`${baseUrl}/api/events/${eventSlug}/photos?limit=20&currentGuestId=${encodeURIComponent(__ENV.LOAD_TEST_GUEST_ID)}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`);
    record(response);
    check(response, { "feed page succeeds": (item) => item.status === 200 });
    if (response.status !== 200) break;
    cursor = response.json("nextCursor") || "";
    if (!cursor) break;
    sleep(1 + Math.random() * 2);
  }
  sleep(1);
}
