"use client";

import { motion } from "framer-motion";
import { Clock3, MapPin, UserCircle2 } from "lucide-react";

import { cn, formatDateTime, getBlockActor, getBlockHeadline, getBlockLocation, getBlockNarrative } from "@/lib/utils";
import type { Batch, Block } from "@/lib/types";

interface TimelineProps {
  batch: Batch;
  blocks: Block[];
  activeIndex: number;
  invalidIndex?: number | null;
  onSelect: (index: number) => void;
}

export function Timeline({ batch, blocks, activeIndex, invalidIndex = null, onSelect }: TimelineProps) {
  return (
    <div className="glass-panel p-6 lg:p-7">
      <div className="mb-6">
        <p className="text-sm uppercase tracking-[0.28em] text-finca-mint/70">Timeline view</p>
        <h3 className="mt-3 text-2xl font-semibold text-black">Human-readable custody trail</h3>
        <p className="mt-3 max-w-xl text-sm leading-7 text-black/65">
          Click any event to synchronize the chain view with the same moment in the journey.
        </p>
      </div>

      <div className="relative pl-7">
        <div className="absolute left-[11px] top-2 h-[calc(100%-1rem)] w-px bg-gradient-to-b from-finca-mint/80 via-black/10 to-transparent" />

        <div className="space-y-4">
          {blocks.map((block, index) => {
            const active = index === activeIndex;
            const compromised = invalidIndex !== null && index >= invalidIndex;

            return (
              <motion.button
                key={`${block.batch_id}-${block.index}`}
                type="button"
                onClick={() => onSelect(index)}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04, duration: 0.45 }}
                whileHover={{ x: 4 }}
                className={cn(
                  "relative block w-full rounded-[26px] border border-black/10 bg-black/[0.03] p-5 text-left transition duration-300",
                  active && "border-finca-mint/40 bg-black/[0.03] shadow-glow",
                  compromised && "border-finca-ember/35 bg-finca-ember/5"
                )}
              >
                <span
                  className={cn(
                    "absolute -left-[24px] top-6 h-5 w-5 rounded-full border border-black/15 bg-white shadow-[0_0_0_4px_rgba(8,18,20,1)]",
                    active && "border-finca-mint bg-finca-mint shadow-[0_0_18px_rgba(140,245,211,0.55)]",
                    compromised && "border-finca-ember bg-finca-ember shadow-[0_0_18px_rgba(255,123,112,0.45)]"
                  )}
                />

                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-full border border-black/10 bg-black/[0.03] px-3 py-1 text-xs uppercase tracking-[0.24em] text-black/55">
                    Block {block.index}
                  </span>
                  <span className="rounded-full border border-black/10 bg-black/[0.03] px-3 py-1 text-xs uppercase tracking-[0.24em] text-finca-lime">
                    {getBlockHeadline(block)}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 text-sm text-black/70 sm:grid-cols-3">
                  <div className="flex items-center gap-2">
                    <UserCircle2 className="h-4 w-4 text-finca-mint" />
                    <span>{getBlockActor(block, batch)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-finca-gold" />
                    <span>{getBlockLocation(block, batch)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock3 className="h-4 w-4 text-black/50" />
                    <span>{formatDateTime(block.timestamp)}</span>
                  </div>
                </div>

                <p className="mt-4 text-sm leading-7 text-black/70">{getBlockNarrative(block)}</p>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
