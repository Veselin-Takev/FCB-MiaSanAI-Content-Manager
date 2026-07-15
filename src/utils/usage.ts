// Client helper for real token-usage transparency (/api/usage).

export interface UsageSnapshot {
  calls: number;
  promptTokens: number;
  candidatesTokens: number;
  totalTokens: number;
  ratePer1k: number;
  estimatedCostUsd: number;
}

export async function fetchUsage(): Promise<UsageSnapshot | null> {
  try {
    const res = await fetch("/api/usage");
    if (!res.ok) return null;
    return (await res.json()) as UsageSnapshot;
  } catch {
    return null;
  }
}
