"use client";

import { DigestCard } from "@/components/digest-card";
import type { DigestItem, Severity } from "@/types";

const sectionConfig: Record<
  Severity,
  { icon: string; label: string; color: string }
> = {
  critical: { icon: "🔴", label: "Act This Week", color: "text-red-400" },
  warning: { icon: "🟡", label: "Watch Closely", color: "text-amber-400" },
  info: { icon: "⚪", label: "On the Radar", color: "text-zinc-400" },
};

interface DigestSectionProps {
  severity: Severity;
  items: DigestItem[];
}

export function DigestSection({ severity, items }: DigestSectionProps) {
  const cfg = sectionConfig[severity];

  if (items.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-base">{cfg.icon}</span>
        <h2 className={`font-mono text-sm font-semibold uppercase tracking-wider ${cfg.color}`}>
          {cfg.label}
        </h2>
        <span className="font-mono text-xs text-zinc-600">
          ({items.length})
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <DigestCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}
