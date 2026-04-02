"use client";

import { AlertTriangle } from "lucide-react";

import { useLanguage } from "@/components/providers/language-provider";

export default function Error({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useLanguage();

  return (
    <div className="section-shell py-20">
      <div className="glass-panel max-w-3xl space-y-5 p-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-finca-ember/35 bg-finca-ember/10 text-finca-ember">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-semibold text-black">{t("error.title")}</h2>
          <p className="text-sm leading-7 text-black/68">
            {error.message || t("error.fallback")}
          </p>
        </div>
        <button type="button" onClick={reset} className="button-primary">
          {t("error.retry")}
        </button>
      </div>
    </div>
  );
}
