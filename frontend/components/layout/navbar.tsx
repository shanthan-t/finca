"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sprout } from "lucide-react";

import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Overview" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/create-batch", label: "Create Batch" },
  { href: "/add-event", label: "Add Event" },
  { href: "/verify", label: "Verify" }
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-white/55 bg-white/42 shadow-[0_10px_34px_rgba(148,163,184,0.16)] backdrop-blur-2xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="group flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-black/10 bg-white text-finca-lime shadow-glow transition-transform duration-300 group-hover:scale-105">
            <Sprout className="h-5 w-5" />
          </span>
          <div>
            <p className="font-display text-lg font-semibold tracking-wide text-black">Finca</p>
            <p className="text-xs uppercase tracking-[0.32em] text-finca-mint/70">From Farm to Trust</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-2 rounded-full border border-white/65 bg-white/70 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] md:flex">
          {navItems.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-medium text-black/70 transition duration-300 hover:text-black",
                  active && "bg-white text-black shadow-[0_8px_20px_rgba(15,23,42,0.08)]"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <nav className="scrollbar-none flex gap-2 overflow-x-auto border-t border-black/5 px-4 pb-4 md:hidden">
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
