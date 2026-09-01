import { client, EVENT_ID, EVENT_SLUG, idFor } from "./shared.mjs";

const db = client();
const fail = (label, error) => { if (error) throw new Error(`${label}: ${error.message}`); };
fail("event", (await db.from("events").upsert({ id: EVENT_ID, slug: EVENT_SLUG, title: "Load Test Event", upload_enabled: true, public_gallery_enabled: true })).error);
const guests = Array.from({ length: 20 }, (_, index) => ({ id: idFor("guest", index), event_id: EVENT_ID, nickname: `Load Guest ${String(index + 1).padStart(2, "0")}` }));
fail("guests", (await db.from("guests").upsert(guests)).error);
for (let offset = 0; offset < 3000; offset += 500) {
  const photos = Array.from({ length: 500 }, (_, item) => {
    const index = offset + item;
    const grouped = index < 4;
    const createdAt = new Date(Date.UTC(2026, 5, 1, 12, 0, grouped ? 2000 : Math.floor(index / 3))).toISOString();
    return { id: idFor("photo", index), event_id: EVENT_ID, guest_id: guests[grouped ? 0 : index % guests.length].id, mock_image_url: `https://picsum.photos/seed/load-${index}/1200/900`, caption: grouped ? "Synthetic four-photo carousel" : `Synthetic load photo ${index + 1}`, status: "published", created_at: createdAt, ...(grouped ? { upload_group_id: idFor("group", 0), upload_group_created_at: createdAt, upload_group_position: index } : {}) };
  });
  fail(`photos ${offset}`, (await db.from("photos").upsert(photos)).error);
}
console.log(JSON.stringify({ eventSlug: EVENT_SLUG, eventId: EVENT_ID, guestId: guests[0].id, photos: 3000 }));
