import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { configState, env } from "@/lib/env";
import { isValidHttpUrl } from "@/lib/env-utils";
import type { Database } from "@/lib/types";

const clientOptions = {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
};

let browserClient: SupabaseClient<Database> | null = null;

function getSupabaseClientConfig() {
  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    return null;
  }

  if (!isValidHttpUrl(env.supabaseUrl)) {
    console.warn("[Supabase] NEXT_PUBLIC_SUPABASE_URL is invalid. Expected a full http(s) URL.");
    return null;
  }

  return {
    url: env.supabaseUrl,
    key: env.supabaseAnonKey
  };
}

export function createSupabaseServerClient() {
  const config = getSupabaseClientConfig();

  if (!configState.hasSupabase || !config) {
    return null;
  }

  return createClient<Database>(config.url, config.key, clientOptions);
}

export function getSupabaseBrowserClient() {
  const config = getSupabaseClientConfig();

  if (!configState.hasSupabase || !config) {
    return null;
  }

  if (!browserClient) {
    browserClient = createClient<Database>(config.url, config.key, clientOptions);
  }

  return browserClient;
}
