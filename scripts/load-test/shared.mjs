import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";

export const EVENT_ID = "70ad0000-0000-4000-8000-000000000001";
export const EVENT_SLUG = "load-test-event";
export const idFor = (kind, index) => {
  const hex = createHash("sha256").update(`${kind}:${index}`).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
};
export function client() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
