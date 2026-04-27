"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { TopBar } from "@/components/top-bar";
import { SeverityBadge } from "@/components/severity-badge";
import { RelevanceScore } from "@/components/relevance-score";
import { CostTable } from "@/components/cost-table";
import { ItemChat } from "@/components/item-chat";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getItem } from "@/lib/api";
import type { ItemDetail as ItemDetailType } from "@/types";
import {
  ArrowLeft,
  ExternalLink,
  Loader2,
  Lightbulb,
  FileText,
  AlertCircle,
} from "lucide-react";

export default function ItemDetail() {
  const params = useParams();
  const id = params.id as string;
  const [item, setItem] = useState<ItemDetailType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const data = await getItem(id);
      setItem(data);
      setLoading(false);
    }
    load();
  }, [id]);

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar />

      <main className="flex-1 mx-auto w-full max-w-3xl px-6 py-6">
        {/* Back */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors mb-6"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Dashboard
        </Link>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-400 mb-4" />
            <p className="text-sm text-zinc-500">Loading item…</p>
          </div>
        )}

        {/* Not found */}
        {!loading && !item && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <AlertCircle className="h-8 w-8 text-zinc-600 mb-4" />
            <h2 className="text-lg font-semibold text-zinc-300 mb-1">
              Item not found
            </h2>
            <p className="text-sm text-zinc-500">
              This digest item may have been removed or the API is unavailable.
            </p>
          </div>
        )}

        {/* Content */}
        {item && (
          <div className="space-y-6 animate-fade-up">
            {/* Header */}
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-4">
                <h1 className="text-xl font-bold tracking-tight text-zinc-100">
                  {item.title}
                </h1>
                <RelevanceScore score={item.relevanceScore} size={52} />
              </div>

              <div className="flex items-center gap-2">
                <SeverityBadge severity={item.severity} />
                {item.sourceLink && (
                  <a
                    href={item.sourceLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-emerald-400 transition-colors"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Source
                  </a>
                )}
              </div>
            </div>

            <Separator className="bg-zinc-800" />

            {/* Full Summary */}
            <Card className="border-zinc-800/60 bg-zinc-900/50 p-5">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="h-4 w-4 text-zinc-500" />
                <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Summary
                </h3>
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed">
                {item.fullSummary}
              </p>
            </Card>

            {/* Relevance Explanation */}
            <Card className="border-zinc-800/60 bg-zinc-900/50 p-5">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="h-4 w-4 text-amber-400" />
                <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Why This Matters
                </h3>
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed">
                {item.relevanceExplanation}
              </p>
            </Card>

            {/* Suggested Action */}
            <Card className="border-emerald-500/20 bg-emerald-500/5 p-5">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="h-4 w-4 text-emerald-400" />
                <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-emerald-400">
                  Suggested Action
                </h3>
              </div>
              <p className="text-sm text-emerald-100 leading-relaxed">
                {item.suggestedAction}
              </p>
            </Card>

            {/* Cost Comparison */}
            {item.costComparison && (
              <CostTable comparison={item.costComparison} />
            )}

            <Separator className="bg-zinc-800" />

            {/* Ask Pulse Chat */}
            <ItemChat itemId={id} />
          </div>
        )}
      </main>
    </div>
  );
}
