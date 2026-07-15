import { describe, it, expect } from "vitest";
import { cosineSimilarity, topK, localEmbedding } from "../src/server/vectorStore";
import type { VectorRecord } from "../src/server/vectorStore";

describe("cosineSimilarity", () => {
  it("is 1 for identical vectors and 0 for orthogonal", () => {
    expect(cosineSimilarity([1, 0], [1, 0])).toBeCloseTo(1);
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
  });

  it("returns 0 for degenerate / mismatched input", () => {
    expect(cosineSimilarity([], [])).toBe(0);
    expect(cosineSimilarity([1, 2], [1])).toBe(0);
    expect(cosineSimilarity([0, 0], [1, 1])).toBe(0);
  });
});

describe("localEmbedding", () => {
  it("is deterministic and L2-normalised", () => {
    const a = localEmbedding("Mia San Mia FC Bayern");
    const b = localEmbedding("Mia San Mia FC Bayern");
    expect(a).toEqual(b);
    const norm = Math.sqrt(a.reduce((s, v) => s + v * v, 0));
    expect(norm).toBeCloseTo(1, 5);
  });

  it("ranks semantically closer text higher via cosine", () => {
    const q = localEmbedding("bayern munich stadium allianz arena");
    const related = localEmbedding("the allianz arena is bayern munich's stadium");
    const unrelated = localEmbedding("quarterly financial tax accounting report");
    expect(cosineSimilarity(q, related)).toBeGreaterThan(cosineSimilarity(q, unrelated));
  });
});

describe("topK", () => {
  const recs: VectorRecord[] = [
    { id: "1", source: "a", text: "alpha", embedding: [1, 0, 0] },
    { id: "2", source: "b", text: "beta", embedding: [0, 1, 0] },
    { id: "3", source: "c", text: "gamma", embedding: [0.9, 0.1, 0] },
  ];

  it("returns k results ordered by score", () => {
    const out = topK([1, 0, 0], recs, 2);
    expect(out).toHaveLength(2);
    expect(out[0].id).toBe("1");
    expect(out[1].id).toBe("3");
    expect(out[0].score).toBeGreaterThanOrEqual(out[1].score);
  });

  it("never returns more than available records", () => {
    expect(topK([1, 0, 0], recs, 10)).toHaveLength(3);
  });
});
