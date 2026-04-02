import type { AppLanguage } from "@/lib/i18n";
import { createTranslator } from "@/lib/i18n";

const placeholderApiUrl = "https://agri-blockchain-engine.onrender.com/api/v1";

export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  apiUrl: process.env.NEXT_PUBLIC_API_URL ?? placeholderApiUrl
};

export const configState = {
  hasSupabase: Boolean(env.supabaseUrl && env.supabaseAnonKey),
  hasApi: Boolean(env.apiUrl && env.apiUrl !== placeholderApiUrl),
  isReady: Boolean(env.supabaseUrl && env.supabaseAnonKey && env.apiUrl && env.apiUrl !== placeholderApiUrl)
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
