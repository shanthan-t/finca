import "server-only";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/types";

const clientOptions = {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
};

function getServerSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
}

function getServerSupabaseAnonKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
}

function getServerSupabaseWriteKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY ?? getServerSupabaseAnonKey();
}

export function createSupabaseServerReadClient() {
  const url = getServerSupabaseUrl();
  const key = getServerSupabaseAnonKey();

  if (!url || !key) {
    return null;
  }

  return createClient<Database>(url, key, clientOptions);
}

export function createSupabaseServerWriteClient() {
  const url = getServerSupabaseUrl();
  const key = getServerSupabaseWriteKey();

  if (!url || !key) {
    return null;
  }

  return createClient<Database>(url, key, clientOptions);
}
