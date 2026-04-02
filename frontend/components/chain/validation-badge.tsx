"use client";

import { motion } from "framer-motion";
import { Loader2, ShieldAlert, ShieldCheck, ShieldQuestion } from "lucide-react";

import { useLanguage } from "@/components/providers/language-provider";
import { cn } from "@/lib/utils";
import type { ValidationResponse } from "@/lib/types";

interface ValidationBadgeProps {
  validation?: ValidationResponse | null;
  loading?: boolean;
}

export function ValidationBadge({ validation, loading = false }: ValidationBadgeProps) {
  const { t } = useLanguage();
  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0.6 }}
        animate={{ opacity: 1 }}
        className="glass-panel flex items-center gap-3 p-4"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-black/10 bg-black/[0.03] text-finca-gold">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
        <div>
          <p className="text-sm font-semibold text-black">{t("validation.validatingTitle")}</p>
          <p className="text-xs uppercase tracking-[0.24em] text-black/45">{t("validation.validatingSubtitle")}</p>
        </div>
      </motion.div>
    );
  }

  if (!validation) {
    return (
      <div className="glass-panel flex items-center gap-3 p-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-black/10 bg-black/[0.03] text-black/70">
          <ShieldQuestion className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-black">{t("validation.awaitingTitle")}</p>
          <p className="text-xs uppercase tracking-[0.24em] text-black/45">{t("validation.awaitingSubtitle")}</p>
        </div>
      </div>
    );
  }

  const isValid = validation.valid;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={isValid ? { opacity: 1, scale: [1, 1.02, 1] } : { opacity: 1, x: [0, 2, -2, 0] }}
      transition={isValid ? { duration: 2.2, repeat: Infinity } : { duration: 0.5 }}
      className={cn(
        "glass-panel flex items-center gap-4 p-4",
        isValid ? "border-finca-emerald/35 shadow-glow" : "border-finca-ember/40 shadow-glow-red"
      )}
    >
      <div
        className={cn(
          "relative flex h-12 w-12 items-center justify-center rounded-2xl border bg-black/[0.03]",
          isValid ? "border-finca-emerald/35 text-finca-emerald" : "border-finca-ember/40 text-finca-ember"
        )}
      >
        {isValid ? <ShieldCheck className="h-5 w-5" /> : <ShieldAlert className="h-5 w-5" />}
        <span
          className={cn(
            "absolute inset-0 rounded-2xl",
            isValid
              ? "animate-pulse-soft border border-finca-emerald/20"
              : "bg-[linear-gradient(90deg,rgba(255,123,112,0.08),transparent)]"
          )}
        />
      </div>

      <div className="space-y-1">
        <p className="text-sm font-semibold text-black">
          {isValid ? t("validation.verified") : t("validation.compromised")}
        </p>
        <p className="text-xs uppercase tracking-[0.24em] text-black/45">
          {isValid
            ? t("validation.verifiedDesc")
            : `${t("validation.brokenPath")}${validation.invalid_index !== null && validation.invalid_index !== undefined ? ` ${validation.invalid_index}` : ""}`}
        </p>
        {validation.message ? <p className="text-sm text-black/65">{validation.message}</p> : null}
      </div>
    </motion.div>
  );
}
