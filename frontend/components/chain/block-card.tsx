"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Clock3, Hash, MapPin } from "lucide-react";

import { useLanguage } from "@/components/providers/language-provider";
import { cn, formatDateTime, getBlockHeadline, shortHash, toTitleCase } from "@/lib/utils";
import type { Block } from "@/lib/types";

interface BlockCardProps {
  block: Block;
  isActive: boolean;
  isExpanded: boolean;
  compromised?: boolean;
  onSelect: () => void;
  onToggle: () => void;
}

export function BlockCard({
  block,
  isActive,
  isExpanded,
  compromised = false,
  onSelect,
  onToggle
}: BlockCardProps) {
  const { t, language } = useLanguage();
  const entries = Object.entries(block.data ?? {});

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-[28px] border border-black/10 bg-black/[0.045] p-5 transition duration-300",
        isActive && "border-finca-mint/40 bg-black/[0.04] shadow-glow",
        compromised && "border-finca-ember/35 bg-finca-ember/5"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <button type="button" onClick={onSelect} className="flex-1 space-y-4 text-left">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-black/10 bg-black/[0.03] px-3 py-1 text-xs uppercase tracking-[0.24em] text-black/55">
              {t("blockCard.index")} {block.index}
            </span>
            <span className="rounded-full border border-black/10 bg-black/[0.03] px-3 py-1 text-xs uppercase tracking-[0.24em] text-finca-mint">
              {getBlockHeadline(block, t)}
            </span>
          </div>

          <div className="grid gap-3 text-sm text-black/65 sm:grid-cols-2">
            <div className="flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-black/45" />
              <span>{formatDateTime(block.timestamp, language, t)}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-black/45" />
              <span>{typeof block.data.location === "string" ? block.data.location : t("blockCard.locationLogged")}</span>
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onToggle();
          }}
          className="flex h-11 w-11 flex-none items-center justify-center rounded-2xl border border-black/10 bg-black/[0.03] text-black/70 transition duration-300 hover:text-black"
          aria-label={isExpanded ? t("blockCard.collapse") : t("blockCard.expand")}
        >
          <ChevronDown className={cn("h-5 w-5 transition duration-300", isExpanded && "rotate-180")} />
        </button>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="min-w-0 rounded-2xl border border-black/10 bg-black/[0.045] p-4">
          <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-black/45">
            <Hash className="h-4 w-4" />
            {t("blockCard.currentHash")}
          </div>
          <p
            title={block.hash}
            className="max-w-full break-all font-mono text-[11px] leading-5 text-black/75 [overflow-wrap:anywhere]"
          >
            {shortHash(block.hash, 16, t)}
          </p>
        </div>
        <div className="min-w-0 rounded-2xl border border-black/10 bg-black/[0.045] p-4">
          <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-black/45">
            <Hash className="h-4 w-4" />
            {t("blockCard.previousHash")}
          </div>
          <p
            title={block.previous_hash}
            className="max-w-full break-all font-mono text-[11px] leading-5 text-black/75 [overflow-wrap:anywhere]"
          >
            {shortHash(block.previous_hash, 16, t)}
          </p>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {isExpanded ? (
          <motion.div
            key="details"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28 }}
            className="overflow-hidden"
          >
            <div className="mt-5 border-t border-black/10 pt-5">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-black/45">{t("blockCard.blockData")}</p>
                  <p className="mt-2 text-sm text-black/65">{t("blockCard.blockDataDesc")}</p>
                </div>
                <span className="rounded-full border border-black/10 bg-black/[0.03] px-3 py-1 text-xs uppercase tracking-[0.24em] text-black/55">
                  {t("blockCard.fields", { count: entries.length })}
                </span>
              </div>

              {entries.length > 0 ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {entries.map(([key, value]) => (
                    <div key={key} className="rounded-2xl border border-black/10 bg-black/[0.045] p-4">
                      <p className="text-xs uppercase tracking-[0.24em] text-black/45">{toTitleCase(key)}</p>
                      <p className="mt-2 break-words text-sm leading-7 text-black/75">
                        {typeof value === "object" ? JSON.stringify(value) : String(value)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-black/10 bg-black/[0.03] p-4 text-sm text-black/55">
                  {t("blockCard.noFields")}
                </div>
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}
