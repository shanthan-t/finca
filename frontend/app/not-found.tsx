import Link from "next/link";

import { createTranslator } from "@/lib/i18n";
import { getRequestLanguage } from "@/lib/i18n-server";

export default function NotFound() {
  const t = createTranslator(getRequestLanguage());

  return (
    <div className="section-shell py-20">
      <div className="glass-panel max-w-3xl space-y-5 p-8">
        <p className="section-heading-eyebrow">{t("notFound.badge")}</p>
        <h1 className="text-4xl font-semibold text-black">{t("notFound.title")}</h1>
        <p className="text-sm leading-7 text-black/68">{t("notFound.description")}</p>
        <div className="flex flex-wrap gap-3">
          <Link href="/dashboard" className="button-primary">
            {t("common.returnToDashboard")}
          </Link>
          <Link href="/create-batch" className="button-secondary">
            {t("common.createBatch")}
          </Link>
        </div>
      </div>
    </div>
  );
}
