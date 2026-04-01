import type { Metadata } from "next";

import { VerifyWorkspace } from "@/components/forms/verify-workspace";
import { getBatchOptions } from "@/lib/data";

export const metadata: Metadata = {
  title: "Verify"
};

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
