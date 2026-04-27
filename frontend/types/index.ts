// ── Stack Configuration ──────────────────────────────────────────────
export interface StackConfig {
  models: string[];
  infra: string[];
  frameworks: string[];
  spend: Record<string, number>;
}

// ── Digest ───────────────────────────────────────────────────────────
export type Severity = "critical" | "warning" | "info";

export interface DigestItem {
  id: string;
  title: string;
  source: string;
  severity: Severity;
  relevanceScore: number;
  impactSummary: string;
  costImpact?: number;
}

export interface DigestResponse {
  lastUpdated: string;
  items: DigestItem[];
  totalSavings: number;
}

// ── Item Detail ──────────────────────────────────────────────────────
export interface CostComparison {
  currentService: string;
  currentCost: number;
  alternative: string;
  alternativeCost: number;
  savings: number;
}

export interface ItemDetail extends DigestItem {
  fullSummary: string;
  sourceLink: string;
  relevanceExplanation: string;
  suggestedAction: string;
  costComparison?: CostComparison;
}

// ── Chat ─────────────────────────────────────────────────────────────
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}
