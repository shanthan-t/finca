import Link from "next/link";

export default function NotFound() {
  return (
    <div className="section-shell py-20">
      <div className="glass-panel max-w-3xl space-y-5 p-8">
        <p className="section-heading-eyebrow">Batch missing</p>
        <h1 className="text-4xl font-semibold text-black">This chain could not be found.</h1>
        <p className="text-sm leading-7 text-black/68">
          The batch may not exist yet, or the identifier was entered incorrectly.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/dashboard" className="button-primary">
            Return to dashboard
          </Link>
          <Link href="/create-batch" className="button-secondary">
            Create a batch
          </Link>
        </div>
      </div>
    </div>
  );
}
