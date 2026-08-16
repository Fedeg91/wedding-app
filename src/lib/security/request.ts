import { apiError } from "@/lib/api/errors";

export async function readJsonBody(request: Request, maxBytes = 16 * 1024): Promise<{ data: unknown; response: null } | { data: null; response: Response }> {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > maxBytes) return { data: null, response: apiError("PAYLOAD_TOO_LARGE", "Request body is too large", 413) };
  if (!request.body) return { data: null, response: apiError("INVALID_INPUT", "Request body must be valid JSON", 400) };
  const reader = request.body.getReader(); const chunks: Uint8Array[] = []; let total = 0;
  try { while (true) { const { done, value } = await reader.read(); if (done) break; total += value.byteLength; if (total > maxBytes) { await reader.cancel(); return { data: null, response: apiError("PAYLOAD_TOO_LARGE", "Request body is too large", 413) }; } chunks.push(value); } } catch { return { data: null, response: apiError("INVALID_INPUT", "Unable to read request body", 400) }; }
  try { const merged = new Uint8Array(total); let offset = 0; for (const chunk of chunks) { merged.set(chunk, offset); offset += chunk.byteLength; } return { data: JSON.parse(new TextDecoder().decode(merged)), response: null }; } catch { return { data: null, response: apiError("INVALID_INPUT", "Request body must be valid JSON", 400) }; }
}

export function validateSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) return apiError("CSRF_REJECTED", "Request origin is not allowed", 403);
  return null;
}

export function getClientIp(request: Request) { return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip")?.trim() || "unknown"; }
