import type { Metadata } from "next";

import { AddEventForm } from "@/components/forms/add-event-form";
import { getBatchOptions } from "@/lib/data";

export const metadata: Metadata = {
  title: "Add Event"
};

export default async function AddEventPage({
  searchParams
}: {
  searchParams?: { batchId?: string };
}) {
  const batches = await getBatchOptions();

  return (
    <div className="section-shell py-14 sm:py-16">
      <div className="glass-stage p-3 sm:p-4 lg:p-5">
        <AddEventForm batches={batches} initialBatchId={searchParams?.batchId} />
      </div>
    </div>
  );
}
