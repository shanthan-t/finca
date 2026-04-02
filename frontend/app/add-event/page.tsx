import type { Metadata } from "next";

import { AddEventForm } from "@/components/forms/add-event-form";
import { getBatchOptions } from "@/lib/data";
import { createTranslator } from "@/lib/i18n";
import { getRequestLanguage } from "@/lib/i18n-server";

export async function generateMetadata(): Promise<Metadata> {
  const language = await getRequestLanguage();
  const t = createTranslator(language);
  return {
    title: t("addEvent.eyebrow")
  };
}

export default async function AddEventPage({
  searchParams
}: {
  searchParams: Promise<{ batchId?: string }>;
}) {
  const sp = await searchParams;
  const batches = await getBatchOptions();

  return (
    <div className="section-shell py-14 sm:py-16">
      <div className="glass-stage p-3 sm:p-4 lg:p-5">
        <AddEventForm batches={batches} initialBatchId={sp.batchId} />
      </div>
    </div>
  );
}
