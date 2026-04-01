import Link from "next/link";
import { ArrowRight, Blocks, DatabaseZap, ShieldCheck, Sparkles, Sprout, Warehouse } from "lucide-react";

import { FlowVisualizer } from "@/components/sections/flow-visualizer";

const problemCards = [
  {
    title: "Farmers lack fair-trade visibility",
    description: "Origin stories are lost as produce changes hands, leaving growers without proof of value."
  },
  {
    title: "Consumers cannot verify provenance",
    description: "Trust collapses when labels are easy to claim but impossible to audit in real time."
  },
  {
    title: "Opaque supply chains invite manipulation",
    description: "Without a tamper-resistant trail, batch histories can be altered long after the product moves."
  }
];

const solutionCards = [
  {
    title: "Independent chain per batch",
    description: "Every agricultural batch gets its own genesis block and linked custody history."
  },
  {
    title: "Dual-view traceability",
    description: "Timeline and blockchain views stay synchronized so people and auditors read the same truth."
  },
  {
    title: "Verification that holds up",
    description: "Each recorded step strengthens trust with a visible, tamper-resistant journey."
  }
];

const shortcutCards = [
  {
    title: "Start origin record",
    description: "Capture crop, farmer, and source details in one trusted first step.",
    href: "/create-batch"
  },
  {
    title: "Continue the journey",
    description: "Add each handoff so the story stays current from farm to shelf.",
    href: "/add-event"
  },
  {
    title: "Check integrity",
    description: "Run validation and see instantly whether trust still holds together.",
    href: "/verify"
  }
];

export default function HomePage() {
  return (
    <div className="pb-24">
      <section className="section-shell pt-16 sm:pt-20 lg:pt-24">
        <div className="glass-stage relative overflow-hidden p-5 sm:p-8 lg:p-10">
          <div className="absolute -right-20 top-8 h-56 w-56 rounded-full bg-white/75 blur-3xl" />
          <div className="absolute bottom-0 left-10 h-52 w-52 rounded-full bg-white/55 blur-3xl" />
          <div className="relative grid items-start gap-10 xl:grid-cols-[0.95fr_1.05fr]">
            <div className="space-y-8">
              <div className="space-y-5">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/72 px-4 py-2 text-xs uppercase tracking-[0.28em] text-black/70 shadow-[0_10px_30px_rgba(148,163,184,0.12)]">
                  <Sparkles className="h-4 w-4" />
                  Trusted agricultural traceability
                </span>
                <h1 className="max-w-4xl text-5xl font-semibold leading-[1.02] text-black sm:text-6xl xl:text-7xl">
                  From Farm to Trust — Verified.
                </h1>
                <p className="max-w-2xl text-lg leading-8 text-black/72">
                  Finca turns each agricultural batch into a visible chain of custody, so farmers, retailers, and consumers can follow authenticity from origin to shelf without guessing.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link href="/create-batch" className="button-primary gap-2">
                  Create a batch
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/dashboard" className="button-secondary">
                  Explore dashboard
                </Link>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {shortcutCards.map((card) => (
                  <Link
                    key={card.href}
                    href={card.href}
                    className="glass-panel group rounded-[24px] p-5 transition duration-300 hover:-translate-y-1 hover:shadow-glow"
                  >
                    <p className="text-xs uppercase tracking-[0.28em] text-black/45">Quick action</p>
                    <h3 className="mt-3 text-xl font-semibold text-black">{card.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-black/65">{card.description}</p>
                    <div className="mt-5 flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-black/50">
                      Open
                      <ArrowRight className="h-4 w-4 transition duration-300 group-hover:translate-x-1" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            <FlowVisualizer />
          </div>
        </div>
      </section>

      <section className="section-shell mt-24">
        <div className="glass-stage p-5 sm:p-8">
          <div className="section-heading">
            <p className="section-heading-eyebrow">Problem statement</p>
            <h2 className="text-4xl font-semibold text-black">Supply chains break trust when the journey is hidden.</h2>
            <p className="text-lg leading-8 text-black/70">
              Finca is built for the exact moment a buyer asks, “Can you prove where this came from?”
            </p>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {problemCards.map((card) => (
              <div key={card.title} className="glass-panel p-6">
                <p className="text-xs uppercase tracking-[0.28em] text-finca-gold/80">Risk</p>
                <h3 className="mt-4 text-2xl font-semibold text-black">{card.title}</h3>
                <p className="mt-4 text-sm leading-7 text-black/68">{card.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-shell mt-24">
        <div className="glass-stage p-5 sm:p-8">
          <div className="grid gap-6 xl:grid-cols-[0.84fr_1.16fr]">
            <div className="glass-panel p-6 lg:p-8">
              <p className="section-heading-eyebrow">Solution</p>
              <h2 className="mt-4 text-4xl font-semibold text-black">Origin proof becomes a product experience.</h2>
              <p className="mt-4 text-lg leading-8 text-black/70">
                Finca makes trust visible with synchronized chain views, verified milestones, and clear integrity feedback.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {solutionCards.map((card) => (
                <div key={card.title} className="glass-panel p-6">
                  <h3 className="text-2xl font-semibold text-black">{card.title}</h3>
                  <p className="mt-4 text-sm leading-7 text-black/68">{card.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section-shell mt-24">
        <div className="glass-stage p-5 sm:p-8">
          <div className="grid gap-6 xl:grid-cols-3">
            <div className="glass-panel p-6 lg:p-8">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-black/10 bg-black/[0.03] text-finca-mint">
                <Sprout className="h-5 w-5" />
              </div>
              <h3 className="text-2xl font-semibold text-black">1. Create a batch</h3>
              <p className="mt-4 text-sm leading-7 text-black/68">
                Record crop, farmer, and origin details to begin a trusted journey from the very first step.
              </p>
            </div>
            <div className="glass-panel p-6 lg:p-8">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-black/10 bg-black/[0.03] text-finca-gold">
                <Warehouse className="h-5 w-5" />
              </div>
              <h3 className="text-2xl font-semibold text-black">2. Append supply chain events</h3>
              <p className="mt-4 text-sm leading-7 text-black/68">
                Each handoff, shipment, and quality check is added as the next verified block in the batch chain.
              </p>
            </div>
            <div className="glass-panel p-6 lg:p-8">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-black/10 bg-black/[0.03] text-finca-emerald">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h3 className="text-2xl font-semibold text-black">3. Validate integrity visually</h3>
              <p className="mt-4 text-sm leading-7 text-black/68">
                Green glow confirms a healthy chain. Red broken links surface tampering the moment validation fails.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section-shell mt-24">
        <div className="glass-stage p-5 sm:p-8">
          <div className="grid gap-8 lg:grid-cols-[1.02fr_0.98fr]">
            <div className="glass-panel p-6 lg:p-8">
              <p className="section-heading-eyebrow">Trust model</p>
              <h2 className="mt-4 text-4xl font-semibold text-black">Confidence people can see at a glance.</h2>
              <p className="mt-4 text-lg leading-8 text-black/70">
                Finca keeps the story simple: where it started, who handled it, where it moved, and whether the journey still holds together.
              </p>
            </div>

            <div className="grid gap-4">
              <div className="glass-panel p-5">
                <div className="mb-3 flex items-center gap-2 text-black">
                  <Blocks className="h-5 w-5 text-finca-mint" />
                  Visible chain history
                </div>
                <p className="text-sm leading-7 text-black/68">
                  Every recorded handoff appears in order so buyers and operators can follow the full path.
                </p>
              </div>
              <div className="glass-panel p-5">
                <div className="mb-3 flex items-center gap-2 text-black">
                  <DatabaseZap className="h-5 w-5 text-finca-gold" />
                  Integrity checks
                </div>
                <p className="text-sm leading-7 text-black/68">
                  Validation confirms whether the journey is still intact or if trust has been broken.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
