import { client, EVENT_ID } from "./shared.mjs";

const db = client();
const currentGuestId = "ffbe28bc-f6b8-433e-8dcd-6813d29a3eff";

async function collect(sortOrder, targetGuestId = null) {
  const ids = [];
  let cursorCreatedAt = null;
  let cursorId = null;
  let pages = 0;
  do {
    const { data, error } = await db.rpc("list_public_photos_with_likes", {
      target_event_id: EVENT_ID,
      target_guest_id: targetGuestId,
      target_current_guest_id: currentGuestId,
      sort_order: sortOrder,
      page_limit: 51,
      cursor_created_at: cursorCreatedAt,
      cursor_id: cursorId,
    });
    if (error) throw error;
    const visible = data.slice(0, 50);
    ids.push(...visible.map((row) => row.id));
    const last = visible.at(-1);
    cursorCreatedAt = data.length > 50 && last ? last.created_at : null;
    cursorId = data.length > 50 && last ? last.id : null;
    pages += 1;
  } while (cursorId);
  if (new Set(ids).size !== ids.length) throw new Error(`${sortOrder}: duplicate IDs`);
  return { pages, rows: ids.length, unique: new Set(ids).size };
}

console.log(JSON.stringify({
  newest: await collect("newest"),
  oldest: await collect("oldest"),
  guest: await collect("newest", currentGuestId),
}));
