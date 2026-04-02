import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/types";

const clientOptions = {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
};

function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
}

function getSupabaseAnonKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";
}

function getSupabaseServiceRoleKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";
}

export function createSupabaseAdminClient() {
  const url = getSupabaseUrl();
  const serviceKey = getSupabaseServiceRoleKey();
  const anonKey = getSupabaseAnonKey();

  if (!url) {
    console.error("[Supabase] Missing NEXT_PUBLIC_SUPABASE_URL.");
    return null;
  }

  if (!serviceKey) {
    console.warn("[Supabase] SUPABASE_SERVICE_ROLE_KEY is missing. Falling back to anon key for admin operations (may fail due to RLS).");
  }

  const key = serviceKey || anonKey;

  if (!key) {
    console.error("[Supabase] Missing both service role key and anon key.");
    return null;
  }

  return createClient<Database>(url, key, clientOptions);
}

export function createSupabaseReadClient() {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();

  if (!url || !key) {
    return null;
  }

  return createClient<Database>(url, key, clientOptions);
}

export function hasServerSupabaseAccess() {
  return Boolean(getSupabaseUrl() && (getSupabaseServiceRoleKey() || getSupabaseAnonKey()));
}

export function hasSupabaseServiceRole() {
  return Boolean(getSupabaseUrl() && getSupabaseServiceRoleKey());
}
