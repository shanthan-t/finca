import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { configState, env } from "@/lib/env";
import type { Database } from "@/lib/types";

const clientOptions = {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
};

let browserClient: SupabaseClient<Database> | null = null;

export function createSupabaseServerClient() {
  if (!configState.hasSupabase) {
    return null;
  }

  return createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, clientOptions);
}

export function getSupabaseBrowserClient() {
  if (!configState.hasSupabase) {
    return null;
  }

  if (!browserClient) {
    browserClient = createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, clientOptions);
  }

  return browserClient;
}
