import type { Metadata } from "next";
import { IBM_Plex_Mono } from "next/font/google";

import "@/app/globals.css";

import { Navbar } from "@/components/layout/navbar";
import { ConfigRibbon } from "@/components/state/config-ribbon";

const monoFont = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono"
});

export const metadata: Metadata = {
  title: {
    default: "Finca",
    template: "%s | Finca"
  },
  description:
    "Finca is a blockchain-powered agricultural supply chain transparency platform that verifies trust from farm to shelf."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="bg-[#eef2f7]">
      <body
        className={`${monoFont.variable} min-h-screen bg-hero-radial font-body text-finca-mist antialiased`}
      >
        <div className="fixed inset-0 -z-40 bg-[linear-gradient(180deg,#f8fafc_0%,#eef2f7_55%,#f8fafc_100%)]" />
        <div className="fixed -left-24 top-20 -z-30 h-72 w-72 rounded-full bg-white/85 blur-3xl sm:h-96 sm:w-96" />
        <div className="fixed right-[-6rem] top-16 -z-30 h-80 w-80 rounded-full bg-white/75 blur-3xl sm:h-[28rem] sm:w-[28rem]" />
        <div className="fixed bottom-[-8rem] left-1/3 -z-30 h-96 w-96 rounded-full bg-white/70 blur-3xl" />
        <div className="fixed inset-4 -z-20 rounded-[36px] border border-white/55 bg-white/22 shadow-stage backdrop-blur-[36px] md:inset-6 lg:inset-8" />
        <div className="fixed inset-0 -z-10 bg-mesh-grid bg-[size:72px_72px] opacity-[0.12]" />
        <ConfigRibbon />
        <Navbar />
        <main className="relative pb-20">{children}</main>
      </body>
    </html>
  );
}
