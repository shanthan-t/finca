import { cookies } from "next/headers";

import { LANGUAGE_COOKIE, resolveLanguage } from "@/lib/i18n";

export async function getRequestLanguage() {
  const cookieStore = await cookies();
  return resolveLanguage(cookieStore.get(LANGUAGE_COOKIE)?.value);
}
