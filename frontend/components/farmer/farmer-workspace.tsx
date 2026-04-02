"use client";

import { useState } from "react";
import Link from "next/link";
import { Bot, CirclePlus, LayoutDashboard, Link2, ShieldCheck } from "lucide-react";

import { AIChat } from "@/components/AIChat";
import { BatchGrid } from "@/components/dashboard/batch-grid";
import { AddEventForm } from "@/components/forms/add-event-form";
import { CreateBatchForm } from "@/components/forms/create-batch-form";
import { VerifyWorkspace } from "@/components/forms/verify-workspace";
import { useLanguage } from "@/components/providers/language-provider";
import { cn } from "@/lib/utils";
import type { Batch, BatchSummary } from "@/lib/types";

type FarmerPanel = "batches" | "create" | "event" | "verify" | "assistant";

interface FarmerWorkspaceProps {
  batches: BatchSummary[];
  batchOptions: Batch[];
  totalBlocks: number;
}

export function FarmerWorkspace({ batches, batchOptions, totalBlocks }: FarmerWorkspaceProps) {
  const { t } = useLanguage();
  const defaultPanel: FarmerPanel = batches.length > 0 ? "batches" : "create";
  const [activePanel, setActivePanel] = useState<FarmerPanel>(defaultPanel);
  const panelOptions: Array<{ id: FarmerPanel; label: string; icon: typeof LayoutDashboard }> = [
    { id: "batches", label: t("farmerWorkspace.batches"), icon: LayoutDashboard },
    { id: "create", label: t("farmerWorkspace.create"), icon: CirclePlus },
    { id: "event", label: t("farmerWorkspace.event"), icon: Link2 },
    { id: "verify", label: t("farmerWorkspace.verify"), icon: ShieldCheck },
    { id: "assistant", label: t("farmerWorkspace.assistant"), icon: Bot }
  ];
  const activeLabel = panelOptions.find((option) => option.id === activePanel)?.label ?? t("common.assistant");

  return (
    <section className="section-shell pt-16 sm:pt-18 lg:pt-20">
      <div className="glass-stage space-y-6 p-4 sm:p-6 lg:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <span className="inline-flex rounded-full border border-white/70 bg-white/75 px-4 py-2 text-xs uppercase tracking-[0.28em] text-black/70">
              {t("farmerWorkspace.badge")}
            </span>
            <h1 className="text-3xl font-semibold text-black sm:text-4xl">{t("farmerWorkspace.title")}</h1>
            <p className="text-sm leading-7 text-black/66">
              {t("farmerWorkspace.summary", { batches: batches.length, steps: totalBlocks })}
            </p>
          </div>

          <Link href="/advanced" className="button-secondary">
            {t("common.advancedMode")}
          </Link>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {panelOptions.map((option) => {
            const Icon = option.icon;

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setActivePanel(option.id)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm transition duration-300",
                  activePanel === option.id
                    ? "border-black/15 bg-white text-black shadow-[0_8px_20px_rgba(15,23,42,0.08)]"
                    : "border-black/10 bg-black/[0.03] text-black/68 hover:border-black/20 hover:text-black"
                )}
              >
                <Icon className="h-4 w-4" />
                {option.label}
              </button>
            );
          })}
        </div>

        <div className="rounded-[28px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(255,255,255,0.72))] p-2 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
          <div className="flex items-center justify-between gap-3 px-3 pb-3 pt-2 sm:px-4">
            <p className="text-sm font-semibold text-black">{activeLabel}</p>
            {activePanel === "batches" ? (
              <Link href="/dashboard" className="text-sm text-black/55 transition hover:text-black">
                {t("common.fullExplorer")}
              </Link>
            ) : null}
          </div>

          {activePanel === "batches" ? (
            <BatchGrid batches={batches} emptyActionHref="/" emptyActionLabel={t("common.createBatch")} mode="simple" />
          ) : null}

          {activePanel === "create" ? <CreateBatchForm mode="simple" /> : null}

          {activePanel === "event" ? (
            <AddEventForm batches={batchOptions} mode="simple" initialBatchId={batchOptions[0]?.batch_id ?? ""} />
          ) : null}

          {activePanel === "verify" ? <VerifyWorkspace batches={batchOptions} mode="simple" /> : null}

          {activePanel === "assistant" ? (
            <AIChat initialBatchId={batchOptions[0]?.batch_id ?? ""} mode="simple" />
          ) : null}
        </div>
      </div>
    </section>
  );
}
