"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RelevanceScore } from "@/components/relevance-score";
import type { DigestItem } from "@/types";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";

const severityGlow: Record<string, string> = {
  critical: "hover:border-red-500/30 hover:shadow-red-500/5",
  warning: "hover:border-amber-500/30 hover:shadow-amber-500/5",
  info: "hover:border-zinc-500/30 hover:shadow-zinc-500/5",
};

interface DigestCardProps {
  item: DigestItem;
}

export function DigestCard({ item }: DigestCardProps) {
  return (
    <Card
      className={cn(
        "group relative overflow-hidden border-zinc-800/60 bg-zinc-900/50 p-4 transition-all duration-300 hover:shadow-lg",
        severityGlow[item.severity]
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0 space-y-2">
          {/* Title */}
          <h3 className="font-semibold text-sm text-zinc-100 leading-snug">
            {item.title}
          </h3>

          {/* Source badge */}
          <Badge
            variant="outline"
            className="font-mono text-[10px] uppercase tracking-wider text-zinc-500 border-zinc-700/50 bg-transparent"
          >
            {item.source}
          </Badge>

          {/* Impact summary */}
          <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2">
            {item.impactSummary}
          </p>
        </div>

        {/* Relevance score */}
        <RelevanceScore score={item.relevanceScore} size={44} />
      </div>

      {/* Explain More link */}
      <Link
        href={`/item/${item.id}`}
        className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors group/link"
      >
        Explain More
        <ArrowRight className="h-3 w-3 transition-transform group-hover/link:translate-x-0.5" />
      </Link>

      {/* Cost impact indicator */}
      {item.costImpact != null && item.costImpact > 0 && (
        <div className="absolute top-3 right-3">
          <span className="font-mono text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded px-1.5 py-0.5">
            −${item.costImpact}/mo
          </span>
        </div>
      )}
    </Card>
  );
}
