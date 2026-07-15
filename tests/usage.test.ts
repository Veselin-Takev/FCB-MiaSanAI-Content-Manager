import { describe, it, expect } from "vitest";
import { UsageTracker, extractUsage } from "../src/server/usage";

describe("extractUsage", () => {
  it("reads Gemini usageMetadata", () => {
    const d = extractUsage({ usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 40, totalTokenCount: 140 } });
    expect(d).toEqual({ promptTokens: 100, candidatesTokens: 40, totalTokens: 140 });
  });

  it("is defensive when metadata is missing", () => {
    expect(extractUsage({})).toEqual({ promptTokens: 0, candidatesTokens: 0, totalTokens: 0 });
    expect(extractUsage(null)).toEqual({ promptTokens: 0, candidatesTokens: 0, totalTokens: 0 });
  });

  it("derives total from parts when totalTokenCount is absent", () => {
    const d = extractUsage({ usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5 } });
    expect(d.totalTokens).toBe(15);
  });
});

describe("UsageTracker", () => {
  it("accumulates calls and tokens and computes cost", () => {
    const t = new UsageTracker(0.0015);
    t.add({ promptTokens: 1000, candidatesTokens: 0, totalTokens: 1000 });
    t.add({ promptTokens: 500, candidatesTokens: 500, totalTokens: 1000 });
    const s = t.snapshot();
    expect(s.calls).toBe(2);
    expect(s.totalTokens).toBe(2000);
    expect(s.promptTokens).toBe(1500);
    expect(s.estimatedCostUsd).toBeCloseTo(0.003, 6); // 2000/1000 * 0.0015
  });

  it("resets to zero", () => {
    const t = new UsageTracker();
    t.add({ totalTokens: 123 });
    t.reset();
    const s = t.snapshot();
    expect(s.calls).toBe(0);
    expect(s.totalTokens).toBe(0);
    expect(s.estimatedCostUsd).toBe(0);
  });
});
