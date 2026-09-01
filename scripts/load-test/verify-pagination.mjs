const baseUrl = process.env.BASE_URL;
if (!baseUrl) throw new Error("BASE_URL is required");

async function collect(extra = "") {
  const ids = [];
  let cursor = "";
  let pages = 0;
  do {
    const response = await fetch(`${baseUrl}/api/events/load-test-event/photos?limit=50${extra}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`);
    if (!response.ok) throw new Error(`Page ${pages + 1} failed with ${response.status}`);
    const body = await response.json();
    ids.push(...body.items.flatMap((item) => item.photos.map((photo) => photo.id)));
    cursor = body.nextCursor || "";
    pages += 1;
  } while (cursor);
  if (new Set(ids).size !== ids.length) throw new Error("Duplicate photo IDs detected");
  return { pages, rows: ids.length, unique: new Set(ids).size };
}

console.log(JSON.stringify({ allNewest: await collect("&sort=newest"), allOldest: await collect("&sort=oldest"), guestFiltered: await collect("&guestId=ffbe28bc-f6b8-433e-8dcd-6813d29a3eff") }));
