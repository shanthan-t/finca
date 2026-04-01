import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface EmptyStateProps {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
}

export function EmptyState({ title, description, actionHref, actionLabel }: EmptyStateProps) {
  return (
    <div className="glass-panel flex min-h-[260px] flex-col items-start justify-center gap-4 p-8 lg:p-10">
      <span className="rounded-full border border-black/10 bg-black/[0.03] px-3 py-1 text-xs uppercase tracking-[0.28em] text-finca-mint/70">
        No chain activity yet
      </span>
      <div className="space-y-2">
        <h3 className="text-2xl font-semibold">{title}</h3>
        <p className="max-w-2xl text-sm leading-7 text-black/70">{description}</p>
      </div>

      {actionHref && actionLabel ? (
        <Link href={actionHref} className="button-primary gap-2">
          {actionLabel}
          <ArrowRight className="h-4 w-4" />
        </Link>
      ) : null}
    </div>
  );
}
