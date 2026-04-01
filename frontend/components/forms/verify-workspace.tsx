"use client";

import { useEffect, useState, useTransition } from "react";
import { Link2, ShieldCheck, ShieldOff } from "lucide-react";

import { ChainExplorer } from "@/components/chain/chain-explorer";
import { ValidationBadge } from "@/components/chain/validation-badge";
import { EmptyState } from "@/components/state/empty-state";
import { validateChain } from "@/lib/api";
import { configState } from "@/lib/env";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { formatDateTime, toTitleCase } from "@/lib/utils";
import type { Batch, Block, ValidationResponse } from "@/lib/types";

interface VerifyWorkspaceProps {
  batches: Batch[];
}

export function VerifyWorkspace({ batches }: VerifyWorkspaceProps) {
  const [selectedBatchId, setSelectedBatchId] = useState(batches[0]?.batch_id ?? "");
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [validation, setValidation] = useState<ValidationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingChain, setIsLoadingChain] = useState(false);
  const [isPending, startTransition] = useTransition();

  const selectedBatch = batches.find((batch) => batch.batch_id === selectedBatchId) ?? null;

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
        title="There are no stored batches to validate yet."
        description="Create a batch first, then return here to confirm that its journey still holds together."
        actionHref="/create-batch"
        actionLabel="Create a batch"
      />
    );
  }

  const runValidation = () => {
    if (!selectedBatchId) {
      setError("Select a batch before validating.");
      return;
    }

    if (blocks.length === 0) {
      setError("This batch has no blocks to validate.");
      return;
    }

    setError(null);

    startTransition(async () => {
      try {
        const response = await validateChain({ blocks });
        setValidation(response);
      } catch (validationError) {
        setError(validationError instanceof Error ? validationError.message : "Validation failed.");
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="glass-panel space-y-6 p-6 lg:p-8">
          <div className="space-y-3">
            <p className="text-sm uppercase tracking-[0.28em] text-finca-mint/70">Verify integrity</p>
            <h2 className="text-3xl font-semibold text-black">Prove that the chain stayed untouched.</h2>
            <p className="text-sm leading-7 text-black/68">
              Run a trust check on the full journey and see instantly whether the chain is still intact.
            </p>
          </div>

          <label className="space-y-2">
            <span className="text-sm font-medium text-black/80">Batch</span>
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

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[24px] border border-black/10 bg-black/[0.03] p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-black/45">Loaded blocks</p>
              <p className="mt-2 text-3xl font-semibold text-black">{blocks.length}</p>
              <p className="mt-2 text-sm text-black/65">
                {isLoadingChain ? "Refreshing the latest journey..." : "Ready for integrity review."}
              </p>
            </div>
            <div className="rounded-[24px] border border-black/10 bg-black/[0.03] p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-black/45">Latest event</p>
              <p className="mt-2 text-lg font-semibold text-black">
                {blocks.at(-1) ? toTitleCase(blocks.at(-1)?.event_type ?? "") : "No blocks"}
              </p>
              <p className="mt-2 text-sm text-black/65">
                {blocks.at(-1)?.timestamp ? formatDateTime(blocks.at(-1)?.timestamp) : "Waiting for chain data"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={runValidation}
            disabled={isPending || isLoadingChain || !configState.hasApi || !configState.hasSupabase}
            className="button-primary w-full justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Running validation..." : "Validate chain"}
            <Link2 className="h-4 w-4" />
          </button>

          {(!configState.hasApi || !configState.hasSupabase) ? (
            <div className="rounded-2xl border border-finca-gold/25 bg-finca-gold/10 p-4 text-sm text-finca-gold">
              Verification needs the required project settings before it can run.
            </div>
          ) : null}

          {error ? (
            <div className="rounded-2xl border border-finca-ember/30 bg-finca-ember/10 p-4 text-sm text-finca-mist">
              {error}
            </div>
          ) : null}
        </div>

        <div className="space-y-6">
          <ValidationBadge validation={validation} loading={isPending} />

          <div className="glass-panel grid gap-4 p-6 sm:grid-cols-2 lg:p-8">
            <div className="rounded-[24px] border border-black/10 bg-black/[0.03] p-5">
              <div className="mb-3 flex items-center gap-2 text-black/80">
                <ShieldCheck className="h-4 w-4 text-finca-emerald" />
                Valid chains
              </div>
              <p className="text-sm leading-7 text-black/68">
                Green glow and pulse animation make trust visible the moment integrity is confirmed.
              </p>
            </div>
            <div className="rounded-[24px] border border-black/10 bg-black/[0.03] p-5">
              <div className="mb-3 flex items-center gap-2 text-black/80">
                <ShieldOff className="h-4 w-4 text-finca-ember" />
                Tampered chains
              </div>
              <p className="text-sm leading-7 text-black/68">
                Broken connectors and red alerts appear automatically when the journey no longer holds together.
              </p>
            </div>
          </div>
        </div>
      </div>

      {selectedBatch ? (
        <ChainExplorer batch={selectedBatch} blocks={blocks} validation={validation} />
      ) : null}
    </div>
  );
}
