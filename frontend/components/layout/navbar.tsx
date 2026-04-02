"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, Globe, Sprout } from "lucide-react";

import { useLanguage } from "@/components/providers/language-provider";
import { cn } from "@/lib/utils";

function LanguageDropdown() {
  const { language, languages, setLanguagePreference } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = languages.find((l) => l.value === language);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all duration-300",
          open
            ? "border-black/15 bg-black/[0.06] text-black shadow-[0_4px_16px_rgba(0,0,0,0.06)]"
            : "border-white/65 bg-white/70 text-black/75 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] hover:border-black/10 hover:bg-white/90 hover:text-black"
        )}
      >
        <Globe className="h-3.5 w-3.5 text-black/40" />
        <span>{current?.nativeLabel ?? "English"}</span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-black/40 transition-transform duration-300",
            open && "rotate-180"
          )}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className="absolute right-0 top-full z-50 mt-2 min-w-[200px] overflow-hidden rounded-2xl border border-black/[0.08] bg-white/95 p-1.5 shadow-[0_20px_60px_rgba(0,0,0,0.12),0_0_0_1px_rgba(0,0,0,0.04)] backdrop-blur-2xl"
          >
            {languages.map((option, index) => {
              const isActive = option.value === language;
              return (
                <motion.button
                  key={option.value}
                  type="button"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.04, duration: 0.2 }}
                  onClick={() => {
                    setLanguagePreference(option.value as typeof language);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm transition-all duration-200",
                    isActive
                      ? "bg-black/[0.06] font-medium text-black"
                      : "text-black/65 hover:bg-black/[0.03] hover:text-black"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-all duration-200",
                      isActive
                        ? "bg-black text-white shadow-[0_2px_8px_rgba(0,0,0,0.15)]"
                        : "bg-black/[0.06] text-black/50"
                    )}
                  >
                    {option.value.toUpperCase()}
                  </span>
                  <div className="flex flex-1 flex-col">
                    <span className="leading-tight">{option.nativeLabel}</span>
                    {option.label !== option.nativeLabel && (
                      <span className="text-xs leading-tight text-black/40">
                        {option.label}
                      </span>
                    )}
                  </div>
                  {isActive && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="ml-auto"
                    >
                      <Check className="h-3.5 w-3.5 text-black/50" />
                    </motion.span>
                  )}
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const navItems = [
    { href: "/farm", label: t("navbar.farmerMode") },
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
          <p className="font-display text-lg font-semibold tracking-wide text-black">{t("common.appName")}</p>
        </Link>

        <div className="hidden items-center gap-3 md:flex">
          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-full px-4 py-1.5 text-sm font-medium transition duration-300",
                    isActive
                      ? "bg-finca-emerald text-white"
                      : "text-black/55 hover:bg-black/[0.04] hover:text-black"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <LanguageDropdown />
        </div>
      </div>

      <div className="border-t border-black/5 px-4 pt-3 md:hidden">
        <LanguageDropdown />
      </div>

      <nav className="scrollbar-none flex gap-2 overflow-x-auto px-4 pb-4 pt-3 md:hidden">
        {navItems.map((item) => {
          const active = pathname.startsWith(item.href);

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
