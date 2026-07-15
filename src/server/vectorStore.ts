// Lightweight, dependency-free vector store with cosine-similarity retrieval
// and JSON-file persistence. It is a functional stepping stone towards a
// managed vector database (e.g. pgvector or Pinecone): the retrieval interface
// (`upsert` / `search`) stays identical, only the backing store would change.

import fs from "fs";
import path from "path";

export interface VectorRecord {
  id: string;
  source: string;
  text: string;
  embedding: number[];
  meta?: Record<string, unknown>;
}

export type ScoredRecord = VectorRecord & { score: number };

/** Cosine similarity of two equal-length vectors. Returns 0 for degenerate input. */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a.length || a.length !== b.length) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/** Returns the top-k records by cosine similarity to the query vector. */
export function topK(query: number[], records: VectorRecord[], k = 3): ScoredRecord[] {
  return records
    .map((r) => ({ ...r, score: cosineSimilarity(query, r.embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(0, k));
}

/**
 * Deterministic, dependency-free fallback embedding (hashed bag-of-words, L2
 * normalised). Used when no embedding provider key is configured so retrieval
 * still works offline. Real semantic embeddings are produced by the provider.
 */
export function localEmbedding(text: string, dim = 256): number[] {
  const vec = new Array(dim).fill(0);
  const tokens = text.toLowerCase().match(/[a-z0-9äöüß]+/g) || [];
  for (const tok of tokens) {
    let h = 2166136261;
    for (let i = 0; i < tok.length; i++) {
      h ^= tok.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    vec[Math.abs(h) % dim] += 1;
  }
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map((v) => v / norm);
}

/** JSON-file-backed vector store. Loads on construction, persists on mutation. */
export class VectorStore {
  private records: VectorRecord[] = [];

  constructor(private filePath: string) {
    this.load();
  }

  private load(): void {
    try {
      if (fs.existsSync(this.filePath)) {
        this.records = JSON.parse(fs.readFileSync(this.filePath, "utf8"));
      }
    } catch {
      this.records = [];
    }
  }

  private persist(): void {
    try {
      fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
      fs.writeFileSync(this.filePath, JSON.stringify(this.records));
    } catch {
      /* best-effort persistence; caller logs */
    }
  }

  upsert(records: VectorRecord[]): void {
    for (const r of records) {
      const i = this.records.findIndex((x) => x.id === r.id);
      if (i >= 0) this.records[i] = r;
      else this.records.push(r);
    }
    this.persist();
  }

  search(embedding: number[], k = 3): ScoredRecord[] {
    return topK(embedding, this.records, k);
  }

  removeBySource(source: string): void {
    this.records = this.records.filter((r) => r.source !== source);
    this.persist();
  }

  count(): number {
    return this.records.length;
  }
}
