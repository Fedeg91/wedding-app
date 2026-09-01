import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { logServerError } from "@/lib/logger";

export type ApiErrorCode = "EVENT_NOT_FOUND" | "INVALID_INPUT" | "INVALID_GUEST" | "INVALID_CURSOR" | "PHOTO_NOT_LIKEABLE" | "UPLOAD_DISABLED" | "GALLERY_DISABLED" | "UNAUTHORIZED" | "PAYLOAD_TOO_LARGE" | "CSRF_REJECTED" | "INVALID_CLOUDINARY_ASSET" | "CLOUDINARY_ERROR" | "DATABASE_ERROR" | "INTERNAL_ERROR";

export function apiError(code: ApiErrorCode, message: string, status: number, details?: unknown) {
  return NextResponse.json({ error: { code, message, ...(details ? { details } : {}) } }, { status });
}

export function invalidInput(error: ZodError) {
  return apiError("INVALID_INPUT", "Invalid request", 400, error.flatten());
}

export function databaseError(context: string, error: unknown) {
  logServerError("database_error", error, { operation: context });
  return apiError("DATABASE_ERROR", "Unable to complete the request", 500);
}
