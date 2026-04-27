"use client";

import { Badge } from "@/components/ui/badge";
import type { Severity } from "@/types";
import { cn } from "@/lib/utils";

const config: Record<Severity, { label: string; icon: string; className: string }> = {
  critical: {
    label: "Act This Week",
    icon: "🔴",
    className:
      "bg-red-500/10 text-red-400 border-red-500/25 hover:bg-red-500/15",
  },
  warning: {
    label: "Watch Closely",
    icon: "🟡",
    className:
      "bg-amber-500/10 text-amber-400 border-amber-500/25 hover:bg-amber-500/15",
  },
  info: {
    label: "On the Radar",
    icon: "⚪",
    className:
      "bg-zinc-500/10 text-zinc-400 border-zinc-500/25 hover:bg-zinc-500/15",
  },
};

interface SeverityBadgeProps {
  severity: Severity;
  className?: string;
}

export function SeverityBadge({ severity, className }: SeverityBadgeProps) {
  const c = config[severity];
  return (
    <Badge
      className={cn(
        "gap-1.5 font-mono text-xs border",
        c.className,
        className
      )}
    >
      <span>{c.icon}</span>
      {c.label}
    </Badge>
  );
}
