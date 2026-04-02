import type { AppLanguage } from "@/lib/i18n";
import { createTranslator } from "@/lib/i18n";

const placeholderApiUrl = "https://agri-blockchain-engine.onrender.com/api/v1";

function resolveApiUrl() {
  const hostport = process.env.API_HOSTPORT?.trim() ?? "";
  const configuredUrl =
    process.env.API_URL?.trim() ?? process.env.NEXT_PUBLIC_API_URL?.trim() ?? placeholderApiUrl;

  if (hostport) {
    const prefixed = /^https?:\/\//.test(hostport) ? hostport : `http://${hostport}`;
    const normalized = prefixed.replace(/\/+$/, "");
    return normalized.endsWith("/api/v1") ? normalized : `${normalized}/api/v1`;
  }

  return configuredUrl.replace(/\/+$/, "");
}

export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  apiUrl: resolveApiUrl()
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
