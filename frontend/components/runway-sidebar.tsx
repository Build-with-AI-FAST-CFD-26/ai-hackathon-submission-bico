"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { TrendingDown, DollarSign } from "lucide-react";
import type { DigestItem } from "@/types";

interface RunwaySidebarProps {
  items: DigestItem[];
  totalSavings: number;
}

export function RunwaySidebar({ items, totalSavings }: RunwaySidebarProps) {
  const [displaySavings, setDisplaySavings] = useState(0);

  // Animated counter
  useEffect(() => {
    if (totalSavings === 0) return;
    const step = totalSavings / 30;
    let current = 0;
    const timer = setInterval(() => {
      current += step;
      if (current >= totalSavings) {
        setDisplaySavings(totalSavings);
        clearInterval(timer);
      } else {
        setDisplaySavings(Math.round(current));
      }
    }, 25);
    return () => clearInterval(timer);
  }, [totalSavings]);

  const costItems = items.filter(
    (item) => item.costImpact != null && item.costImpact > 0
  );

  return (
    <aside className="w-full lg:w-80 shrink-0">
      <Card className="sticky top-20 border-emerald-500/20 bg-zinc-900/50 p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15">
            <TrendingDown className="h-4 w-4 text-emerald-400" />
          </div>
          <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-emerald-400">
            Runway Impact
          </h3>
        </div>

        {/* Total savings */}
        <div className="text-center py-2">
          <p className="text-xs text-zinc-500 mb-1">Potential Monthly Savings</p>
          <p className="font-mono text-3xl font-bold text-emerald-400">
            ${displaySavings.toLocaleString()}
          </p>
          <p className="text-xs text-zinc-500 mt-1">/month</p>
        </div>

        <Separator className="bg-zinc-800" />

        {/* Breakdown */}
        {costItems.length > 0 ? (
          <div className="space-y-2.5">
            <p className="text-xs font-mono uppercase tracking-wider text-zinc-500">
              Top Opportunities
            </p>
            {costItems
              .sort((a, b) => (b.costImpact ?? 0) - (a.costImpact ?? 0))
              .slice(0, 5)
              .map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-2 text-xs"
                >
                  <span className="text-zinc-400 truncate flex-1">
                    {item.title}
                  </span>
                  <span className="font-mono text-emerald-400 shrink-0 flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    {item.costImpact}/mo
                  </span>
                </div>
              ))}
          </div>
        ) : (
          <p className="text-xs text-zinc-500 text-center py-4">
            No cost optimization items yet.
          </p>
        )}
      </Card>
    </aside>
  );
}
