import type { StackConfig } from "@/types";

const STACK_KEY = "stackpulse_stack_config";

export function saveStackConfig(config: StackConfig): void {
  try {
    localStorage.setItem(STACK_KEY, JSON.stringify(config));
  } catch {
    console.warn("[StackPulse] Failed to save stack config to localStorage");
  }
}

export function loadStackConfig(): StackConfig | null {
  try {
    const raw = localStorage.getItem(STACK_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StackConfig;
  } catch {
    console.warn("[StackPulse] Failed to load stack config from localStorage");
    return null;
  }
}

export function clearStackConfig(): void {
  try {
    localStorage.removeItem(STACK_KEY);
  } catch {
    // silent
  }
}
