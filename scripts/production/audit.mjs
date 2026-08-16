import { createClient } from "@supabase/supabase-js";
import { v2 as cloudinary } from "cloudinary";

const required = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET", "CLOUDINARY_UPLOAD_PRESET", "ADMIN_PASSWORD", "ADMIN_SESSION_SECRET"];
const missing = required.filter((name) => !process.env[name]);
if (missing.length) throw new Error(`Missing environment variables: ${missing.join(", ")}`);

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const { data: events, error: eventError } = await db.from("events").select("id, slug, title, event_date, upload_enabled, public_gallery_enabled").order("created_at");
if (eventError) throw eventError;
const wedding = events.find((event) => event.slug === "alessandro-anna");
if (!wedding) throw new Error("Production wedding event is missing");
const [{ count: guests, error: guestError }, { count: photos, error: photoError }, { count: mocks, error: mockError }] = await Promise.all([
  db.from("guests").select("id", { count: "exact", head: true }).eq("event_id", wedding.id),
  db.from("photos").select("id", { count: "exact", head: true }).eq("event_id", wedding.id),
  db.from("photos").select("id", { count: "exact", head: true }).eq("event_id", wedding.id).not("mock_image_url", "is", null),
]);
if (guestError || photoError || mockError) throw guestError || photoError || mockError;

cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET, secure: true });
const preset = await cloudinary.api.upload_preset(process.env.CLOUDINARY_UPLOAD_PRESET);
console.log(JSON.stringify({
  environment: { allRequiredPresent: true, publicVariables: ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"], serverOnlyVariables: required.filter((name) => !name.startsWith("NEXT_PUBLIC_")) },
  database: { eventCount: events.length, events: events.map((event) => ({ slug: event.slug, title: event.title, event_date: event.event_date, upload_enabled: event.upload_enabled, public_gallery_enabled: event.public_gallery_enabled })), weddingGuests: guests, weddingPhotos: photos, weddingMockPhotos: mocks },
  cloudinary: {
    preset: preset.name,
    unsigned: preset.unsigned,
    allowedFormats: preset.settings?.allowed_formats,
    overwrite: preset.settings?.overwrite,
    maxFileSize: preset.settings?.max_file_size,
    settingsAvailable: Object.keys(preset.settings ?? {}).sort(),
  },
}, null, 2));
