"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CirclePlus, Link2, Loader2, MapPin, PackageCheck, ScanSearch, Trash2 } from "lucide-react";

import { useLanguage } from "@/components/providers/language-provider";
import { createBlock, extractReturnedBlock } from "@/lib/api";
import { configState } from "@/lib/env";
import { persistBlock } from "@/lib/persistence";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { formatDateTime, shortHash } from "@/lib/utils";
import type { Batch, Block, BlockData } from "@/lib/types";

const eventOptions = [
  "harvested",
  "processed",
  "quality_checked",
  "packaged",
  "stored",
  "shipped",
  "received",
  "shelf_stocked"
];

const metadataOptions = [
  { key: "vehicle_id" },
  { key: "humidity" },
  { key: "condition" },
  { key: "warehouse" },
  { key: "destination" },
  { key: "carrier" },
  { key: "container_id" },
  { key: "market" },
  { key: "certification" },
  { key: "lot_size" }
] as const;

const suggestedMetadataByEvent: Record<string, Array<(typeof metadataOptions)[number]["key"]>> = {
  harvested: ["condition", "lot_size", "certification"],
  processed: ["condition", "warehouse", "lot_size"],
  quality_checked: ["condition", "certification", "humidity"],
  packaged: ["container_id", "condition", "lot_size"],
  stored: ["warehouse", "humidity", "condition"],
  shipped: ["vehicle_id", "carrier", "destination"],
  received: ["destination", "condition", "warehouse"],
  shelf_stocked: ["market", "condition", "destination"]
};

interface MetadataEntry {
  id: string;
  key: string;
  value: string;
}

function createMetadataEntry(initialKey = ""): MetadataEntry {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    key: initialKey,
    value: ""
  };
}

function getMetadataOption(key: string) {
  return metadataOptions.find((option) => option.key === key) ?? null;
}

interface AddEventFormProps {
  batches: Batch[];
  initialBatchId?: string;
  mode?: "full" | "simple";
}

export function AddEventForm({ batches, initialBatchId, mode = "full" }: AddEventFormProps) {
  const { t, language } = useLanguage();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [selectedBatchId, setSelectedBatchId] = useState(initialBatchId || batches[0]?.batch_id || "");
  const [chainPreview, setChainPreview] = useState<{
    loading: boolean;
    count: number;
    lastBlock: Block | null;
  }>({
    loading: false,
    count: 0,
    lastBlock: null
  });
  const [form, setForm] = useState({
    event_type: "processed",
    actor: "",
    location: "",
    note: "",
    status: "",
    shipment_id: "",
    temperature: ""
  });
  const [metadataEntries, setMetadataEntries] = useState<MetadataEntry[]>([]);
  const isSimpleMode = mode === "simple";

  useEffect(() => {
    let active = true;

    const loadPreview = async () => {
      if (!selectedBatchId || !configState.hasSupabase) {
        if (active) {
          setChainPreview({ loading: false, count: 0, lastBlock: null });
        }
        return;
      }

      const supabase = getSupabaseBrowserClient();

      if (!supabase) {
        if (active) {
          setChainPreview({ loading: false, count: 0, lastBlock: null });
        }
        return;
      }

      if (active) {
        setChainPreview((current) => ({ ...current, loading: true }));
      }

      const { data, error } = await supabase
        .from("blocks")
        .select("*")
        .eq("batch_id", selectedBatchId)
        .order("index", { ascending: true });

      if (!active) {
        return;
      }

      if (error) {
        setChainPreview({ loading: false, count: 0, lastBlock: null });
        setStatus({ tone: "error", message: error.message });
        return;
      }

      setChainPreview({
        loading: false,
        count: data?.length ?? 0,
        lastBlock: data?.at(-1) ?? null
      });
    };

    loadPreview();

    return () => {
      active = false;
    };
  }, [selectedBatchId]);

  const handleInputChange = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const selectedMetadataKeys = metadataEntries.map((entry) => entry.key).filter(Boolean);
  const suggestedMetadataKeys = suggestedMetadataByEvent[form.event_type] ?? [];
  const getEventLabel = (eventType: string) => t(`events.${eventType}`);
  const getMetadataLabel = (key: string) => t(`metadata.${key}`);

  const addMetadataEntry = (preferredKey?: string) => {
    const nextKey =
      preferredKey ??
      metadataOptions.find((option) => !selectedMetadataKeys.includes(option.key))?.key ??
      "";

    setMetadataEntries((current) => [...current, createMetadataEntry(nextKey)]);
  };

  const updateMetadataEntry = (id: string, field: "key" | "value", value: string) => {
    setMetadataEntries((current) =>
      current.map((entry) => (entry.id === id ? { ...entry, [field]: value } : entry))
    );
  };

  const removeMetadataEntry = (id: string) => {
    setMetadataEntries((current) => current.filter((entry) => entry.id !== id));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(null);

    startTransition(async () => {
      try {
        if (!selectedBatchId) {
          throw new Error(t("addEvent.chooseBatchError"));
        }

        const supabase = getSupabaseBrowserClient();

        if (!supabase) {
          throw new Error(t("addEvent.publicAccessError"));
        }

        const { data: lastBlockData, error } = await supabase
          .from("blocks")
          .select("*")
          .eq("batch_id", selectedBatchId)
          .order("index", { ascending: false })
          .limit(1)
          .maybeSingle();

        const lastBlock = lastBlockData as Block | null;

        if (error) {
          throw new Error(error.message);
        }

        if (!lastBlock) {
          throw new Error(t("addEvent.noGenesisError"));
        }

        const incompleteEntry = metadataEntries.find((entry) => !entry.key || !entry.value.trim());

        if (incompleteEntry) {
          throw new Error(t("addEvent.completeOptionalError"));
        }

        const duplicateEntry = metadataEntries.find(
          (entry, index) => metadataEntries.findIndex((candidate) => candidate.key === entry.key) !== index
        );

        if (duplicateEntry) {
          const duplicateLabel = getMetadataOption(duplicateEntry.key)
            ? getMetadataLabel(duplicateEntry.key)
            : t("addEvent.duplicateOptionalDefault");
          throw new Error(t("addEvent.duplicateOptionalError", { label: duplicateLabel }));
        }

        const optionalMetadata = metadataEntries.reduce<BlockData>((accumulator, entry) => {
          if (!entry.key || !entry.value.trim()) {
            return accumulator;
          }

          accumulator[entry.key] = entry.value.trim();
          return accumulator;
        }, {});

        const payloadData: BlockData = {
          ...(form.actor ? { actor: form.actor } : {}),
          ...(form.location ? { location: form.location } : {}),
          ...(form.note ? { note: form.note } : {}),
          ...(form.status ? { status: form.status } : {}),
          ...(form.shipment_id ? { shipment_id: form.shipment_id } : {}),
          ...(form.temperature ? { temperature: form.temperature } : {}),
          ...optionalMetadata
        };

        const response = await createBlock({
          batch_id: selectedBatchId,
          event_type: form.event_type,
          data: payloadData,
          index: lastBlock.index + 1,
          previous_hash: lastBlock.hash
        });

        const returnedBlock = extractReturnedBlock(response, selectedBatchId);

        if (!returnedBlock) {
          throw new Error(t("addEvent.unusableBlockError"));
        }

        await persistBlock(returnedBlock);

        setStatus({ tone: "success", message: t("addEvent.successStored") });
        router.push(`/batches/${selectedBatchId}`);
        router.refresh();
      } catch (error) {
        setStatus({
          tone: "error",
          message: error instanceof Error ? error.message : t("addEvent.unable")
        });
      }
    });
  };

  return (
    <div className={isSimpleMode ? "" : "grid gap-6 xl:grid-cols-[1.08fr_0.92fr]"}>
      <form onSubmit={handleSubmit} className="glass-panel space-y-6 p-6 lg:p-8">
        <div className="space-y-3">
          <p className="text-sm uppercase tracking-[0.28em] text-finca-mint/70">{t("addEvent.eyebrow")}</p>
          <h2 className="text-3xl font-semibold text-black">
            {isSimpleMode ? t("addEvent.titleSimple") : t("addEvent.titleFull")}
          </h2>
          {!isSimpleMode ? (
            <p className="max-w-2xl text-sm leading-7 text-black/68">
              {t("addEvent.description")}
            </p>
          ) : null}
        </div>

        {isSimpleMode ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[20px] border border-black/10 bg-black/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-black/45">{t("addEvent.chainHeight")}</p>
              <p className="mt-2 text-2xl font-semibold text-black">{chainPreview.count}</p>
            </div>
            <div className="rounded-[20px] border border-black/10 bg-black/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-black/45">{t("addEvent.latestEvent")}</p>
              <p className="mt-2 text-sm font-semibold text-black">
                {chainPreview.lastBlock ? getEventLabel(chainPreview.lastBlock.event_type) : t("addEvent.noBlocksFound")}
              </p>
            </div>
            <div className="rounded-[20px] border border-black/10 bg-black/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-black/45">{t("addEvent.lastHash")}</p>
              <p className="mt-2 font-mono text-xs text-black/75">
                {chainPreview.lastBlock ? shortHash(chainPreview.lastBlock.hash, 16, t) : t("common.waiting")}
              </p>
            </div>
          </div>
        ) : null}

        <div className="grid gap-5 md:grid-cols-2">
          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-medium text-black/80">{t("addEvent.batch")}</span>
            <select
              value={selectedBatchId}
              onChange={(event) => setSelectedBatchId(event.target.value)}
              className="input-shell"
            >
              <option value="">{t("addEvent.selectBatch")}</option>
              {batches.map((batch) => (
                <option key={batch.batch_id} value={batch.batch_id}>
                  {batch.batch_id} · {batch.crop_name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-black/80">{t("addEvent.eventType")}</span>
            <select
              value={form.event_type}
              onChange={(event) => handleInputChange("event_type", event.target.value)}
              className="input-shell"
            >
              {eventOptions.map((option) => (
                <option key={option} value={option}>
                  {getEventLabel(option)}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-black/80">{t("addEvent.actor")}</span>
            <input
              value={form.actor}
              onChange={(event) => handleInputChange("actor", event.target.value)}
              className="input-shell"
              placeholder={t("addEvent.actorPlaceholder")}
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-black/80">{t("addEvent.location")}</span>
            <input
              value={form.location}
              onChange={(event) => handleInputChange("location", event.target.value)}
              className="input-shell"
              placeholder={t("addEvent.locationPlaceholder")}
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-black/80">{t("addEvent.status")}</span>
            <input
              value={form.status}
              onChange={(event) => handleInputChange("status", event.target.value)}
              className="input-shell"
              placeholder={t("addEvent.statusPlaceholder")}
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-black/80">{t("addEvent.shipmentId")}</span>
            <input
              value={form.shipment_id}
              onChange={(event) => handleInputChange("shipment_id", event.target.value)}
              className="input-shell"
              placeholder={t("addEvent.shipmentIdPlaceholder")}
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-black/80">{t("addEvent.temperature")}</span>
            <input
              value={form.temperature}
              onChange={(event) => handleInputChange("temperature", event.target.value)}
              className="input-shell"
              placeholder={t("addEvent.temperaturePlaceholder")}
            />
          </label>

          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-medium text-black/80">{t("addEvent.note")}</span>
            <textarea
              value={form.note}
              onChange={(event) => handleInputChange("note", event.target.value)}
              className="input-shell min-h-[120px] resize-y"
              placeholder={t("addEvent.notePlaceholder")}
            />
          </label>

          <div className="space-y-4 md:col-span-2">
            <div className="space-y-2">
              <span className="text-sm font-medium text-black/80">{t("addEvent.optionalDetails")}</span>
              {!isSimpleMode ? (
                <p className="text-sm leading-7 text-black/60">{t("addEvent.optionalDetailsDesc")}</p>
              ) : null}
            </div>

            <div className="rounded-[24px] border border-black/10 bg-black/[0.03] p-4 sm:p-5">
              <div className="flex flex-wrap gap-2">
                {suggestedMetadataKeys
                  .filter((key) => !selectedMetadataKeys.includes(key))
                  .map((key) => {
                    const option = getMetadataOption(key);

                    if (!option) {
                      return null;
                    }

                    return (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => addMetadataEntry(option.key)}
                        className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-2 text-xs font-medium uppercase tracking-[0.2em] text-black transition duration-300 hover:border-black/25 hover:bg-black/[0.03]"
                      >
                        <CirclePlus className="h-3.5 w-3.5" />
                        {getMetadataLabel(option.key)}
                      </button>
                    );
                  })}
              </div>

              {metadataEntries.length > 0 ? (
                <div className="mt-4 space-y-3">
                  {metadataEntries.map((entry) => {
                    const availableOptions = metadataOptions.filter(
                      (option) => option.key === entry.key || !selectedMetadataKeys.includes(option.key)
                    );
                    const selectedOption = getMetadataOption(entry.key);

                    return (
                      <div key={entry.id} className="grid gap-3 md:grid-cols-[0.9fr_1.1fr_auto]">
                        <select
                          value={entry.key}
                          onChange={(event) => updateMetadataEntry(entry.id, "key", event.target.value)}
                          className="input-shell"
                        >
                          <option value="">{t("addEvent.selectDetail")}</option>
                          {availableOptions.map((option) => (
                            <option key={option.key} value={option.key}>
                              {getMetadataLabel(option.key)}
                            </option>
                          ))}
                        </select>

                        <input
                          value={entry.value}
                          onChange={(event) => updateMetadataEntry(entry.id, "value", event.target.value)}
                          className="input-shell"
                          placeholder={selectedOption ? getMetadataLabel(selectedOption.key) : t("addEvent.enterDetail")}
                        />

                        <button
                          type="button"
                          onClick={() => removeMetadataEntry(entry.id)}
                          className="inline-flex items-center justify-center rounded-2xl border border-black/10 bg-white px-4 py-3 text-black transition duration-300 hover:border-black/25 hover:bg-black/[0.03]"
                          aria-label={t("addEvent.removeOptionalDetail")}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-4 rounded-[20px] border border-dashed border-black/10 bg-white/70 p-4 text-sm leading-7 text-black/55">
                  {t("addEvent.noOptionalDetails")}
                </div>
              )}

              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => addMetadataEntry()}
                  className="button-secondary gap-2"
                >
                  <CirclePlus className="h-4 w-4" />
                  {t("addEvent.addOptionalDetail")}
                </button>
              </div>
            </div>
          </div>
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

        {(!configState.hasApi || !configState.hasSupabase) ? (
          <div className="rounded-2xl border border-finca-gold/25 bg-finca-gold/10 p-4 text-sm text-finca-gold">
            {t("addEvent.warningSettings")}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isPending || !configState.hasApi || !configState.hasSupabase}
          className="button-primary gap-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? t("addEvent.appending") : t("addEvent.append")}
          <ArrowRight className="h-4 w-4" />
        </button>
      </form>

      {!isSimpleMode ? (
        <div className="space-y-6">
          <div className="glass-panel p-6 lg:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.28em] text-finca-mint/70">{t("addEvent.currentChain")}</p>
                <h3 className="mt-3 text-2xl font-semibold text-black">
                  {selectedBatchId || t("addEvent.selectBatch")}
                </h3>
              </div>
              {chainPreview.loading ? (
                <Loader2 className="h-5 w-5 animate-spin text-finca-mint" />
              ) : (
                <PackageCheck className="h-5 w-5 text-finca-mint" />
              )}
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-[24px] border border-black/10 bg-black/[0.03] p-5">
                <p className="text-xs uppercase tracking-[0.24em] text-black/45">{t("addEvent.chainHeight")}</p>
                <p className="mt-2 text-3xl font-semibold text-black">{chainPreview.count}</p>
                <p className="mt-2 text-sm text-black/65">{t("addEvent.description")}</p>
              </div>
              <div className="rounded-[24px] border border-black/10 bg-black/[0.03] p-5">
                <p className="text-xs uppercase tracking-[0.24em] text-black/45">{t("addEvent.latestEvent")}</p>
                <p className="mt-2 text-lg font-semibold text-black">
                  {chainPreview.lastBlock ? getEventLabel(chainPreview.lastBlock.event_type) : t("addEvent.noBlocksFound")}
                </p>
                <p className="mt-2 text-sm text-black/65">
                  {chainPreview.lastBlock ? formatDateTime(chainPreview.lastBlock.timestamp, language, t) : t("addEvent.genesisRequired")}
                </p>
              </div>
            </div>

            {chainPreview.lastBlock ? (
              <div className="mt-4 rounded-[24px] border border-black/10 bg-black/[0.03] p-5">
                <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-black/45">
                  <Link2 className="h-4 w-4" />
                  {t("addEvent.lastVerifiedLink")}
                </div>
                <p className="font-mono text-xs leading-7 text-black/75">
                  {shortHash(chainPreview.lastBlock.hash, 22, t)}
                </p>
              </div>
            ) : null}
          </div>

          <div className="glass-panel p-6 lg:p-8">
            <p className="text-sm uppercase tracking-[0.28em] text-finca-mint/70">{t("addEvent.eventDesign")}</p>
            <div className="mt-5 space-y-4">
              <div className="rounded-[24px] border border-black/10 bg-black/[0.03] p-5">
                <div className="mb-3 flex items-center gap-2 text-black/80">
                  <MapPin className="h-4 w-4 text-finca-gold" />
                  {t("addEvent.locationContext")}
                </div>
                <p className="text-sm leading-7 text-black/68">{t("addEvent.locationContextDesc")}</p>
              </div>
              <div className="rounded-[24px] border border-black/10 bg-black/[0.03] p-5">
                <div className="mb-3 flex items-center gap-2 text-black/80">
                  <ScanSearch className="h-4 w-4 text-finca-mint" />
                  {t("addEvent.structuredMetadata")}
                </div>
                <p className="text-sm leading-7 text-black/68">{t("addEvent.structuredMetadataDesc")}</p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
