import http from "k6/http";
import { check } from "k6";
import { baseUrl, eventSlug, record, summaryTrendStats, thresholds, vus } from "./lib/config.js";

const headers = { "Content-Type": "application/json" };

export const options = { vus, iterations: vus, thresholds, summaryTrendStats };

export function setup() {
  const feed = http.get(`${baseUrl}/api/events/${eventSlug}/photos?limit=1`);
  if (feed.status !== 200 || !feed.json("items.0.id")) throw new Error("A published test photo is required");
  const guests = [];
  for (let index = 0; index < vus; index += 1) {
    const response = http.post(`${baseUrl}/api/events/${eventSlug}/guests`, JSON.stringify({ nickname: `Like-${Date.now()}-${index}` }), { headers });
    if (response.status !== 201) throw new Error(`Guest setup failed with ${response.status}`);
    guests.push(response.json("id"));
  }
  return { photoId: feed.json("items.0.id"), guests };
}

export default function likeConcurrently(data) {
  const guestId = data.guests[__VU - 1];
  const response = http.post(`${baseUrl}/api/events/${eventSlug}/photos/${data.photoId}/like`, JSON.stringify({ guestId }), { headers });
  record(response);
  check(response, { "like succeeds": (item) => item.status === 200 && item.json("liked") === true });
}
