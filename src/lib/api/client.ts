import type { ApiErrorResponse } from "@/types";

export class ApiClientError extends Error {
  constructor(public code: string, message: string, public status: number) { super(message); }
}

export async function fetchJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  let data: T | ApiErrorResponse;
  try { data = await response.json() as T | ApiErrorResponse; } catch { throw new ApiClientError("INVALID_RESPONSE", "Il servizio ha restituito una risposta non valida", response.status); }
  if (!response.ok) {
    const error = data as ApiErrorResponse;
    throw new ApiClientError(error.error?.code ?? "UNKNOWN_ERROR", error.error?.message ?? "Request failed", response.status);
  }
  return data as T;
}
