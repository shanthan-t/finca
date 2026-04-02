import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Blocks, DatabaseZap, ShieldCheck, Sparkles, Sprout, Warehouse } from "lucide-react";

import { FlowVisualizer } from "@/components/sections/flow-visualizer";
import { getAdvancedCopy } from "@/lib/advanced-copy";
import { getRequestLanguage } from "@/lib/i18n-server";
import { createTranslator } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const language = getRequestLanguage();
  const t = createTranslator(language);
  return {
    title: t("common.advancedMode")
  };
}

export default function AdvancedModePage() {
  const language = getRequestLanguage();
  const copy = getAdvancedCopy();
  const t = createTranslator(language);

  const localizedFlow = {
    ...copy.flow,
    badge: t(copy.flow.badge),
    title: t(copy.flow.title),
    journeyLabel: t(copy.flow.journeyLabel),
    steps: copy.flow.steps.map(step => ({
      title: t(step.title),
      subtitle: t(step.subtitle)
    }))
  };

  return (
    <div className="pb-24">
      {/* Hero Section */}
      <section className="section-shell pt-16 sm:pt-20 lg:pt-24">
        <div className="glass-stage relative overflow-hidden p-6 sm:p-10 lg:p-12">
          <div className="absolute -right-20 top-8 h-64 w-64 rounded-full bg-finca-emerald/5 blur-3xl" />
          <div className="relative grid items-center gap-12 xl:grid-cols-[0.95fr_1.05fr]">
            <div className="space-y-8">
              <div className="space-y-5">
                <span className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/72 px-4 py-2 text-xs uppercase tracking-[0.28em] text-black/70 shadow-[0_10px_30px_rgba(148,163,184,0.12)]">
                  <Sparkles className="h-4 w-4" />
                  {t(copy.heroBadge)}
                </span>
                <h1 className="max-w-4xl font-display text-5xl font-semibold leading-[1.02] text-black sm:text-6xl xl:text-7xl">
                  {t(copy.heroTitle)}
                </h1>
                <p className="max-w-2xl text-lg leading-8 text-black/72">{t(copy.heroDescription)}</p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link href="/create-batch" className="button-primary gap-2">
                  {t(copy.createBatchCta)}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/" className="button-secondary">
                  {t(copy.farmerModeCta)}
                </Link>
              </div>
            </div>

            <FlowVisualizer copy={localizedFlow} />
          </div>
        </div>
      </section>

      {/* Journey Section */}
      <section className="section-shell mt-16">
        <div className="grid gap-6 xl:grid-cols-3">
          {copy.journeyCards.map((card, index) => {
            const icons = [Sprout, Warehouse, ShieldCheck];
            const Icon = icons[index] || Sprout;
            return (
              <div key={card.title} className="glass-panel p-6 lg:p-8">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-black/10 bg-black/[0.03] text-finca-emerald">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-2xl font-semibold text-black">{t(card.title)}</h3>
                <p className="mt-4 text-sm leading-7 text-black/68">{t(card.description)}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Trust & Shortcuts Section */}
      <section className="section-shell mt-16">
        <div className="grid gap-8 lg:grid-cols-[1.02fr_0.98fr]">
          <div className="glass-panel p-6 lg:p-8">
            <h2 className="text-4xl font-semibold text-black">{t(copy.trustTitle)}</h2>
            <p className="mt-4 text-lg leading-8 text-black/70">{t(copy.trustDescription)}</p>
            
            <div className="mt-8 grid gap-4">
              {copy.trustCards.map((card, index) => {
                const icons = [Blocks, DatabaseZap];
                const Icon = icons[index] || Blocks;
                return (
                  <div key={card.title} className="flex items-start gap-4 rounded-2xl border border-black/5 bg-black/[0.02] p-4">
                    <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl border border-black/10 bg-white text-finca-emerald">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-black">{t(card.title)}</h4>
                      <p className="text-sm text-black/65">{t(card.description)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid gap-4">
            {copy.shortcuts.map((card) => (
              <Link
                key={card.href}
                href={card.href}
                className="glass-panel group p-6 transition duration-300 hover:-translate-y-1 hover:shadow-glow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.28em] text-black/45">{t(copy.quickActionLabel)}</p>
                    <h3 className="mt-3 text-xl font-semibold text-black">{t(card.title)}</h3>
                    <p className="mt-2 text-sm leading-6 text-black/65">{t(card.description)}</p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-black/10 bg-black/[0.03] text-black transition duration-300 group-hover:bg-black group-hover:text-white">
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
