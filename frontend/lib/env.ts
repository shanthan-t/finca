const placeholderApiUrl = "https://your-render-url.onrender.com/api/v1";
const localApiUrl = "http://127.0.0.1:8000/api/v1";
const apiUrl =
  process.env.NEXT_PUBLIC_API_URL ??
  (process.env.NODE_ENV === "development" ? localApiUrl : placeholderApiUrl);

export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  apiUrl
};

export const configState = {
  hasSupabase: Boolean(env.supabaseUrl && env.supabaseAnonKey),
  hasApi: Boolean(env.apiUrl),
  isReady: Boolean(env.supabaseUrl && env.supabaseAnonKey && env.apiUrl)
};

export function getConfigurationIssues() {
  const issues: string[] = [];

  if (!configState.hasSupabase) {
    issues.push("Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to unlock live chain data.");
  }

  if (!configState.hasApi) {
    issues.push("Set NEXT_PUBLIC_API_URL so trusted actions and validation can run.");
  } else if (env.apiUrl === localApiUrl) {
    issues.push("Using the local FastAPI service at http://127.0.0.1:8000/api/v1.");
  }

  return issues;
}
