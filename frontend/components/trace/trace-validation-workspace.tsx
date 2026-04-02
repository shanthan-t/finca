"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, ShieldOff } from "lucide-react";

import { ChainExplorer } from "@/components/chain/chain-explorer";
import { ValidationBadge } from "@/components/chain/validation-badge";
import { useLanguage } from "@/components/providers/language-provider";
import { BatchQrCard } from "@/components/trace/batch-qr-card";
import { FarmerIdentityCard } from "@/components/trace/farmer-identity-card";
import { validateChain } from "@/lib/api";
import type { BatchWithBlocks, ValidationResponse } from "@/lib/types";

interface TraceValidationWorkspaceProps {
  chain: BatchWithBlocks;
}

export function TraceValidationWorkspace({ chain }: TraceValidationWorkspaceProps) {
  const { t } = useLanguage();
  const [validation, setValidation] = useState<ValidationResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const runValidation = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await validateChain({ blocks: chain.blocks });

        if (active) {
          setValidation(response);
        }
      } catch (validationError) {
        if (active) {
          setError(
            validationError instanceof Error ? validationError.message : t("trace.validationFailed")
          );
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    runValidation();

    return () => {
      active = false;
    };
  }, [chain.blocks, t]);

  return (
    <div className="section-shell py-14 sm:py-16">
      <div className="glass-stage space-y-8 p-3 sm:p-4 lg:p-5">
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="glass-panel p-6 lg:p-8">
            <p className="section-heading-eyebrow">{t("trace.eyebrow")}</p>
            <h1 className="mt-4 text-4xl font-semibold text-black sm:text-5xl">{t("trace.title", { batchId: chain.batch_id })}</h1>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-black/70">{t("trace.description")}</p>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-[24px] border border-black/10 bg-black/[0.03] p-5">
                <p className="text-xs uppercase tracking-[0.24em] text-black/45">{t("trace.cropLabel")}</p>
                <p className="mt-2 text-lg font-semibold text-black">{chain.crop_name}</p>
              </div>
              <div className="rounded-[24px] border border-black/10 bg-black/[0.03] p-5">
                <p className="text-xs uppercase tracking-[0.24em] text-black/45">{t("trace.originLabel")}</p>
                <p className="mt-2 text-lg font-semibold text-black">{chain.farm_location}</p>
              </div>
              <div className="rounded-[24px] border border-black/10 bg-black/[0.03] p-5">
                <p className="text-xs uppercase tracking-[0.24em] text-black/45">{t("trace.stepsLabel")}</p>
                <p className="mt-2 text-lg font-semibold text-black">{chain.blocks.length}</p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <ValidationBadge validation={validation} loading={isLoading} />

            <div className="glass-panel grid gap-4 p-6 sm:grid-cols-2 lg:p-8">
              <div className="rounded-[24px] border border-black/10 bg-black/[0.03] p-5">
                <div className="mb-3 flex items-center gap-2 text-black/80">
                  <ShieldCheck className="h-4 w-4 text-finca-emerald" />
                  {t("trace.validTitle")}
                </div>
                <p className="text-sm leading-7 text-black/68">{t("trace.validDesc")}</p>
              </div>
              <div className="rounded-[24px] border border-black/10 bg-black/[0.03] p-5">
                <div className="mb-3 flex items-center gap-2 text-black/80">
                  <ShieldOff className="h-4 w-4 text-finca-ember" />
                  {t("trace.tamperTitle")}
                </div>
                <p className="text-sm leading-7 text-black/68">{t("trace.tamperDesc")}</p>
              </div>
            </div>
          </div>
        </div>

        {error ? (
          <div className="glass-panel border-finca-ember/35 p-6 lg:p-7">
            <p className="text-sm text-black/75">{error}</p>
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
          <FarmerIdentityCard batch={chain} />
          <BatchQrCard batchId={chain.batch_id} qrCodeUrl={chain.qr_code_url} />
        </div>

        <ChainExplorer batch={chain} blocks={chain.blocks} validation={validation} allowTamperDemo />
      </div>
    </div>
  );
}
