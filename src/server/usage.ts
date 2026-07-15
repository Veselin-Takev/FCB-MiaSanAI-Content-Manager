// Server-side token-usage tracker. Aggregates the *actual* token counts
// reported by the model provider (Gemini `usageMetadata`) across all calls and
// derives a cost estimate. Exposed via /api/usage so the UI can show real
// consumption instead of a pre-flight character-based guess.

export interface UsageDelta {
  promptTokens: number;
  candidatesTokens: number;
  totalTokens: number;
}

export interface UsageSnapshot extends UsageDelta {
  calls: number;
  ratePer1k: number;
  estimatedCostUsd: number;
}

export const DEFAULT_RATE_PER_1K = 0.0015;

/** Extracts a usage delta from a Gemini response's usageMetadata (defensive). */
export function extractUsage(response: any): UsageDelta {
  const u = response?.usageMetadata || {};
  const prompt = Number(u.promptTokenCount) || 0;
  const candidates = Number(u.candidatesTokenCount) || 0;
  const total = Number(u.totalTokenCount) || prompt + candidates;
  return { promptTokens: prompt, candidatesTokens: candidates, totalTokens: total };
}

export class UsageTracker {
  private calls = 0;
  private prompt = 0;
  private candidates = 0;
  private total = 0;

  constructor(private ratePer1k: number = DEFAULT_RATE_PER_1K) {}

  add(delta: Partial<UsageDelta>): void {
    this.calls++;
    this.prompt += delta.promptTokens || 0;
    this.candidates += delta.candidatesTokens || 0;
    this.total += delta.totalTokens || (delta.promptTokens || 0) + (delta.candidatesTokens || 0);
  }

  snapshot(): UsageSnapshot {
    return {
      calls: this.calls,
      promptTokens: this.prompt,
      candidatesTokens: this.candidates,
      totalTokens: this.total,
      ratePer1k: this.ratePer1k,
      estimatedCostUsd: Number(((this.total / 1000) * this.ratePer1k).toFixed(6)),
    };
  }

  reset(): void {
    this.calls = 0;
    this.prompt = 0;
    this.candidates = 0;
    this.total = 0;
  }
}
