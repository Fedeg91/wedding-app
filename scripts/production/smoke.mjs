const baseUrl = process.env.BASE_URL;
const password = process.env.ADMIN_PASSWORD;
if (!baseUrl || !password) throw new Error("BASE_URL and ADMIN_PASSWORD are required");
const origin = new URL(baseUrl).origin;
const request = (path, init = {}) => fetch(`${origin}${path}`, { ...init, headers: { Origin: origin, ...(init.headers ?? {}) } });
const expectStatus = async (response, expected, label) => {
  if (response.status !== expected) throw new Error(`${label}: expected ${expected}, received ${response.status}`);
  return response;
};

const event = await expectStatus(await request("/api/events/alessandro-anna"), 200, "public event");
const initialEvent = await event.json();
await expectStatus(await request("/api/events/does-not-exist"), 404, "missing event");
await expectStatus(await request("/api/admin/events/alessandro-anna"), 401, "admin guard");

const login = await expectStatus(await request("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventSlug: "alessandro-anna", password }) }), 200, "admin login");
const setCookie = login.headers.get("set-cookie");
const cookie = setCookie?.split(";", 1)[0];
if (!cookie) throw new Error("Admin login did not set a session cookie");
if (!/HttpOnly/i.test(setCookie) || !/Secure/i.test(setCookie) || !/SameSite=Lax/i.test(setCookie)) throw new Error("Production admin cookie flags are incomplete");
const adminHeaders = { Cookie: cookie, "Content-Type": "application/json" };

try {
  await expectStatus(await request("/api/admin/events/alessandro-anna", { headers: adminHeaders }), 200, "admin event");
  await expectStatus(await request("/api/admin/events/alessandro-anna", { method: "PATCH", headers: adminHeaders, body: JSON.stringify({ uploadEnabled: false }) }), 200, "disable uploads");
  const guests = await (await request("/api/events/alessandro-anna/guests")).json();
  if (guests.items?.[0]) {
    await expectStatus(await request("/api/events/alessandro-anna/uploads/sign", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ guestId: guests.items[0].id }) }), 403, "disabled signature");
  }
  await expectStatus(await request("/api/admin/events/alessandro-anna", { method: "PATCH", headers: adminHeaders, body: JSON.stringify({ uploadEnabled: initialEvent.uploadEnabled }) }), 200, "restore uploads");
  if (guests.items?.[0] && initialEvent.uploadEnabled) {
    const signature = await expectStatus(await request("/api/events/alessandro-anna/uploads/sign", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ guestId: guests.items[0].id }) }), 200, "signed upload");
    const signed = await signature.json();
    if (!signed.signature || !signed.publicId?.startsWith(`weddings/${initialEvent.id}/originals/`) || !signed.uploadUrl?.startsWith("https://api.cloudinary.com/")) throw new Error("Signed upload parameters are invalid");
  }

  await expectStatus(await request("/api/admin/events/alessandro-anna", { method: "PATCH", headers: adminHeaders, body: JSON.stringify({ publicGalleryEnabled: false }) }), 200, "disable gallery");
  await expectStatus(await request("/api/events/alessandro-anna/photos?limit=20"), 403, "disabled public feed");
  await expectStatus(await request("/api/admin/events/alessandro-anna", { method: "PATCH", headers: adminHeaders, body: JSON.stringify({ publicGalleryEnabled: initialEvent.publicGalleryEnabled }) }), 200, "restore gallery");
} finally {
  await request("/api/admin/events/alessandro-anna", { method: "PATCH", headers: adminHeaders, body: JSON.stringify({ uploadEnabled: initialEvent.uploadEnabled, publicGalleryEnabled: initialEvent.publicGalleryEnabled }) });
}

await expectStatus(await request("/api/admin/logout", { method: "POST", headers: { Cookie: cookie } }), 200, "admin logout");
console.log(JSON.stringify({ publicEvent: "PASS", missingEvent: "PASS", adminGuard: "PASS", secureAdminCookie: "PASS", adminLoginLogout: "PASS", signedUploadParameters: "PASS", uploadsDisabledEnforced: "PASS", galleryDisabledEnforced: "PASS", controlsRestored: "PASS" }));
