"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, DatabaseZap, ShieldCheck } from "lucide-react";

import { createBatch, extractReturnedBlock } from "@/lib/api";
import { configState } from "@/lib/env";
import { persistBatchAndGenesis } from "@/lib/persistence";

function generateBatchId() {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const serial = Math.floor(100 + Math.random() * 900);
  return `FINCA-${stamp}-${serial}`;
}

export function CreateBatchForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [form, setForm] = useState({
    batch_id: generateBatchId(),
    crop_name: "Arabica Coffee",
    farmer_name: "Lucia Reyes",
    farm_location: "Huehuetenango, Guatemala"
  });

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(null);

    startTransition(async () => {
      try {
        const response = await createBatch(form);
        const batchId = form.batch_id;
        const block = extractReturnedBlock(response, batchId);

        if (!block) {
          throw new Error("The trust engine did not return a usable genesis block.");
        }

        await persistBatchAndGenesis(
          {
            ...form,
            created_at: block.timestamp
          },
          block
        );

        setStatus({
          tone: "success",
          message: response.message ?? "Genesis block created and stored successfully."
        });
        router.push(`/batches/${batchId}`);
        router.refresh();
      } catch (error) {
        setStatus({
          tone: "error",
          message: error instanceof Error ? error.message : "Unable to create the batch."
        });
      }
    });
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[0.98fr_1.02fr]">
      <form onSubmit={handleSubmit} className="glass-panel space-y-6 p-6 lg:p-8">
        <div className="space-y-3">
          <p className="text-sm uppercase tracking-[0.28em] text-finca-mint/70">Create batch</p>
          <h2 className="text-3xl font-semibold text-black">Register a new agricultural origin chain.</h2>
          <p className="max-w-2xl text-sm leading-7 text-black/68">
            Start a trusted journey by recording the batch at its true point of origin.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-medium text-black/80">Batch ID</span>
            <input
              required
              value={form.batch_id}
              onChange={(event) => updateField("batch_id", event.target.value)}
              className="input-shell"
              placeholder="FINCA-20260401-101"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-black/80">Crop name</span>
            <input
              required
              value={form.crop_name}
              onChange={(event) => updateField("crop_name", event.target.value)}
              className="input-shell"
              placeholder="Arabica Coffee"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-black/80">Farmer name</span>
            <input
              required
              value={form.farmer_name}
              onChange={(event) => updateField("farmer_name", event.target.value)}
              className="input-shell"
              placeholder="Lucia Reyes"
            />
          </label>

          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-medium text-black/80">Farm location</span>
            <input
              required
              value={form.farm_location}
              onChange={(event) => updateField("farm_location", event.target.value)}
              className="input-shell"
              placeholder="Huehuetenango, Guatemala"
            />
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
            Configure `NEXT_PUBLIC_API_URL` before submitting so trusted actions can be completed.
          </div>
        ) : null}

        {!configState.hasSupabase ? (
          <div className="rounded-2xl border border-finca-gold/25 bg-finca-gold/10 p-4 text-sm text-finca-gold">
            Configure public Supabase access because this frontend stores returned chain records there.
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isPending || !configState.hasApi || !configState.hasSupabase}
          className="button-primary gap-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Creating genesis block..." : "Create batch"}
          <ArrowRight className="h-4 w-4" />
        </button>
      </form>

      <div className="glass-panel flex flex-col justify-between gap-6 p-6 lg:p-8">
        <div className="space-y-4">
          <p className="text-sm uppercase tracking-[0.28em] text-finca-mint/70">What happens next</p>
          <div className="rounded-[26px] border border-black/10 bg-black/[0.03] p-5">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-black/10 bg-black/[0.03] text-finca-mint">
              <DatabaseZap className="h-5 w-5" />
            </div>
            <h3 className="text-xl font-semibold text-black">1. Origin is locked in</h3>
            <p className="mt-3 text-sm leading-7 text-black/68">
              The batch begins with a trusted first record tied to the farmer, crop, and source location.
            </p>
          </div>

          <div className="rounded-[26px] border border-black/10 bg-black/[0.03] p-5">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-black/10 bg-black/[0.03] text-finca-lime">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h3 className="text-xl font-semibold text-black">2. Trust grows with each step</h3>
            <p className="mt-3 text-sm leading-7 text-black/68">
              That first record becomes the anchor for every later handoff, movement, and verification.
            </p>
          </div>
        </div>

        <div className="rounded-[26px] border border-black/10 bg-[linear-gradient(135deg,rgba(140,245,211,0.1),rgba(255,255,255,0.02))] p-5">
          <p className="text-xs uppercase tracking-[0.28em] text-finca-mint/75">Trust principle</p>
          <p className="mt-3 text-sm leading-7 text-black/75">
            Each batch carries its own verifiable journey, making origin and authenticity easier to trust.
          </p>
        </div>
      </div>
    </div>
  );
}
