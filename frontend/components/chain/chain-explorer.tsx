"use client";

import { useEffect, useState, useTransition } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowRight, Blocks, Clock3, Leaf, RotateCcw, ScanSearch } from "lucide-react";

import { validateChain } from "@/lib/api";
import { BlockCard } from "@/components/chain/block-card";
import { Timeline } from "@/components/chain/timeline";
import { ValidationBadge } from "@/components/chain/validation-badge";
import { useLanguage } from "@/components/providers/language-provider";
import { EmptyState } from "@/components/state/empty-state";
import { formatDateTime, getBlockHeadline, getBlockNarrative } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Batch, Block, ValidationResponse } from "@/lib/types";

interface ChainExplorerProps {
  batch: Batch;
  blocks: Block[];
  validation?: ValidationResponse | null;
  allowTamperDemo?: boolean;
}

export function ChainExplorer({
  batch,
  blocks,
  validation = null,
  allowTamperDemo = false
}: ChainExplorerProps) {
  const { t, language } = useLanguage();
  const [activeBlocks, setActiveBlocks] = useState(blocks);
  const [activeValidation, setActiveValidation] = useState<ValidationResponse | null>(validation);
  const [tamperTarget, setTamperTarget] = useState<number | null>(null);
  const [tamperMessage, setTamperMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [activeIndex, setActiveIndex] = useState(Math.max(activeBlocks.length - 1, 0));
  const [expandedIndex, setExpandedIndex] = useState<number | null>(activeBlocks.length > 0 ? activeBlocks.length - 1 : null);

  useEffect(() => {
    setActiveBlocks(blocks);
    setActiveValidation(validation);
    setTamperTarget(null);
    setTamperMessage(null);
  }, [blocks, validation]);

  useEffect(() => {
    setActiveIndex(Math.max(activeBlocks.length - 1, 0));
    setExpandedIndex(activeBlocks.length > 0 ? activeBlocks.length - 1 : null);
  }, [activeBlocks.length]);

  if (activeBlocks.length === 0) {
    return (
      <EmptyState
        title={t("chainExplorer.emptyTitle")}
        description={t("chainExplorer.emptyDescription")}
        actionHref={`/add-event?batchId=${batch.batch_id}`}
        actionLabel={t("chainExplorer.addSupplyEvent")}
      />
    );
  }

  const activeBlock = activeBlocks[activeIndex] ?? activeBlocks.at(-1) ?? activeBlocks[0];
  const invalidIndex = activeValidation?.valid === false ? activeValidation.invalid_index ?? null : null;

  const handleTamperDemo = () => {
    startTransition(async () => {
      const clonedBlocks = activeBlocks.map((block) => ({
        ...block,
        data: { ...block.data }
      }));
      const targetIndex = Math.min(clonedBlocks.length - 1, clonedBlocks.length > 1 ? 1 : 0);
      const targetBlock = clonedBlocks[targetIndex];
      const currentLocation =
        typeof targetBlock.data.location === "string" && targetBlock.data.location.trim()
          ? targetBlock.data.location
          : null;

      clonedBlocks[targetIndex] = {
        ...targetBlock,
        data: {
          ...targetBlock.data,
          location: currentLocation ? `${currentLocation} · ${t("trace.altered")}` : t("trace.fakeLocation")
        }
      };

      try {
        const tamperedValidation = await validateChain({ blocks: clonedBlocks });
        const brokenIndex =
          tamperedValidation.valid === false && typeof tamperedValidation.invalid_index === "number"
            ? tamperedValidation.invalid_index
            : targetIndex;

        setActiveBlocks(clonedBlocks);
        setActiveValidation({
          ...tamperedValidation,
          valid: false,
          invalid_index: brokenIndex,
          message:
            tamperedValidation.message ?? t("trace.tamperDetectedMessage", { index: brokenIndex })
        });
        setTamperTarget(brokenIndex);
        setTamperMessage(t("trace.tamperDetectedMessage", { index: brokenIndex }));
        setActiveIndex(targetIndex);
        setExpandedIndex(targetIndex);
      } catch (error) {
        setTamperMessage(error instanceof Error ? error.message : t("trace.tamperRunFailed"));
      }
    });
  };

  const resetTamperDemo = () => {
    setActiveBlocks(blocks);
    setActiveValidation(validation);
    setTamperTarget(null);
    setTamperMessage(null);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel p-6 lg:p-7"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-3">
              <p className="text-sm uppercase tracking-[0.28em] text-finca-mint/70">{t("chainExplorer.synchronizedExplorer")}</p>
              <h2 className="text-3xl font-semibold text-black">{batch.crop_name} {t("chainExplorer.titleSuffix")}</h2>
              <p className="max-w-2xl text-sm leading-7 text-black/68">{t("chainExplorer.description")}</p>
            </div>
            <ValidationBadge validation={activeValidation} />
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-[24px] border border-black/10 bg-black/[0.03] p-5">
              <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-black/45">
                <Leaf className="h-4 w-4" />
                {t("chainExplorer.selectedEvent")}
              </div>
              <p className="text-xl font-semibold text-black">{getBlockHeadline(activeBlock, t)}</p>
              <p className="mt-2 text-sm leading-7 text-black/65">{getBlockNarrative(activeBlock, t)}</p>
            </div>
            <div className="rounded-[24px] border border-black/10 bg-black/[0.03] p-5">
              <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-black/45">
                <Clock3 className="h-4 w-4" />
                {t("chainExplorer.timestamp")}
              </div>
              <p className="text-lg font-semibold text-black">{formatDateTime(activeBlock.timestamp, language, t)}</p>
              <p className="mt-2 text-sm text-black/65">{t("chainExplorer.blockActive", { index: activeBlock.index })}</p>
            </div>
            <div className="rounded-[24px] border border-black/10 bg-black/[0.03] p-5">
              <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-black/45">
                <ScanSearch className="h-4 w-4" />
                {t("chainExplorer.technicalSync")}
              </div>
              <p className="text-lg font-semibold text-black">{t("chainExplorer.connectedBlocks", { count: activeBlocks.length })}</p>
              <p className="mt-2 text-sm text-black/65">{t("chainExplorer.clickToPivot")}</p>
            </div>
          </div>
        </motion.div>

        <div className="glass-panel flex flex-col justify-between p-6 lg:p-7">
          <div>
            <p className="text-sm uppercase tracking-[0.28em] text-finca-mint/70">{t("chainExplorer.trustSignal")}</p>
            <h3 className="mt-3 text-2xl font-semibold text-black">{t("chainExplorer.trustTitle")}</h3>
            <p className="mt-3 text-sm leading-7 text-black/65">{t("chainExplorer.trustDesc")}</p>
          </div>

          <div className="mt-6 space-y-4">
            <div className="flex items-center gap-3 rounded-2xl border border-black/10 bg-black/[0.03] p-4">
              <Blocks className="h-5 w-5 text-finca-mint" />
              <p className="text-sm text-black/70">{t("chainExplorer.everyStepConnected")}</p>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-black/10 bg-black/[0.03] p-4">
              <ArrowRight className="h-5 w-5 text-finca-gold" />
              <p className="text-sm text-black/70">{t("chainExplorer.validationGlow")}</p>
            </div>

            {allowTamperDemo ? (
              <div className="rounded-[22px] border border-black/10 bg-black/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-black/45">{t("trace.demoLabel")}</p>
                <p className="mt-2 text-sm text-black/70">{t("trace.demoDescription")}</p>

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleTamperDemo}
                    disabled={isPending || tamperTarget !== null}
                    className="button-primary gap-2 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {t("trace.simulateTampering")}
                    <AlertTriangle className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={resetTamperDemo}
                    disabled={isPending || tamperTarget === null}
                    className="button-secondary gap-2 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {t("trace.resetDemo")}
                    <RotateCcw className="h-4 w-4" />
                  </button>
                </div>

                {tamperMessage ? (
                  <p className="mt-4 text-sm text-black/72">{tamperMessage}</p>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <Timeline
          batch={batch}
          blocks={activeBlocks}
          activeIndex={activeIndex}
          invalidIndex={invalidIndex}
          onSelect={(index) => {
            setActiveIndex(index);
            setExpandedIndex(index);
          }}
        />

        <div className="glass-panel p-6 lg:p-7">
          <div className="mb-6">
            <p className="text-sm uppercase tracking-[0.28em] text-finca-mint/70">{t("chainExplorer.chainView")}</p>
            <h3 className="mt-3 text-2xl font-semibold text-black">{t("chainExplorer.chainViewTitle")}</h3>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-black/65">{t("chainExplorer.chainViewDesc")}</p>
          </div>

          <div className="space-y-4">
            {activeBlocks.map((block, index) => {
              const compromised = invalidIndex !== null && index >= invalidIndex;
              const brokenAfter = invalidIndex !== null && index === invalidIndex - 1;

              return (
                <div key={`${block.batch_id}-${block.index}`}>
                  <BlockCard
                    block={block}
                    isActive={activeIndex === index}
                    isExpanded={expandedIndex === index}
                    compromised={compromised}
                    onSelect={() => {
                      setActiveIndex(index);
                      setExpandedIndex(index);
                    }}
                    onToggle={() => {
                      setExpandedIndex((current) => (current === index ? null : index));
                    }}
                  />

                  {index < activeBlocks.length - 1 ? (
                    <div className="flex justify-center py-3">
                      <div
                        className={cn(
                          "relative h-10 w-px bg-gradient-to-b from-finca-mint/80 via-black/15 to-transparent",
                          brokenAfter && "bg-gradient-to-b from-finca-ember to-transparent"
                        )}
                      >
                        {brokenAfter ? (
                          <>
                            <span className="absolute left-1/2 top-3 h-3 w-px -translate-x-1/2 bg-white" />
                            <span className="absolute left-1/2 top-1 h-2 w-px -translate-x-1/2 bg-finca-ember shadow-[0_0_12px_rgba(255,123,112,0.8)]" />
                            <span className="absolute left-1/2 bottom-1 h-2 w-px -translate-x-1/2 bg-finca-ember shadow-[0_0_12px_rgba(255,123,112,0.8)]" />
                          </>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
