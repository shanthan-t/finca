"use client";

import { BadgeCheck, Phone, ShieldAlert, UserCircle2 } from "lucide-react";

import { useLanguage } from "@/components/providers/language-provider";
import { cn } from "@/lib/utils";
import type { Batch } from "@/lib/types";

interface FarmerIdentityCardProps {
  batch: Batch;
}

export function FarmerIdentityCard({ batch }: FarmerIdentityCardProps) {
  const { t } = useLanguage();
  const isVerified = Boolean(batch.farmer_verified);

  return (
    <div className="glass-panel p-6 lg:p-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.28em] text-finca-mint/70">{t("identity.eyebrow")}</p>
          <h3 className="mt-3 text-2xl font-semibold text-black">{t("identity.title")}</h3>
          <p className="mt-3 text-sm leading-7 text-black/65">{t("identity.description")}</p>
        </div>
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-2xl border bg-black/[0.03]",
            isVerified ? "border-finca-emerald/35 text-finca-emerald" : "border-finca-ember/35 text-finca-ember"
          )}
        >
          {isVerified ? <BadgeCheck className="h-5 w-5" /> : <ShieldAlert className="h-5 w-5" />}
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-[22px] border border-black/10 bg-black/[0.03] p-4">
          <div className="mb-2 flex items-center gap-2 text-black/50">
            <UserCircle2 className="h-4 w-4" />
            {t("identity.farmerLabel")}
          </div>
          <p className="text-base font-semibold text-black">{batch.farmer_name}</p>
        </div>

        <div className="rounded-[22px] border border-black/10 bg-black/[0.03] p-4">
          <div className="mb-2 flex items-center gap-2 text-black/50">
            <Phone className="h-4 w-4" />
            {t("identity.phoneLabel")}
          </div>
          <p className="text-base font-semibold text-black">{batch.farmer_phone?.trim() || t("identity.noPhone")}</p>
        </div>
      </div>

      <div
        className={cn(
          "mt-4 rounded-[22px] border p-4",
          isVerified
            ? "border-finca-emerald/35 bg-finca-emerald/10"
            : "border-finca-ember/35 bg-finca-ember/10"
        )}
      >
        <p className="text-xs uppercase tracking-[0.24em] text-black/50">{t("identity.statusLabel")}</p>
        <p className="mt-2 text-lg font-semibold text-black">
          {isVerified ? t("createBatch.verifiedFarmer") : t("createBatch.unverifiedSource")}
        </p>
        <p className="mt-2 text-sm text-black/70">
          {isVerified ? t("identity.verifiedDesc") : t("identity.unverifiedDesc")}
        </p>
      </div>
    </div>
  );
}
