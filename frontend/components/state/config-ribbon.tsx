import { AlertTriangle } from "lucide-react";

import { getConfigurationIssues } from "@/lib/env";
import type { AppLanguage } from "@/lib/i18n";

export function ConfigRibbon({ language }: { language: AppLanguage }) {
  const issues = getConfigurationIssues(language);

  if (issues.length === 0) {
    return null;
  }

  return (
    <div className="border-b border-finca-gold/20 bg-finca-gold/10">
      <div className="mx-auto flex max-w-7xl items-start gap-3 px-4 py-3 text-sm text-finca-gold sm:px-6 lg:px-8">
        <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
        <div className="space-y-1">
          {issues.map((issue) => (
            <p key={issue}>{issue}</p>
          ))}
        </div>
      </div>
    </div>
  );
}
