import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Blocks, Leaf, MapPin, UserCircle2 } from "lucide-react";

import { ChainExplorer } from "@/components/chain/chain-explorer";
import { getBatchChain } from "@/lib/data";

export async function generateMetadata({
  params
}: {
  params: { batchId: string };
}): Promise<Metadata> {
  return {
    title: `Batch ${params.batchId}`
  };
}

export default async function BatchDetailPage({
  params,
  searchParams
}: {
  params: { batchId: string };
  searchParams?: { created?: string; pending?: string };
}) {
  const chain = await getBatchChain(params.batchId);
  const showPendingState = searchParams?.created === "1" || searchParams?.pending === "1";

  if (!chain) {
    if (showPendingState) {
      return (
        <div className="section-shell py-14 sm:py-16">
          <div className="glass-stage p-3 sm:p-4 lg:p-5">
            <div className="glass-panel max-w-4xl space-y-6 p-6 lg:p-8">
              <div className="space-y-3">
                <p className="section-heading-eyebrow">Batch submitted</p>
                <h1 className="text-4xl font-semibold text-black sm:text-5xl">This chain is still syncing into view.</h1>
                <p className="max-w-3xl text-lg leading-8 text-black/70">
                  The trust engine accepted batch <span className="font-mono text-base text-black">{params.batchId}</span>,
                  but the connected chain explorer cannot read it yet.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-[24px] border border-black/10 bg-black/[0.03] p-5">
                  <p className="text-xs uppercase tracking-[0.24em] text-black/45">What this means</p>
                  <p className="mt-3 text-sm leading-7 text-black/68">
                    Creation reached the backend, but the shared data store has not reflected the new chain yet.
                  </p>
                </div>
                <div className="rounded-[24px] border border-black/10 bg-black/[0.03] p-5">
                  <p className="text-xs uppercase tracking-[0.24em] text-black/45">Most likely cause</p>
                  <p className="mt-3 text-sm leading-7 text-black/68">
                    The backend may still be syncing, or it may be writing to a different Supabase project than this frontend reads from.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link href={`/batches/${params.batchId}?created=1`} className="button-primary gap-2">
                  Retry this chain
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/create-batch" className="button-secondary">
                  Create another batch
                </Link>
                <Link href="/dashboard" className="button-secondary">
                  Return to dashboard
                </Link>
              </div>
            </div>
          </div>
        </div>
      );
    }

    notFound();
  }

  return (
    <div className="section-shell py-14 sm:py-16">
      <div className="glass-stage space-y-8 p-3 sm:p-4 lg:p-5">
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="glass-panel p-6 lg:p-8">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-finca-lime/25 bg-finca-lime/10 px-3 py-1 text-xs uppercase tracking-[0.28em] text-finca-lime">
                {chain.batch_id}
              </span>
              <span className="rounded-full border border-black/10 bg-black/[0.03] px-3 py-1 text-xs uppercase tracking-[0.28em] text-black/55">
                {chain.blocks.length} blocks
              </span>
            </div>

            <h1 className="mt-5 text-4xl font-semibold text-black sm:text-5xl">{chain.crop_name}</h1>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-black/70">
              Trace the verified journey of this agricultural batch from its genesis block through every recorded supply chain event.
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-[24px] border border-black/10 bg-black/[0.03] p-5">
                <div className="mb-3 flex items-center gap-2 text-black/80">
                  <UserCircle2 className="h-4 w-4 text-finca-mint" />
                  Farmer
                </div>
                <p className="text-lg font-semibold text-black">{chain.farmer_name}</p>
              </div>
              <div className="rounded-[24px] border border-black/10 bg-black/[0.03] p-5">
                <div className="mb-3 flex items-center gap-2 text-black/80">
                  <MapPin className="h-4 w-4 text-finca-gold" />
                  Origin
                </div>
                <p className="text-lg font-semibold text-black">{chain.farm_location}</p>
              </div>
              <div className="rounded-[24px] border border-black/10 bg-black/[0.03] p-5">
                <div className="mb-3 flex items-center gap-2 text-black/80">
                  <Leaf className="h-4 w-4 text-finca-emerald" />
                  Latest block
                </div>
                <p className="text-lg font-semibold text-black">
                  {chain.blocks.at(-1)?.event_type ? chain.blocks.at(-1)?.event_type.replace(/_/g, " ") : "Genesis"}
                </p>
              </div>
            </div>
          </div>

          <div className="glass-panel flex flex-col justify-between p-6 lg:p-8">
            <div>
              <p className="section-heading-eyebrow">Actions</p>
              <h2 className="mt-4 text-3xl font-semibold text-black">Continue or verify this chain.</h2>
              <p className="mt-4 text-sm leading-7 text-black/68">
                Append the next custody event, or run an integrity check to confirm that the chain still holds.
              </p>
            </div>

            <div className="mt-6 space-y-3">
              <Link href={`/add-event?batchId=${chain.batch_id}`} className="button-primary w-full justify-center gap-2">
                Add event
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/verify" className="button-secondary w-full justify-center gap-2">
                Validate chain
                <Blocks className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>

        <ChainExplorer batch={chain} blocks={chain.blocks} />
      </div>
    </div>
  );
}
