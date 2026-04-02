import type { Metadata } from "next";

import { AIChat } from "@/components/AIChat";
import { createTranslator } from "@/lib/i18n";
import { getRequestLanguage } from "@/lib/i18n-server";

export async function generateMetadata(): Promise<Metadata> {
  const language = getRequestLanguage();
  const t = createTranslator(language);
  return {
    title: t("assistant.eyebrow")
  };
}

export default function AssistantPage({
  searchParams
}: {
  searchParams?: { batchId?: string; batch_id?: string };
}) {
  const initialBatchId = searchParams?.batchId ?? searchParams?.batch_id ?? "";

  return (
    <div className="section-shell py-14 sm:py-16">
      <div className="glass-stage p-3 sm:p-4 lg:p-5">
        <AIChat initialBatchId={initialBatchId} />
      </div>
    </div>
  );
}
