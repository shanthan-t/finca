"use client";

import { createContext, useContext, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  LANGUAGE_COOKIE,
  createTranslator,
  resolveLanguage,
  supportedLanguages,
  type AppLanguage
} from "@/lib/i18n";

interface LanguageContextValue {
  language: AppLanguage;
  setLanguagePreference: (language: AppLanguage) => void;
  t: (key: string, values?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({
  initialLanguage,
  children
}: {
  initialLanguage: AppLanguage;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [language, setLanguage] = useState<AppLanguage>(initialLanguage);
  const [, startTransition] = useTransition();

  const value = useMemo<LanguageContextValue>(() => {
    return {
      language,
      setLanguagePreference: (nextLanguage) => {
        const resolved = resolveLanguage(nextLanguage);
        setLanguage(resolved);

        document.cookie = `${LANGUAGE_COOKIE}=${resolved}; path=/; max-age=31536000; samesite=lax`;
        window.localStorage.setItem(LANGUAGE_COOKIE, resolved);

        startTransition(() => {
          router.refresh();
        });
      },
      t: createTranslator(language)
    };
  }, [language, router]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider.");
  }

  return {
    ...context,
    languages: supportedLanguages
  };
}
