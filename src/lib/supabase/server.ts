import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { getServerSupabaseEnv } from "./env";

export function getSupabaseServerClient() {
  const env = getServerSupabaseEnv();
  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
