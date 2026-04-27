"use client";

import { useState, useEffect, useCallback } from "react";
import { TopBar } from "@/components/top-bar";
import { DigestSection } from "@/components/digest-section";
import { RunwaySidebar } from "@/components/runway-sidebar";
import { Button } from "@/components/ui/button";
import { getDigest } from "@/lib/api";
import type { DigestResponse, DigestItem, Severity } from "@/types";
import { RefreshCw, Loader2, Clock, Inbox } from "lucide-react";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return "just now";
  if (hours === 1) return "1 hour ago";
  return `${hours} hours ago`;
}

export default function Dashboard() {
  const [digest, setDigest] = useState<DigestResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDigest = useCallback(async () => {
    setLoading(true);
    const data = await getDigest();
    setDigest(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchDigest();
  }, [fetchDigest]);

  const grouped: Record<Severity, DigestItem[]> = {
    critical: [],
    warning: [],
    info: [],
  };

  if (digest) {
    for (const item of digest.items) {
      grouped[item.severity].push(item);
    }
  }

  const hasItems = digest && digest.items.length > 0;

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar />

      <main className="flex-1 mx-auto w-full max-w-7xl px-6 py-6">
        {/* Status bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <Clock className="h-3.5 w-3.5" />
            <span className="font-mono">
              Last updated:{" "}
              {digest ? timeAgo(digest.lastUpdated) : "—"}
            </span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchDigest}
            disabled={loading}
            className="h-8 gap-1.5 text-xs border-zinc-700/50 bg-zinc-900/50 text-zinc-300 hover:bg-zinc-800"
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Refresh
          </Button>
        </div>

        {/* Loading state */}
        {loading && !digest && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-400 mb-4" />
            <p className="text-sm text-zinc-500">Loading your digest…</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && !hasItems && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-800/50 mb-4">
              <Inbox className="h-8 w-8 text-zinc-600" />
            </div>
            <h2 className="text-lg font-semibold text-zinc-300 mb-1">
              No digest items yet
            </h2>
            <p className="text-sm text-zinc-500 max-w-sm">
              Once the backend processes your stack configuration, digest items
              will appear here grouped by severity.
            </p>
          </div>
        )}

        {/* Content */}
        {hasItems && (
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Main content */}
            <div className="flex-1 space-y-8 stagger-children">
              <DigestSection
                severity="critical"
                items={grouped.critical}
              />
              <DigestSection
                severity="warning"
                items={grouped.warning}
              />
              <DigestSection severity="info" items={grouped.info} />
            </div>

            {/* Sidebar */}
            <RunwaySidebar
              items={digest!.items}
              totalSavings={digest!.totalSavings}
            />
          </div>
        )}
      </main>
    </div>
  );
}
