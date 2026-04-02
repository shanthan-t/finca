import type { Metadata } from "next";

import { CreateBatchForm } from "@/components/forms/create-batch-form";
import { createTranslator } from "@/lib/i18n";
import { getRequestLanguage } from "@/lib/i18n-server";

export async function generateMetadata(): Promise<Metadata> {
  const language = await getRequestLanguage();
  const t = createTranslator(language);
  return {
    title: t("createBatch.eyebrow")
  };
}

export default function CreateBatchPage() {
  return (
    <div className="section-shell py-14 sm:py-16">
      <div className="glass-stage p-3 sm:p-4 lg:p-5">
        <CreateBatchForm />
      </div>
    </div>
  );
}
