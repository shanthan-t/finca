import type { Metadata } from "next";
import type { CSSProperties } from "react";

import "@/app/globals.css";

import { Navbar } from "@/components/layout/navbar";
import { LanguageProvider } from "@/components/providers/language-provider";
import { ConfigRibbon } from "@/components/state/config-ribbon";
import { getRequestLanguage } from "@/lib/i18n-server";
import { getLanguageOption, createTranslator } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const language = await getRequestLanguage();
  const t = createTranslator(language);
  return {
    title: {
      default: t("common.appName"),
      template: `%s | ${t("common.appName")}`
    },
    description: t("common.tagLine")
  };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const language = await getRequestLanguage();
  const activeLanguage = getLanguageOption(language);
  const fontStyle = {
    "--font-body": activeLanguage.fontFamily,
    "--font-display": activeLanguage.fontFamily
  } as CSSProperties;

  return (
    <html lang={language} className="bg-[#eef2f7]">
      <body
        style={fontStyle}
        className="min-h-screen bg-hero-radial font-body text-finca-mist antialiased"
      >
        <div className="fixed inset-0 -z-40 bg-[linear-gradient(180deg,#f8fafc_0%,#eef2f7_55%,#f8fafc_100%)]" />
        <div className="fixed -left-24 top-20 -z-30 h-72 w-72 rounded-full bg-white/85 blur-3xl sm:h-96 sm:w-96" />
        <div className="fixed right-[-6rem] top-16 -z-30 h-80 w-80 rounded-full bg-white/75 blur-3xl sm:h-[28rem] sm:w-[28rem]" />
        <div className="fixed bottom-[-8rem] left-1/3 -z-30 h-96 w-96 rounded-full bg-white/70 blur-3xl" />
        <div className="fixed inset-4 -z-20 rounded-[36px] border border-white/55 bg-white/22 shadow-stage backdrop-blur-[36px] md:inset-6 lg:inset-8" />
        <div className="fixed inset-0 -z-10 bg-mesh-grid bg-[size:72px_72px] opacity-[0.12]" />
        <LanguageProvider initialLanguage={language}>
          <ConfigRibbon language={language} />
          <Navbar />
          <main className="relative pb-20">{children}</main>
        </LanguageProvider>
      </body>
    </html>
  );
}
