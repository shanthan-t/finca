"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sprout } from "lucide-react";

import { useLanguage } from "@/components/providers/language-provider";
import { cn } from "@/lib/utils";

export function Navbar() {
  const pathname = usePathname();
  const { language, languages, setLanguagePreference, t } = useLanguage();
  const navItems = [
    { href: "/", label: t("navbar.farmerMode") },
    { href: "/advanced", label: t("navbar.advancedMode") },
    { href: "/dashboard", label: t("navbar.explorer") },
    { href: "/assistant", label: t("navbar.assistant") }
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-white/55 bg-white/42 shadow-[0_10px_34px_rgba(148,163,184,0.16)] backdrop-blur-2xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="group flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-black/10 bg-white text-finca-lime shadow-glow transition-transform duration-300 group-hover:scale-105">
            <Sprout className="h-5 w-5" />
          </span>
          <div>
            <p className="font-display text-lg font-semibold tracking-wide text-black">{t("common.appName")}</p>
            <p className="text-xs uppercase tracking-[0.32em] text-finca-mint/70">{t("common.tagLine")}</p>
          </div>
        </Link>

        <div className="hidden items-center gap-3 md:flex">
          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-full px-4 py-1.5 text-sm font-medium transition duration-300",
                    isActive
                      ? "bg-black text-white"
                      : "text-black/55 hover:bg-black/[0.04] hover:text-black"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <label className="flex items-center gap-2 rounded-full border border-white/65 bg-white/70 px-4 py-2 text-sm text-black/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
            <span>{t("common.language")}</span>
            <select
              value={language}
              onChange={(event) => setLanguagePreference(event.target.value as typeof language)}
              className="bg-transparent text-sm font-medium text-black outline-none"
            >
              {languages.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.nativeLabel}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="border-t border-black/5 px-4 pt-3 md:hidden">
        <label className="flex items-center justify-between gap-3 rounded-full border border-white/65 bg-white/60 px-4 py-2 text-sm text-black/70 backdrop-blur-xl">
          <span>{t("common.language")}</span>
          <select
            value={language}
            onChange={(event) => setLanguagePreference(event.target.value as typeof language)}
            className="bg-transparent text-sm font-medium text-black outline-none"
          >
            {languages.map((option) => (
              <option key={option.value} value={option.value}>
                {option.nativeLabel}
              </option>
            ))}
          </select>
        </label>
      </div>

      <nav className="scrollbar-none flex gap-2 overflow-x-auto px-4 pb-4 pt-3 md:hidden">
        {navItems.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "whitespace-nowrap rounded-full border border-white/65 bg-white/60 px-4 py-2 text-sm text-black/70 backdrop-blur-xl",
                active && "border-black/10 bg-white text-black shadow-[0_8px_20px_rgba(15,23,42,0.08)]"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
