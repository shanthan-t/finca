import type { Metadata } from "next";

import { FarmerWorkspace } from "@/components/farmer/farmer-workspace";
import { getBatchOptions, getDashboardData } from "@/lib/data";
import { getRequestLanguage } from "@/lib/i18n-server";
import { createTranslator } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const language = getRequestLanguage();
  const t = createTranslator(language);
  return {
    title: t("navbar.farmerMode")
  };
}

export default async function FarmPage() {
  const [batches, batchOptions] = await Promise.all([getDashboardData(), getBatchOptions()]);
  const totalBlocks = batches.reduce((total, batch) => total + batch.block_count, 0);

  return <FarmerWorkspace batches={batches} batchOptions={batchOptions} totalBlocks={totalBlocks} />;
}
