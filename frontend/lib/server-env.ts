import "server-only";

import { isValidHttpUrl } from "@/lib/env-utils";

const placeholderApiUrl = "https://agri-blockchain-engine.onrender.com/api/v1";

function normalizeApiUrl(value: string) {
  return value.trim().replace(/\/+$/, "");
}

export function getServerApiUrl() {
  const hostport = process.env.API_HOSTPORT?.trim() ?? "";

  if (hostport) {
    const prefixed = /^https?:\/\//.test(hostport) ? hostport : `http://${hostport}`;
    const normalized = normalizeApiUrl(prefixed);
    return normalized.endsWith("/api/v1") ? normalized : `${normalized}/api/v1`;
  }

  const configuredUrl = process.env.API_URL?.trim() ?? process.env.NEXT_PUBLIC_API_URL?.trim() ?? placeholderApiUrl;
  return normalizeApiUrl(configuredUrl);
}

export function hasServerApiUrl() {
  const url = getServerApiUrl();
  return isValidHttpUrl(url) && url !== placeholderApiUrl;
}
