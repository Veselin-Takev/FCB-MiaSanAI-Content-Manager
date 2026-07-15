// Pure, side-effect-free server utilities. Kept dependency-free and free of
// I/O so they can be unit-tested in isolation (see tests/utils.test.ts).

/**
 * Determines whether a provided secret looks like a real API key rather than a
 * placeholder or simulation marker. Used to decide between live model calls and
 * the simulated fallback engine.
 */
export function isRealApiKey(key: string | null | undefined): boolean {
  if (!key) return false;
  const k = key.trim().toLowerCase();
  return (
    k !== "" &&
    k !== "mock_key" &&
    k !== "dev_key_simulation_active" &&
    k !== "dev_key_simulation" &&
    k !== "undefined" &&
    k !== "null" &&
    k !== "change_me" &&
    !k.includes("simulation") &&
    !k.includes("placeholder") &&
    !k.includes("your_") &&
    !k.includes("my_")
  );
}

/**
 * Builds a stable cache key from a prefix and an arbitrary JSON-serialisable
 * payload. Deterministic for equal payloads (object key order is caller-stable
 * within this codebase).
 */
export function makeCacheKey(prefix: string, payload: unknown): string {
  return `${prefix}:${JSON.stringify(payload)}`;
}

/**
 * Splits text into chunks of at most `maxChars`, preferring paragraph and then
 * sentence boundaries so that no chunk cuts through the middle of a sentence
 * unless a single sentence already exceeds the limit. Prevents silent
 * truncation of long documents before they are sent to a context-limited model.
 *
 * @returns an array of non-empty chunks; an empty/whitespace input yields [].
 */
export function chunkText(text: string, maxChars = 12000): string[] {
  if (!text || !text.trim()) return [];
  if (maxChars <= 0) return [text];
  if (text.length <= maxChars) return [text.trim()];

  const paragraphs = text.split(/\n\s*\n/);
  const chunks: string[] = [];
  let current = "";

  const pushCurrent = () => {
    if (current.trim()) chunks.push(current.trim());
    current = "";
  };

  for (const para of paragraphs) {
    if (para.length > maxChars) {
      // Paragraph itself too large → split on sentence boundaries, then hard-cut.
      pushCurrent();
      const sentences = para.match(/[^.!?]+[.!?]*\s*/g) || [para];
      for (const sentence of sentences) {
        if (sentence.length > maxChars) {
          for (let i = 0; i < sentence.length; i += maxChars) {
            chunks.push(sentence.slice(i, i + maxChars).trim());
          }
        } else if ((current + sentence).length > maxChars) {
          pushCurrent();
          current = sentence;
        } else {
          current += sentence;
        }
      }
      continue;
    }
    if ((current + "\n\n" + para).length > maxChars) {
      pushCurrent();
      current = para;
    } else {
      current = current ? current + "\n\n" + para : para;
    }
  }
  pushCurrent();
  return chunks.filter((c) => c.length > 0);
}
