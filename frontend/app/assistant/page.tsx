import type { Metadata } from "next";

import { AIChat } from "@/components/AIChat";
import { createTranslator } from "@/lib/i18n";
import { getRequestLanguage } from "@/lib/i18n-server";

export async function generateMetadata(): Promise<Metadata> {
  const language = await getRequestLanguage();
  const t = createTranslator(language);
  return {
    title: t("assistant.eyebrow")
  };
}

export default async function AssistantPage({
  searchParams
}: {
  searchParams: Promise<{ batchId?: string; batch_id?: string }>;
}) {
  const sp = await searchParams;
  const initialBatchId = sp.batchId ?? sp.batch_id ?? "";

  return (
    <div className="section-shell py-14 sm:py-16">
      <div className="glass-stage p-3 sm:p-4 lg:p-5">
        <AIChat initialBatchId={initialBatchId} />
      </div>
    </div>
  );
}
