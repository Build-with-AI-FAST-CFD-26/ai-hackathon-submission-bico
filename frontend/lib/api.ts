import type {
  StackConfig,
  DigestResponse,
  ItemDetail,
  ChatMessage,
} from "@/types";
import { saveStackConfig } from "./storage";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ── Stack ────────────────────────────────────────────────────────────
export async function postStack(
  config: StackConfig
): Promise<{ ok: boolean }> {
  // Always persist locally as fallback
  saveStackConfig(config);

  try {
    const res = await fetch(`${BASE}/api/stack`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return { ok: true };
  } catch (err) {
    console.warn("[StackPulse] API unavailable, saved to localStorage", err);
    return { ok: true }; // fallback: still treat as success
  }
}

// ── Digest ───────────────────────────────────────────────────────────
export async function getDigest(): Promise<DigestResponse> {
  try {
    const res = await fetch(`${BASE}/api/digest`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as DigestResponse;
  } catch (err) {
    console.warn("[StackPulse] Failed to fetch digest", err);
    return { lastUpdated: new Date().toISOString(), items: [], totalSavings: 0 };
  }
}

// ── Item Detail ──────────────────────────────────────────────────────
export async function getItem(id: string): Promise<ItemDetail | null> {
  try {
    const res = await fetch(`${BASE}/api/item/${id}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as ItemDetail;
  } catch (err) {
    console.warn("[StackPulse] Failed to fetch item", err);
    return null;
  }
}

// ── Chat (streaming) ─────────────────────────────────────────────────
export async function postChat(
  messages: ChatMessage[],
  onChunk: (token: string) => void,
  itemId?: string
): Promise<void> {
  try {
    const res = await fetch(`${BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, itemId }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    if (!res.body) throw new Error("No response body");

    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      onChunk(decoder.decode(value, { stream: true }));
    }
  } catch (err) {
    console.warn("[StackPulse] Chat error", err);
    onChunk(
      "I'm unable to connect to the Pulse API right now. Please check that the backend is running."
    );
  }
}
