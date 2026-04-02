import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { TraceValidationWorkspace } from "@/components/trace/trace-validation-workspace";
import { getBatchChain } from "@/lib/data";
import { createTranslator } from "@/lib/i18n";
import { getRequestLanguage } from "@/lib/i18n-server";

export async function generateMetadata(): Promise<Metadata> {
  const language = await getRequestLanguage();
  const t = createTranslator(language);
  return {
    title: t("trace.eyebrow")
  };
}

export default async function TraceBatchPage({
  params
}: {
  params: Promise<{ batchId: string }>;
}) {
  const { batchId } = await params;
  const chain = await getBatchChain(batchId);

  if (!chain) {
    notFound();
  }

  return <TraceValidationWorkspace chain={chain} />;
}
