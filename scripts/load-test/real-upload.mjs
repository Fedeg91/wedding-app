import { randomUUID } from "node:crypto";
import { v2 as cloudinary } from "cloudinary";

const baseUrl = process.env.BASE_URL?.replace(/\/$/, "");
const guestId = process.env.LOAD_TEST_GUEST_ID;
if (!baseUrl || !guestId) throw new Error("BASE_URL and LOAD_TEST_GUEST_ID are required");

const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");
let publicId;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

try {
  const signatureResponse = await fetch(`${baseUrl}/api/events/load-test-event/uploads/sign`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ guestId }),
  });
  if (!signatureResponse.ok) throw new Error(`Signature failed: ${signatureResponse.status}`);
  const signed = await signatureResponse.json();
  publicId = signed.publicId;

  const form = new FormData();
  form.append("file", new Blob([png], { type: "image/png" }), "event-audit.png");
  form.append("api_key", signed.apiKey);
  form.append("timestamp", String(signed.timestamp));
  form.append("signature", signed.signature);
  form.append("public_id", signed.publicId);
  form.append("upload_preset", signed.uploadPreset);
  form.append("allowed_formats", signed.allowedFormats);
  form.append("overwrite", String(signed.overwrite));
  const uploadResponse = await fetch(signed.uploadUrl, { method: "POST", body: form });
  if (!uploadResponse.ok) throw new Error(`Cloudinary upload failed: ${uploadResponse.status} ${await uploadResponse.text()}`);
  const uploaded = await uploadResponse.json();

  const metadataResponse = await fetch(`${baseUrl}/api/events/load-test-event/photos`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      guestId,
      clientUploadId: randomUUID(),
      cloudinaryPublicId: uploaded.public_id,
      width: uploaded.width,
      height: uploaded.height,
      format: uploaded.format,
      bytes: uploaded.bytes,
      originalFilename: uploaded.original_filename,
      caption: "Event readiness integration fixture",
    }),
  });
  if (metadataResponse.status !== 201) throw new Error(`Metadata persistence failed: ${metadataResponse.status} ${await metadataResponse.text()}`);
  const photo = await metadataResponse.json();
  const feedResponse = await fetch(`${baseUrl}/api/events/load-test-event/photos?limit=20`);
  const feed = await feedResponse.json();
  if (!feedResponse.ok || !feed.items.some((item) => item.id === photo.id && item.imageUrl.includes("w_1000"))) throw new Error("Uploaded photo was not found with transformed feed delivery");
  console.log(JSON.stringify({ signature: "PASS", directCloudinaryUpload: "PASS", metadataPersistence: "PASS", transformedFeedDelivery: "PASS", width: uploaded.width, height: uploaded.height, bytes: uploaded.bytes }));
} finally {
  if (publicId) await cloudinary.uploader.destroy(publicId, { resource_type: "image", invalidate: true });
}
