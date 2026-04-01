import Link from "next/link";
import { ArrowRight, Blocks, Clock3, MapPin, Sprout, UserCircle2 } from "lucide-react";

import { EmptyState } from "@/components/state/empty-state";
import { formatDateTime, toTitleCase } from "@/lib/utils";
import type { BatchSummary } from "@/lib/types";

interface BatchGridProps {
  batches: BatchSummary[];
}

export function BatchGrid({ batches }: BatchGridProps) {
  if (batches.length === 0) {
    return (
      <EmptyState
        title="No agricultural batches have been registered yet."
        description="Create the first Finca batch to mint a genesis block, then start adding supply chain events from harvest to shelf."
        actionHref="/create-batch"
        actionLabel="Create first batch"
      />
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      {batches.map((batch) => {
        const previewDots = Math.max(2, Math.min(batch.block_count || 0, 5));

        return (
          <Link
            key={batch.batch_id}
            href={`/batches/${batch.batch_id}`}
            className="group glass-panel flex flex-col gap-6 p-6 transition duration-300 hover:-translate-y-1 hover:border-finca-mint/30"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-finca-lime/25 bg-finca-lime/10 px-3 py-1 text-xs uppercase tracking-[0.28em] text-finca-lime">
                    {batch.batch_id}
                  </span>
                  <span className="rounded-full border border-black/10 bg-black/[0.03] px-3 py-1 text-xs uppercase tracking-[0.24em] text-black/55">
                    {batch.block_count} blocks
                  </span>
                </div>
                <h3 className="text-2xl font-semibold text-black">{batch.crop_name}</h3>
                <p className="text-sm text-black/65">
                  Blockchain-backed origin record for {batch.farmer_name}
                </p>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-black/10 bg-black/[0.03] text-finca-mint transition duration-300 group-hover:shadow-glow">
                <ArrowRight className="h-5 w-5" />
              </div>
            </div>

            <div className="grid gap-3 text-sm text-black/70 sm:grid-cols-3">
              <div className="rounded-2xl border border-black/10 bg-black/[0.03] p-4">
                <div className="mb-2 flex items-center gap-2 text-black/45">
                  <UserCircle2 className="h-4 w-4" />
                  Farmer
                </div>
                <p className="font-medium text-black">{batch.farmer_name}</p>
              </div>
              <div className="rounded-2xl border border-black/10 bg-black/[0.03] p-4">
                <div className="mb-2 flex items-center gap-2 text-black/45">
                  <MapPin className="h-4 w-4" />
                  Origin
                </div>
                <p className="font-medium text-black">{batch.farm_location}</p>
              </div>
              <div className="rounded-2xl border border-black/10 bg-black/[0.03] p-4">
                <div className="mb-2 flex items-center gap-2 text-black/45">
                  <Clock3 className="h-4 w-4" />
                  Latest
                </div>
                <p className="font-medium text-black">
                  {batch.last_timestamp ? formatDateTime(batch.last_timestamp) : "Genesis pending"}
                </p>
              </div>
            </div>

            <div className="rounded-[26px] border border-black/10 bg-black/[0.03] p-5">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-black/45">Chain preview</p>
                  <p className="mt-2 text-sm text-black/70">
                    {batch.last_event_type ? toTitleCase(batch.last_event_type) : "Genesis block waiting"}
                  </p>
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

              <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.24em] text-black/50">
                <span className="flex items-center gap-2">
                  <Sprout className="h-4 w-4" />
                  Origin verified visually
                </span>
                <span className="flex items-center gap-2">
                  <Blocks className="h-4 w-4" />
                  Chain displayed block-by-block
                </span>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
