import Link from "next/link";
import { ArrowRight, Bot, DatabaseZap, Search, ShieldCheck, Sprout } from "lucide-react";

export default function LandingPage() {
  const getStartedFeatures = [
    {
      title: "Farmer Workspace",
      description: "Log your harvests and record origin locations with cryptographic proofs.",
      icon: Sprout,
      href: "/farm",
      color: "text-finca-emerald"
    },
    {
      title: "Supply Chain Actions",
      description: "Add lifecycle events, transit logs, and processing steps directly on-chain.",
      icon: DatabaseZap,
      href: "/advanced",
      color: "text-blue-500"
    },
    {
      title: "Crop Explorer",
      description: "Search the global namespace to verify batch histories and compliance.",
      icon: Search,
      href: "/dashboard",
      color: "text-amber-500"
    },
    {
      title: "AI Assistant",
      description: "Query origin, test verification status, or validate batches via natural language.",
      icon: Bot,
      href: "/assistant",
      color: "text-purple-500"
    }
  ];

  return (
    <div className="pb-24">
      {/* Hero Section */}
      <section className="section-shell pt-16 sm:pt-24 lg:pt-32">
        <div className="glass-stage relative overflow-hidden p-8 sm:p-12 lg:p-16">
          <div className="absolute -left-32 top-0 h-96 w-96 rounded-full bg-finca-emerald/5 blur-3xl" />
          <div className="absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-blue-500/5 blur-3xl" />
          
          <div className="relative mx-auto max-w-4xl text-center">
            <div className="mx-auto mb-8 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/72 px-4 py-2 text-xs uppercase tracking-[0.28em] text-black/70 shadow-[0_10px_30px_rgba(148,163,184,0.12)]">
              <ShieldCheck className="h-4 w-4" />
              <span>Verifiable Agriculture</span>
            </div>
            
            <h1 className="font-display text-5xl font-semibold leading-tight text-black sm:text-6xl lg:text-7xl">
              From Seed to Market, <br className="hidden sm:block" />
              <span className="text-black/50">Built on Trust.</span>
            </h1>
            
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-black/70">
              Finca tracks every harvest, logging origin records, supply chain movement, and compliance data into a tamper-proof system — bringing unbreakable trust to modern agriculture.
            </p>
            
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link href="/farm" className="button-primary group gap-2 text-base px-8 py-4">
                Enter Workspace
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
              <Link href="/assistant" className="button-secondary gap-2 text-base px-8 py-4">
                <Bot className="h-4 w-4" />
                Ask Finca AI
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Modules Grid Section */}
      <section className="section-shell mt-20 lg:mt-32">
        <div className="mb-10 text-center">
          <h2 className="font-display text-3xl font-semibold text-black">Explore Finca</h2>
          <p className="mt-3 text-black/60">Navigate the core modules designed for farmers, operators, and buyers.</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {getStartedFeatures.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Link
                key={feature.title}
                href={feature.href}
                className="glass-panel group relative overflow-hidden p-6 transition-all duration-500 hover:-translate-y-1 hover:shadow-glow"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-black/10 bg-black/[0.02] transition-colors duration-300 group-hover:bg-white group-hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
                  <Icon className={`h-6 w-6 ${feature.color}`} />
                </div>
                
                <h3 className="mb-2 text-lg font-semibold text-black">{feature.title}</h3>
                <p className="text-sm leading-6 text-black/65">{feature.description}</p>
                
                <div className="mt-6 flex items-center gap-2 text-sm font-medium text-black/40 transition-colors duration-300 group-hover:text-black">
                  <span>Open module</span>
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
