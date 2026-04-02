"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, BadgeCheck, DatabaseZap, ShieldCheck } from "lucide-react";
import QRCode from "qrcode";

import { useLanguage } from "@/components/providers/language-provider";
import { createBatch, extractReturnedBlock } from "@/lib/api";
import { configState } from "@/lib/env";
import { persistBatchAndGenesis, persistBatchEnhancements } from "@/lib/persistence";
import { getAbsoluteTraceUrl } from "@/lib/trace";

function generateBatchId() {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const serial = Math.floor(100 + Math.random() * 900);
  return `FINCA-${stamp}-${serial}`;
}

interface CreateBatchFormProps {
  mode?: "full" | "simple";
}

export function CreateBatchForm({ mode = "full" }: CreateBatchFormProps) {
  const { t } = useLanguage();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [form, setForm] = useState({
    batch_id: generateBatchId(),
    crop_name: "",
    farmer_name: "",
    farm_location: "",
    farmer_phone: "",
    farmer_verified: true
  });

  const updateField = <K extends keyof typeof form>(field: K, value: (typeof form)[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };
  const isSimpleMode = mode === "simple";

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(null);

    startTransition(async () => {
      try {
        const response = await createBatch({
          batch_id: form.batch_id,
          crop_name: form.crop_name,
          farmer_name: form.farmer_name,
          farm_location: form.farm_location
        });
        const batchId = form.batch_id;
        const block = extractReturnedBlock(response, batchId);

        if (!block) {
          throw new Error(t("createBatch.unusableGenesis"));
        }

        await persistBatchAndGenesis(
          {
            batch_id: form.batch_id,
            crop_name: form.crop_name,
            farmer_name: form.farmer_name,
            farm_location: form.farm_location,
            created_at: block.timestamp
          },
          block
        );

        try {
          const qrCodeUrl = await QRCode.toDataURL(getAbsoluteTraceUrl(batchId));
          await persistBatchEnhancements(batchId, {
            farmer_phone: form.farmer_phone.trim() || null,
            farmer_verified: form.farmer_verified,
            qr_code_url: qrCodeUrl
          });
        } catch (enhancementError) {
          console.warn("Batch trust extras could not be stored.", enhancementError);
        }

        setStatus({
          tone: "success",
          message: response.message ?? t("createBatch.successStored")
        });
        router.push(`/batches/${batchId}`);
        router.refresh();
      } catch (error) {
        setStatus({
          tone: "error",
          message: error instanceof Error ? error.message : t("createBatch.unable")
        });
      }
    });
  };

  return (
    <div className={isSimpleMode ? "" : "grid gap-6 xl:grid-cols-[0.98fr_1.02fr]"}>
      <form onSubmit={handleSubmit} className="glass-panel space-y-6 p-6 lg:p-8">
        <div className="space-y-3">
          <p className="text-sm uppercase tracking-[0.28em] text-finca-mint/70">{t("createBatch.eyebrow")}</p>
          <h2 className="text-3xl font-semibold text-black">
            {isSimpleMode ? t("createBatch.titleSimple") : t("createBatch.titleFull")}
          </h2>
          {!isSimpleMode ? (
            <p className="max-w-2xl text-sm leading-7 text-black/68">
              {t("createBatch.description")}
            </p>
          ) : null}
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-medium text-black/80">{t("createBatch.batchId")}</span>
            <input
              required
              value={form.batch_id}
              onChange={(event) => updateField("batch_id", event.target.value)}
              className="input-shell"
              placeholder={t("createBatch.batchIdPlaceholder")}
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-black/80">{t("createBatch.cropName")}</span>
            <input
              required
              value={form.crop_name}
              onChange={(event) => updateField("crop_name", event.target.value)}
              className="input-shell"
              placeholder={t("createBatch.cropNamePlaceholder")}
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-black/80">{t("createBatch.farmerName")}</span>
            <input
              required
              value={form.farmer_name}
              onChange={(event) => updateField("farmer_name", event.target.value)}
              className="input-shell"
              placeholder={t("createBatch.farmerNamePlaceholder")}
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-black/80">{t("createBatch.farmerPhone")}</span>
            <input
              value={form.farmer_phone}
              onChange={(event) => updateField("farmer_phone", event.target.value)}
              className="input-shell"
              placeholder={t("createBatch.farmerPhonePlaceholder")}
            />
          </label>

          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-medium text-black/80">{t("createBatch.farmLocation")}</span>
            <input
              required
              value={form.farm_location}
              onChange={(event) => updateField("farm_location", event.target.value)}
              className="input-shell"
              placeholder={t("createBatch.farmLocationPlaceholder")}
            />
          </label>

          <label className="md:col-span-2">
            <div className="flex items-center justify-between gap-4 rounded-[22px] border border-black/10 bg-black/[0.03] px-4 py-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-black/85">{t("createBatch.identityTitle")}</p>
                <p className="text-sm text-black/60">{t("createBatch.identityDesc")}</p>
              </div>
              <button
                type="button"
                onClick={() => updateField("farmer_verified", !form.farmer_verified)}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition duration-300 ${
                  form.farmer_verified
                    ? "border-finca-emerald/35 bg-finca-emerald/10 text-black"
                    : "border-black/10 bg-white text-black/70"
                }`}
              >
                <BadgeCheck className="h-4 w-4" />
                {form.farmer_verified ? t("createBatch.verifiedFarmer") : t("createBatch.unverifiedSource")}
              </button>
            </div>
          </label>
        </div>

        {status ? (
          <div
            className={`rounded-2xl border p-4 text-sm ${
              status.tone === "success"
                ? "border-finca-emerald/30 bg-finca-emerald/10 text-finca-mist"
                : "border-finca-ember/30 bg-finca-ember/10 text-finca-mist"
            }`}
          >
            {status.message}
          </div>
        ) : null}

        {!configState.hasApi ? (
          <div className="rounded-2xl border border-finca-gold/25 bg-finca-gold/10 p-4 text-sm text-finca-gold">
            {t("createBatch.warningApi")}
          </div>
        ) : null}

        {!configState.hasSupabase ? (
          <div className="rounded-2xl border border-finca-gold/25 bg-finca-gold/10 p-4 text-sm text-finca-gold">
            {t("createBatch.warningSupabase")}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isPending || !configState.hasApi || !configState.hasSupabase}
          className="button-primary gap-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? t("createBatch.submitting") : t("createBatch.submit")}
          <ArrowRight className="h-4 w-4" />
        </button>
      </form>

      {!isSimpleMode ? (
        <div className="glass-panel flex flex-col justify-between gap-6 p-6 lg:p-8">
          <div className="space-y-4">
            <p className="text-sm uppercase tracking-[0.28em] text-finca-mint/70">{t("createBatch.nextTitle")}</p>
            <div className="rounded-[26px] border border-black/10 bg-black/[0.03] p-5">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-black/10 bg-black/[0.03] text-finca-mint">
                <DatabaseZap className="h-5 w-5" />
              </div>
              <h3 className="text-xl font-semibold text-black">{t("createBatch.step1Title")}</h3>
              <p className="mt-3 text-sm leading-7 text-black/68">{t("createBatch.step1Desc")}</p>
            </div>

            <div className="rounded-[26px] border border-black/10 bg-black/[0.03] p-5">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-black/10 bg-black/[0.03] text-finca-lime">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h3 className="text-xl font-semibold text-black">{t("createBatch.step2Title")}</h3>
              <p className="mt-3 text-sm leading-7 text-black/68">{t("createBatch.step2Desc")}</p>
            </div>
          </div>

          <div className="rounded-[26px] border border-black/10 bg-[linear-gradient(135deg,rgba(140,245,211,0.1),rgba(255,255,255,0.02))] p-5">
            <p className="text-xs uppercase tracking-[0.28em] text-finca-mint/75">{t("createBatch.trustPrinciple")}</p>
            <p className="mt-3 text-sm leading-7 text-black/75">{t("createBatch.trustDesc")}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
