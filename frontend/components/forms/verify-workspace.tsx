"use client";

import { useEffect, useState, useTransition } from "react";
import { Link2, ShieldCheck, ShieldOff } from "lucide-react";

import { ChainExplorer } from "@/components/chain/chain-explorer";
import { useLanguage } from "@/components/providers/language-provider";
import { ValidationBadge } from "@/components/chain/validation-badge";
import { EmptyState } from "@/components/state/empty-state";
import { validateChain } from "@/lib/api";
import { configState } from "@/lib/env";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { formatDateTime } from "@/lib/utils";
import type { Batch, Block, ValidationResponse } from "@/lib/types";

interface VerifyWorkspaceProps {
  batches: Batch[];
  mode?: "full" | "simple";
}

export function VerifyWorkspace({ batches, mode = "full" }: VerifyWorkspaceProps) {
  const { t, language } = useLanguage();
  const [selectedBatchId, setSelectedBatchId] = useState(batches[0]?.batch_id ?? "");
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [validation, setValidation] = useState<ValidationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingChain, setIsLoadingChain] = useState(false);
  const [isPending, startTransition] = useTransition();
  const isSimpleMode = mode === "simple";

  const selectedBatch = batches.find((batch) => batch.batch_id === selectedBatchId) ?? null;
  const getEventLabel = (eventType: string) => t(`events.${eventType}`);

  useEffect(() => {
    let active = true;

    const loadBlocks = async () => {
      if (!selectedBatchId || !configState.hasSupabase) {
        if (active) {
          setBlocks([]);
        }
        return;
      }

      const supabase = getSupabaseBrowserClient();

      if (!supabase) {
        if (active) {
          setBlocks([]);
        }
        return;
      }

      if (active) {
        setIsLoadingChain(true);
        setValidation(null);
        setError(null);
      }

      const { data, error: queryError } = await supabase
        .from("blocks")
        .select("*")
        .eq("batch_id", selectedBatchId)
        .order("index", { ascending: true });

      if (!active) {
        return;
      }

      if (queryError) {
        setError(queryError.message);
        setBlocks([]);
      } else {
        setBlocks((data ?? []) as Block[]);
      }

      setIsLoadingChain(false);
    };

    loadBlocks();

    return () => {
      active = false;
    };
  }, [selectedBatchId]);

  if (batches.length === 0) {
    return (
      <EmptyState
        title={t("verify.noBatchesTitle")}
        description={t("verify.noBatchesDesc")}
        actionHref="/create-batch"
        actionLabel={t("common.createBatch")}
      />
    );
  }

  const runValidation = () => {
    if (!selectedBatchId) {
      setError(t("verify.selectBatchError"));
      return;
    }

    if (blocks.length === 0) {
      setError(t("verify.noBlocksError"));
      return;
    }

    setError(null);

    startTransition(async () => {
      try {
        const response = await validateChain({ blocks });
        setValidation(response);
      } catch (validationError) {
        setError(validationError instanceof Error ? validationError.message : t("verify.validationFailed"));
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className={isSimpleMode ? "" : "grid gap-6 xl:grid-cols-[0.9fr_1.1fr]"}>
        <div className="glass-panel space-y-6 p-6 lg:p-8">
        <div className="space-y-3">
            <p className="text-sm uppercase tracking-[0.28em] text-finca-mint/70">{t("verify.eyebrow")}</p>
            <h2 className="text-3xl font-semibold text-black">
              {isSimpleMode ? t("verify.titleSimple") : t("verify.titleFull")}
            </h2>
            {!isSimpleMode ? (
              <p className="text-sm leading-7 text-black/68">
                {t("verify.description")}
              </p>
            ) : null}
          </div>

          <label className="space-y-2">
            <span className="text-sm font-medium text-black/80">{t("verify.batch")}</span>
            <select
              value={selectedBatchId}
              onChange={(event) => setSelectedBatchId(event.target.value)}
              className="input-shell"
            >
              {batches.map((batch) => (
                <option key={batch.batch_id} value={batch.batch_id}>
                  {batch.batch_id} · {batch.crop_name}
                </option>
              ))}
            </select>
          </label>

          <div className={isSimpleMode ? "grid gap-3 sm:grid-cols-2" : "grid gap-4 sm:grid-cols-2"}>
            <div className="rounded-[24px] border border-black/10 bg-black/[0.03] p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-black/45">{t("verify.loadedBlocks")}</p>
              <p className="mt-2 text-3xl font-semibold text-black">{blocks.length}</p>
              <p className="mt-2 text-sm text-black/65">
                {isLoadingChain ? t("verify.refreshing") : t("verify.readyReview")}
              </p>
            </div>
            <div className="rounded-[24px] border border-black/10 bg-black/[0.03] p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-black/45">{t("verify.latestEvent")}</p>
              <p className="mt-2 text-lg font-semibold text-black">
                {blocks.at(-1) ? getEventLabel(blocks.at(-1)?.event_type ?? "") : t("addEvent.noBlocksFound")}
              </p>
              <p className="mt-2 text-sm text-black/65">
                {blocks.at(-1)?.timestamp ? formatDateTime(blocks.at(-1)?.timestamp, language, t) : t("verify.waitingChainData")}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={runValidation}
            disabled={isPending || isLoadingChain || !configState.hasApi || !configState.hasSupabase}
            className="button-primary w-full justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? t("verify.validating") : t("verify.validate")}
            <Link2 className="h-4 w-4" />
          </button>

          {(!configState.hasApi || !configState.hasSupabase) ? (
            <div className="rounded-2xl border border-finca-gold/25 bg-finca-gold/10 p-4 text-sm text-finca-gold">
              {t("verify.warningSettings")}
            </div>
          ) : null}

          {error ? (
            <div className="rounded-2xl border border-finca-ember/30 bg-finca-ember/10 p-4 text-sm text-finca-mist">
              {error}
            </div>
          ) : null}
        </div>

        {!isSimpleMode ? (
          <div className="space-y-6">
            <ValidationBadge validation={validation} loading={isPending} />

            <div className="glass-panel grid gap-4 p-6 sm:grid-cols-2 lg:p-8">
              <div className="rounded-[24px] border border-black/10 bg-black/[0.03] p-5">
                <div className="mb-3 flex items-center gap-2 text-black/80">
                  <ShieldCheck className="h-4 w-4 text-finca-emerald" />
                  {t("verify.validChains")}
                </div>
                <p className="text-sm leading-7 text-black/68">{t("verify.validChainsDesc")}</p>
              </div>
              <div className="rounded-[24px] border border-black/10 bg-black/[0.03] p-5">
                <div className="mb-3 flex items-center gap-2 text-black/80">
                  <ShieldOff className="h-4 w-4 text-finca-ember" />
                  {t("verify.tamperedChains")}
                </div>
                <p className="text-sm leading-7 text-black/68">{t("verify.tamperedChainsDesc")}</p>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {isSimpleMode ? <ValidationBadge validation={validation} loading={isPending} /> : null}

      {!isSimpleMode && selectedBatch ? (
        <ChainExplorer batch={selectedBatch} blocks={blocks} validation={validation} />
      ) : null}
    </div>
  );
}
