import type { Metadata } from "next";
import { Activity, ArrowRight, Blocks, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { BatchGrid } from "@/components/dashboard/batch-grid";
import { getDashboardData } from "@/lib/data";
import { getRequestLanguage } from "@/lib/i18n-server";
import { createTranslator } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const language = await getRequestLanguage();
  const t = createTranslator(language);
  return {
    title: t("dashboard.eyebrow")
  };
}

export default async function DashboardPage() {
  const language = await getRequestLanguage();
  const t = createTranslator(language);
  const batches = await getDashboardData();

  return (
    <div className="section-shell py-14 sm:py-16">
      <div className="space-y-8">
        <div className="glass-stage p-5 sm:p-8">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="space-y-3">
              <p className="section-heading-eyebrow">{t("dashboard.eyebrow")}</p>
              <h1 className="text-4xl font-semibold text-black sm:text-5xl">{t("dashboard.title")}</h1>
              <p className="max-w-3xl text-lg leading-8 text-black/70">{t("dashboard.description")}</p>
            </div>

            <Link href="/create-batch" className="button-primary gap-2">
              {t("dashboard.newBatch")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            <div className="glass-panel p-5">
              <div className="mb-3 flex items-center gap-2 text-black/80">
                <Blocks className="h-4 w-4 text-finca-mint" />
                {t("dashboard.storedBatches")}
              </div>
              <p className="text-3xl font-semibold text-black">{batches.length}</p>
            </div>
            <div className="glass-panel p-5">
              <div className="mb-3 flex items-center gap-2 text-black/80">
                <Activity className="h-4 w-4 text-finca-gold" />
                {t("dashboard.chainActivity")}
              </div>
              <p className="text-3xl font-semibold text-black">
                {batches.reduce((total, batch) => total + batch.block_count, 0)}
              </p>
            </div>
            <div className="glass-panel p-5">
              <div className="mb-3 flex items-center gap-2 text-black/80">
                <ShieldCheck className="h-4 w-4 text-finca-emerald" />
                {t("dashboard.verificationReady")}
              </div>
              <p className="text-3xl font-semibold text-black">{t("dashboard.dualViewExplorer")}</p>
            </div>
          </div>
        </div>

        <BatchGrid batches={batches} />
      </div>
    </div>
  );
}
