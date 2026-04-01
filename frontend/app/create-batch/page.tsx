import type { Metadata } from "next";

import { CreateBatchForm } from "@/components/forms/create-batch-form";

export const metadata: Metadata = {
  title: "Create Batch"
};

export default function CreateBatchPage() {
  return (
    <div className="section-shell py-14 sm:py-16">
      <div className="glass-stage p-3 sm:p-4 lg:p-5">
        <CreateBatchForm />
      </div>
    </div>
  );
}
