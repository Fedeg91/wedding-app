import { z } from "zod";

const cursorPayloadSchema = z.object({ createdAt: z.iso.datetime({ offset: true }), id: z.uuid(), likeCount: z.number().int().nonnegative().optional() });
export type PhotoCursor = z.infer<typeof cursorPayloadSchema>;

export function encodeCursor(cursor: PhotoCursor) {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

export function decodeCursor(value: string): PhotoCursor | null {
  try { return cursorPayloadSchema.parse(JSON.parse(Buffer.from(value, "base64url").toString("utf8"))); } catch { return null; }
}
