"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { MultiSelect } from "@/components/multi-select";
import { postStack } from "@/lib/api";
import { loadStackConfig } from "@/lib/storage";
import type { StackConfig } from "@/types";
import { Activity, ArrowRight, Loader2, DollarSign } from "lucide-react";
import { useEffect } from "react";

const MODEL_OPTIONS = [
  "Gemini 2.5 Pro",
  "GPT-4o",
  "Claude Sonnet",
  "Llama 3",
  "Mistral Large",
  "Cohere Command R+",
];

const INFRA_OPTIONS = [
  "Cloud Run",
  "Firebase",
  "Vercel",
  "AWS Lambda",
  "GCP",
  "Azure",
  "Supabase",
  "Railway",
];

const FRAMEWORK_OPTIONS = [
  "LangChain",
  "LlamaIndex",
  "FastAPI",
  "Next.js",
  "CrewAI",
  "AutoGen",
  "Semantic Kernel",
];

export default function Onboarding() {
  const router = useRouter();
  const [models, setModels] = useState<string[]>([]);
  const [infra, setInfra] = useState<string[]>([]);
  const [frameworks, setFrameworks] = useState<string[]>([]);
  const [spend, setSpend] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);

  // Hydrate from localStorage if available
  useEffect(() => {
    const saved = loadStackConfig();
    if (saved) {
      setModels(saved.models);
      setInfra(saved.infra);
      setFrameworks(saved.frameworks);
      setSpend(saved.spend);
    }
  }, []);

  const allSelected = useMemo(
    () => [...models, ...infra, ...frameworks],
    [models, infra, frameworks]
  );

  function updateSpend(item: string, value: number) {
    setSpend((prev) => ({ ...prev, [item]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (allSelected.length === 0) return;

    setSubmitting(true);
    const config: StackConfig = { models, infra, frameworks, spend };
    await postStack(config);
    router.push("/dashboard");
  }

  const canSubmit = allSelected.length > 0 && !submitting;

  // Group selected items by category for the spend section
  const spendGroups = [
    { label: "AI Models", items: models },
    { label: "Infrastructure", items: infra },
    { label: "Frameworks", items: frameworks },
  ].filter((g) => g.items.length > 0);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-2xl animate-fade-up">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-500/25">
              <Activity className="h-5 w-5 text-emerald-400" />
            </div>
            <span className="font-mono text-lg font-bold tracking-tight">
              Stack<span className="text-emerald-400">Pulse</span>
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight mb-2">
            Configure Your Stack
          </h1>
          <p className="text-sm text-zinc-400 max-w-md mx-auto">
            Tell us what you&apos;re running so we can monitor for breaking changes,
            cost savings, and emerging alternatives.
          </p>
        </div>

        {/* Form Card */}
        <form onSubmit={handleSubmit}>
          <div className="glass-card-glow rounded-xl p-6 space-y-6">
            {/* Multi-selects */}
            <MultiSelect
              label="AI Models"
              options={MODEL_OPTIONS}
              selected={models}
              onChange={setModels}
              placeholder="Select AI models in use…"
            />

            <MultiSelect
              label="Infrastructure"
              options={INFRA_OPTIONS}
              selected={infra}
              onChange={setInfra}
              placeholder="Select infrastructure tools…"
            />

            <MultiSelect
              label="Frameworks"
              options={FRAMEWORK_OPTIONS}
              selected={frameworks}
              onChange={setFrameworks}
              placeholder="Select frameworks…"
            />

            {/* Monthly Spend */}
            {spendGroups.length > 0 && (
              <>
                <Separator className="bg-zinc-800" />

                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-zinc-400" />
                    <label className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                      Monthly Spend
                    </label>
                  </div>

                  {spendGroups.map((group) => (
                    <div key={group.label} className="space-y-2.5">
                      <p className="text-xs text-zinc-500 font-medium">
                        {group.label}
                      </p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {group.items.map((item) => (
                          <div
                            key={item}
                            className="flex items-center gap-2 rounded-lg bg-zinc-800/30 px-3 py-2"
                          >
                            <span className="flex-1 text-xs text-zinc-300 truncate">
                              {item}
                            </span>
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-zinc-500">$</span>
                              <Input
                                type="number"
                                min={0}
                                value={spend[item] ?? ""}
                                onChange={(e) =>
                                  updateSpend(
                                    item,
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                placeholder="0"
                                className="w-20 h-7 text-xs bg-zinc-900/50 border-zinc-700/40"
                              />
                              <span className="text-[10px] text-zinc-600">
                                /mo
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Submit */}
            <Button
              type="submit"
              disabled={!canSubmit}
              className="w-full h-10 bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-all disabled:opacity-40"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Launch Dashboard
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Footer hint */}
        <p className="text-center text-[10px] text-zinc-600 mt-4 font-mono">
          Your stack config is saved locally as a fallback.
        </p>
      </div>
    </div>
  );
}
