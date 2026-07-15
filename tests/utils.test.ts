import { describe, it, expect } from "vitest";
import { isRealApiKey, makeCacheKey, chunkText } from "../src/server/utils";

describe("isRealApiKey", () => {
  it("rejects empty, null and undefined", () => {
    expect(isRealApiKey(undefined)).toBe(false);
    expect(isRealApiKey(null)).toBe(false);
    expect(isRealApiKey("")).toBe(false);
    expect(isRealApiKey("   ")).toBe(false);
  });

  it("rejects known placeholder / simulation markers", () => {
    expect(isRealApiKey("MOCK_KEY")).toBe(false);
    expect(isRealApiKey("dev_key_simulation_active")).toBe(false);
    expect(isRealApiKey("change_me")).toBe(false);
    expect(isRealApiKey("YOUR_API_KEY")).toBe(false);
    expect(isRealApiKey("MY_GEMINI_API_KEY")).toBe(false);
    expect(isRealApiKey("some-placeholder-value")).toBe(false);
  });

  it("accepts a realistic key", () => {
    expect(isRealApiKey("AIzaSyD-realistic-looking-key-12345")).toBe(true);
    expect(isRealApiKey("sk-abcdef0123456789")).toBe(true);
  });
});

describe("makeCacheKey", () => {
  it("is deterministic for equal payloads", () => {
    const a = makeCacheKey("caption", { player: "Kane", tone: "hype" });
    const b = makeCacheKey("caption", { player: "Kane", tone: "hype" });
    expect(a).toBe(b);
  });

  it("differs for different prefixes or payloads", () => {
    expect(makeCacheKey("caption", { x: 1 })).not.toBe(makeCacheKey("chain", { x: 1 }));
    expect(makeCacheKey("caption", { x: 1 })).not.toBe(makeCacheKey("caption", { x: 2 }));
  });
});

describe("chunkText", () => {
  it("returns an empty array for empty/whitespace input", () => {
    expect(chunkText("")).toEqual([]);
    expect(chunkText("   \n  ")).toEqual([]);
  });

  it("returns a single chunk when text fits", () => {
    const out = chunkText("short text", 100);
    expect(out).toHaveLength(1);
    expect(out[0]).toBe("short text");
  });

  it("splits long text into multiple chunks each within the limit", () => {
    const para = "A".repeat(50);
    const text = Array.from({ length: 20 }, () => para).join("\n\n");
    const out = chunkText(text, 120);
    expect(out.length).toBeGreaterThan(1);
    for (const chunk of out) {
      expect(chunk.length).toBeLessThanOrEqual(120);
    }
  });

  it("hard-splits a single oversized token", () => {
    const out = chunkText("B".repeat(500), 100);
    expect(out.length).toBe(5);
    expect(out.every((c) => c.length <= 100)).toBe(true);
  });

  it("preserves full content (no silent truncation)", () => {
    const text = Array.from({ length: 30 }, (_, i) => `Sentence number ${i}.`).join(" ");
    const out = chunkText(text, 60);
    const recombined = out.join(" ").replace(/\s+/g, " ").trim();
    // every original sentence index must still be present somewhere
    for (let i = 0; i < 30; i++) {
      expect(recombined).toContain(`Sentence number ${i}.`);
    }
  });
});
