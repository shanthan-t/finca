import type { AppLanguage } from "@/lib/i18n";
import { createTranslator } from "@/lib/i18n";
import { isValidHttpUrl } from "@/lib/env-utils";

export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "",
  apiUrl: process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/+$/, "") ?? ""
};

export const configState = {
  hasSupabase: Boolean(isValidHttpUrl(env.supabaseUrl) && env.supabaseAnonKey),
  hasApi: Boolean(isValidHttpUrl(env.apiUrl)),
  isReady: Boolean(isValidHttpUrl(env.supabaseUrl) && env.supabaseAnonKey && isValidHttpUrl(env.apiUrl))
};

export function getConfigurationIssues(language: AppLanguage = "en") {
  const t = createTranslator(language);
  const issues: string[] = [];

  if (!configState.hasSupabase) {
    issues.push(t("config.missingSupabase"));
  }

  if (!configState.hasApi) {
    issues.push(t("config.missingApi"));
  }

  return issues;
}
