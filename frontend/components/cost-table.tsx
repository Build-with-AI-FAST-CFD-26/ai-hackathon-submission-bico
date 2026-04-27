"use client";

import type { CostComparison } from "@/types";
import { ArrowRight } from "lucide-react";

interface CostTableProps {
  comparison: CostComparison;
}

export function CostTable({ comparison }: CostTableProps) {
  return (
    <div className="rounded-lg border border-zinc-800/60 bg-zinc-900/50 overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-800/60">
        <h4 className="font-mono text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Cost Comparison
        </h4>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-0">
        {/* Current */}
        <div className="p-4 text-center space-y-1.5">
          <p className="text-xs text-zinc-500 font-mono uppercase">Current</p>
          <p className="text-sm font-medium text-zinc-200">
            {comparison.currentService}
          </p>
          <p className="font-mono text-xl font-bold text-red-400">
            ${comparison.currentCost}
            <span className="text-xs text-zinc-500">/mo</span>
          </p>
        </div>

        {/* Arrow */}
        <div className="flex h-full items-center justify-center px-2">
          <ArrowRight className="h-5 w-5 text-zinc-600" />
        </div>

        {/* Alternative */}
        <div className="p-4 text-center space-y-1.5">
          <p className="text-xs text-zinc-500 font-mono uppercase">
            Alternative
          </p>
          <p className="text-sm font-medium text-zinc-200">
            {comparison.alternative}
          </p>
          <p className="font-mono text-xl font-bold text-emerald-400">
            ${comparison.alternativeCost}
            <span className="text-xs text-zinc-500">/mo</span>
          </p>
        </div>
      </div>

      {/* Savings */}
      <div className="border-t border-zinc-800/60 px-4 py-3 bg-emerald-500/5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-400">Estimated Savings</span>
          <span className="font-mono text-sm font-bold text-emerald-400">
            −${comparison.savings}/mo
          </span>
        </div>
      </div>
    </div>
  );
}
