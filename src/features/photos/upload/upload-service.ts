import { fetchJson } from "@/lib/api/client";
import type { PhotoFeedItem } from "@/types";
import type { CloudinaryUploadResult, UploadSignature } from "../cloudinary/types";
import { withBoundedRetry } from "./queue";

const API_TIMEOUT_MS = 15_000;

function timeoutSignal() { return AbortSignal.timeout(API_TIMEOUT_MS); }

export function requestUploadSignature(eventSlug: string, guestId: string) {
  return withBoundedRetry(() => fetchJson<UploadSignature>(`/api/events/${encodeURIComponent(eventSlug)}/uploads/sign`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ guestId }), signal: timeoutSignal() }), 1);
}

export function uploadDirectToCloudinary(file: File, signed: UploadSignature, onProgress: (progress: number) => void): Promise<CloudinaryUploadResult> {
  return new Promise((resolve, reject) => {
    if (Math.floor(Date.now() / 1000) >= signed.expiresAt) { reject(new Error("La firma di upload è scaduta. Riprova.")); return; }
    const request = new XMLHttpRequest();
    request.open("POST", signed.uploadUrl);
    request.timeout = 120_000;
    request.upload.addEventListener("progress", (event) => { if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100)); });
    request.addEventListener("load", () => {
      let body: unknown;
      try { body = JSON.parse(request.responseText); } catch { reject(new Error("Cloudinary ha restituito una risposta non valida.")); return; }
      if (request.status < 200 || request.status >= 300) { const message = typeof body === "object" && body && "error" in body ? String((body as { error?: { message?: string } }).error?.message ?? "Upload Cloudinary non riuscito.") : "Upload Cloudinary non riuscito."; reject(new Error(message)); return; }
      const result = body as CloudinaryUploadResult;
      if (result.resource_type !== "image" || !result.public_id || !result.width || !result.height || !result.format || !result.bytes) { reject(new Error("Risultato Cloudinary incompleto.")); return; }
      onProgress(100);
      resolve(result);
    });
    request.addEventListener("error", () => reject(new Error("Connessione interrotta durante l’upload.")));
    request.addEventListener("timeout", () => reject(new Error("Cloudinary non ha risposto in tempo. Riprova.")));
    request.addEventListener("abort", () => reject(new Error("Upload annullato.")));
    const form = new FormData();
    form.append("file", file);
    form.append("api_key", signed.apiKey);
    form.append("timestamp", String(signed.timestamp));
    form.append("signature", signed.signature);
    form.append("public_id", signed.publicId);
    form.append("upload_preset", signed.uploadPreset);
    form.append("allowed_formats", signed.allowedFormats);
    form.append("overwrite", String(signed.overwrite));
    request.send(form);
  });
}

export function persistUploadedPhoto(eventSlug: string, guestId: string, clientUploadId: string, result: CloudinaryUploadResult, caption: string) {
  return withBoundedRetry(() => fetchJson<PhotoFeedItem>(`/api/events/${encodeURIComponent(eventSlug)}/photos`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ guestId, clientUploadId, cloudinaryPublicId: result.public_id, width: result.width, height: result.height, caption: caption.trim() || null, format: result.format, bytes: result.bytes, originalFilename: result.original_filename }), signal: timeoutSignal() }), 1, 400);
}
