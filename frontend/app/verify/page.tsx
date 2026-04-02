import type { Metadata } from "next";

import { VerifyWorkspace } from "@/components/forms/verify-workspace";
import { getBatchOptions } from "@/lib/data";
import { createTranslator } from "@/lib/i18n";
import { getRequestLanguage } from "@/lib/i18n-server";

export async function generateMetadata(): Promise<Metadata> {
  const language = await getRequestLanguage();
  const t = createTranslator(language);
  return {
    title: t("verify.eyebrow")
  };
}

export default async function VerifyPage() {
  const batches = await getBatchOptions();

  return (
    <div className="section-shell py-14 sm:py-16">
      <div className="glass-stage p-3 sm:p-4 lg:p-5">
        <VerifyWorkspace batches={batches} />
      </div>
    </div>
  );
}
