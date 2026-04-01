"use client";

import { useLayoutEffect, useRef } from "react";
import { Blocks, ShieldCheck, Sprout, Store, Truck, Warehouse } from "lucide-react";
import gsap from "gsap";

import { cn } from "@/lib/utils";

const steps = [
  { title: "Farm", subtitle: "Harvest recorded", icon: Sprout },
  { title: "Processing", subtitle: "Quality events logged", icon: Warehouse },
  { title: "Transit", subtitle: "Movement anchored", icon: Truck },
  { title: "Retail", subtitle: "Shelf handoff tracked", icon: Store },
  { title: "Trust", subtitle: "Integrity verified", icon: ShieldCheck }
];

interface FlowVisualizerProps {
  className?: string;
}

export function FlowVisualizer({ className }: FlowVisualizerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);
  const tokenRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;

    if (!root) {
      return undefined;
    }

    let tokenTween: gsap.core.Tween | null = null;

    const animateToken = () => {
      const token = tokenRef.current;

      if (!token) {
        return;
      }

      const distance = Math.max((lineRef.current?.offsetWidth ?? 0) - 18, 0);

      tokenTween?.kill();
      gsap.set(token, { x: 0 });
      tokenTween = gsap.to(token, {
        x: distance,
        duration: 5.2,
        repeat: -1,
        ease: "none"
      });
    };

    const context = gsap.context(() => {
      const nodes = root.querySelectorAll<HTMLElement>("[data-flow-node]");
      const pulses = root.querySelectorAll<HTMLElement>("[data-flow-pulse]");
      const lineFill = root.querySelector<HTMLElement>("[data-flow-fill]");

      if (nodes.length > 0) {
        gsap.fromTo(
          nodes,
          { y: 32, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.85, stagger: 0.12, ease: "power3.out" }
        );
      }

      if (lineFill) {
        gsap.fromTo(
          lineFill,
          { scaleX: 0, transformOrigin: "left center" },
          { scaleX: 1, duration: 3.6, repeat: -1, repeatDelay: 0.4, ease: "power2.inOut" }
        );
      }

      if (pulses.length > 0) {
        gsap.to(pulses, {
          scale: 1.16,
          opacity: 1,
          duration: 1.4,
          stagger: 0.18,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut"
        });
      }

      animateToken();
    }, rootRef);

    window.addEventListener("resize", animateToken);

    return () => {
      tokenTween?.kill();
      window.removeEventListener("resize", animateToken);
      context.revert();
    };
  }, []);

  return (
    <div className={cn("glass-panel overflow-hidden p-6 sm:p-8", className)} ref={rootRef}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.28em] text-finca-mint/70">Trusted movement</p>
          <h3 className="mt-3 text-2xl font-semibold text-black">Every custody handoff is visible.</h3>
        </div>
        <span className="rounded-full border border-black/10 bg-black/[0.03] px-3 py-1 text-xs uppercase tracking-[0.28em] text-black/60">
          Journey flow
        </span>
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="min-w-[820px]">
          <div className="relative mb-8 rounded-[34px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(255,255,255,0.7))] px-6 pb-8 pt-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_18px_55px_rgba(148,163,184,0.16)]">
            <div className="absolute inset-x-6 top-4 h-24 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.95),transparent_68%)] blur-2xl" />
            <div className="pointer-events-none absolute inset-x-6 top-[58%] -translate-y-1/2">
              <div className="rounded-full border border-black/[0.08] bg-white/78 px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)] backdrop-blur-xl">
                <div ref={lineRef} className="relative h-2">
                  <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-black/[0.08]" />
                  <div
                    data-flow-fill
                    className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-black/15 via-black/75 to-black/15"
                  />
                  <div
                    ref={tokenRef}
                    className="absolute left-0 top-1/2 h-[18px] w-[18px] -translate-y-1/2 rounded-full border border-black/15 bg-white shadow-[0_0_0_6px_rgba(255,255,255,0.72),0_10px_28px_rgba(15,23,42,0.15)]"
                  />
                </div>
              </div>
            </div>

            <div className="relative grid grid-cols-5 gap-4">
              {steps.map((step) => {
                const Icon = step.icon;

                return (
                  <div key={step.title} data-flow-node className="relative pb-12">
                    <div className="pointer-events-none absolute bottom-4 left-1/2 h-10 w-px -translate-x-1/2 bg-gradient-to-b from-black/14 to-transparent" />
                    <div
                      data-flow-pulse
                      className="absolute bottom-2 left-1/2 h-4 w-4 -translate-x-1/2 rounded-full border border-black/15 bg-white opacity-80 shadow-[0_0_0_6px_rgba(255,255,255,0.82),0_8px_22px_rgba(15,23,42,0.12)]"
                    />
                    <div className="rounded-[26px] border border-black/[0.08] bg-white p-5 shadow-[0_14px_38px_rgba(15,23,42,0.08)]">
                      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-black/10 bg-black/[0.03] text-black">
                        <Icon className="h-5 w-5" />
                      </div>
                      <p className="text-lg font-semibold text-black">{step.title}</p>
                      <p className="mt-2 text-sm leading-6 text-black/65">{step.subtitle}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-[26px] border border-black/10 bg-black/[0.03] p-5">
            <div className="flex flex-wrap items-center gap-3 text-sm text-black/65">
              <span className="flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-1.5 shadow-[0_8px_22px_rgba(15,23,42,0.05)]">
                <Blocks className="h-4 w-4 text-black" />
                Verified chain records
              </span>
              <span className="rounded-full border border-black/10 bg-white px-3 py-1.5 shadow-[0_8px_22px_rgba(15,23,42,0.05)]">
                Farm to shelf visibility
              </span>
              <span className="rounded-full border border-black/10 bg-white px-3 py-1.5 shadow-[0_8px_22px_rgba(15,23,42,0.05)]">
                Story view + chain view stay aligned
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
