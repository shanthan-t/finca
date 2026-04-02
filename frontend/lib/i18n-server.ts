import { cookies } from "next/headers";

import { LANGUAGE_COOKIE, resolveLanguage } from "@/lib/i18n";

export function getRequestLanguage() {
  const cookieStore = cookies();
  return resolveLanguage(cookieStore.get(LANGUAGE_COOKIE)?.value);
}
