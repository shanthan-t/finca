"use client";

import Link from "next/link";
import { ArrowRight, BadgeCheck, Blocks, Clock3, MapPin, QrCode, Sprout, UserCircle2 } from "lucide-react";

import { useLanguage } from "@/components/providers/language-provider";
import { EmptyState } from "@/components/state/empty-state";
import { QrPreview } from "@/components/trace/qr-preview";
import { getTracePath } from "@/lib/trace";
import { formatDateTime } from "@/lib/utils";
import type { BatchSummary } from "@/lib/types";

interface BatchGridProps {
  batches: BatchSummary[];
  emptyActionHref?: string;
  emptyActionLabel?: string;
  mode?: "full" | "simple";
}

export function BatchGrid({
  batches,
  emptyActionHref = "/create-batch",
  emptyActionLabel,
  mode = "full"
}: BatchGridProps) {
  const { t, language } = useLanguage();
  const isSimpleMode = mode === "simple";
  const getEventLabel = (eventType: string) => t(`events.${eventType}`);
  const resolvedEmptyActionLabel = emptyActionLabel ?? t("batchGrid.createFirstBatch");

  if (batches.length === 0) {
    return (
      <EmptyState
        title={t("batchGrid.emptyTitle")}
        description={t("batchGrid.emptyDescription")}
        actionHref={emptyActionHref}
        actionLabel={resolvedEmptyActionLabel}
      />
    );
  }

  return (
    <div className={isSimpleMode ? "grid gap-4 xl:grid-cols-2" : "grid gap-6 xl:grid-cols-2"}>
      {batches.map((batch) => {
        const previewDots = Math.max(2, Math.min(batch.block_count || 0, 5));
        const tracePath = getTracePath(batch.batch_id);
        const isVerified = Boolean(batch.farmer_verified);

        return (
          <Link
            key={batch.batch_id}
            href={`/batches/${batch.batch_id}`}
            className={`group glass-panel flex flex-col transition duration-300 hover:-translate-y-1 hover:border-finca-mint/30 ${
              isSimpleMode ? "gap-4 p-5" : "gap-6 p-6"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-finca-lime/25 bg-finca-lime/10 px-3 py-1 text-xs uppercase tracking-[0.28em] text-finca-lime">
                    {batch.batch_id}
                  </span>
                  <span className="rounded-full border border-black/10 bg-black/[0.03] px-3 py-1 text-xs uppercase tracking-[0.24em] text-black/55">
                    {batch.block_count} {t("batchGrid.blocksSuffix")}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs uppercase tracking-[0.24em] ${
                      isVerified
                        ? "border-finca-emerald/30 bg-finca-emerald/10 text-black"
                        : "border-finca-ember/25 bg-finca-ember/10 text-black"
                    }`}
                  >
                    <BadgeCheck className="h-3.5 w-3.5" />
                    {isVerified ? t("createBatch.verifiedFarmer") : t("createBatch.unverifiedSource")}
                  </span>
                </div>
                <h3 className="text-2xl font-semibold text-black">{batch.crop_name}</h3>
                <p className="text-sm text-black/65">{batch.farmer_name}</p>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-black/10 bg-black/[0.03] text-finca-mint transition duration-300 group-hover:shadow-glow">
                <ArrowRight className="h-5 w-5" />
              </div>
            </div>

            <div className="grid gap-3 text-sm text-black/70 sm:grid-cols-3">
              <div className="rounded-2xl border border-black/10 bg-black/[0.03] p-4">
                <div className="mb-2 flex items-center gap-2 text-black/45">
                  <UserCircle2 className="h-4 w-4" />
                  {t("common.farmer")}
                </div>
                <p className="font-medium text-black">{batch.farmer_name}</p>
              </div>
              <div className="rounded-2xl border border-black/10 bg-black/[0.03] p-4">
                <div className="mb-2 flex items-center gap-2 text-black/45">
                  <MapPin className="h-4 w-4" />
                  {t("common.origin")}
                </div>
                <p className="font-medium text-black">{batch.farm_location}</p>
              </div>
              <div className="rounded-2xl border border-black/10 bg-black/[0.03] p-4">
                <div className="mb-2 flex items-center gap-2 text-black/45">
                  <Clock3 className="h-4 w-4" />
                  {t("batchGrid.latest")}
                </div>
                <p className="font-medium text-black">
                  {batch.last_timestamp ? formatDateTime(batch.last_timestamp, language, t) : t("batchGrid.genesisPending")}
                </p>
              </div>
            </div>

            {isSimpleMode ? (
              <div className="flex items-center justify-between gap-4 rounded-[22px] border border-black/10 bg-black/[0.03] px-4 py-3 text-sm">
                <span className="text-black/60">{t("common.latest")}</span>
                <span className="font-medium text-black">
                  {batch.last_event_type ? getEventLabel(batch.last_event_type) : t("batchGrid.genesis")}
                </span>
              </div>
            ) : (
              <div className="rounded-[26px] border border-black/10 bg-black/[0.03] p-5">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-[0.28em] text-black/45">{t("batchGrid.chainPreview")}</p>
                    <p className="mt-2 text-sm text-black/70">
                      {batch.last_event_type ? getEventLabel(batch.last_event_type) : t("batchGrid.genesisPending")}
                    </p>
                    <p className="mt-2 flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-black/45">
                      <QrCode className="h-3.5 w-3.5" />
                      {tracePath}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="hidden md:block">
                      <QrPreview batchId={batch.batch_id} qrCodeUrl={batch.qr_code_url} size={84} />
                    </div>
                    <div className="flex items-center gap-2">
                      {Array.from({ length: previewDots }).map((_, index) => (
                        <span
                          key={`${batch.batch_id}-${index}`}
                          className="flex items-center gap-2"
                        >
                          <span className="h-3 w-3 rounded-full border border-finca-mint/30 bg-finca-mint/70 shadow-[0_0_18px_rgba(140,245,211,0.35)]" />
                          {index < previewDots - 1 ? (
                            <span className="h-px w-8 bg-gradient-to-r from-finca-mint/70 to-white/10" />
                          ) : null}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.24em] text-black/50">
                  <span className="flex items-center gap-2">
                    <Sprout className="h-4 w-4" />
                    {t("batchGrid.originVerified")}
                  </span>
                  <span className="flex items-center gap-2">
                    <Blocks className="h-4 w-4" />
                    {t("batchGrid.chainDisplayed")}
                  </span>
                </div>
              </div>
            )}
          </Link>
        );
      })}
    </div>
  );
}
