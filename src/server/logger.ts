// Minimal, dependency-free structured logger. Emits one JSON object per line
// (JSONL) to stdout/stderr so logs are machine-parseable by log aggregators.
// The method surface mirrors `console` (log/info/warn/error/debug) so existing
// call sites can be migrated 1:1.

type Level = "debug" | "info" | "warn" | "error";

const LEVEL_ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const MIN_LEVEL: Level = (process.env.LOG_LEVEL as Level) in LEVEL_ORDER
  ? (process.env.LOG_LEVEL as Level)
  : "debug";

function serialize(arg: unknown): string {
  if (typeof arg === "string") return arg;
  if (arg instanceof Error) return arg.stack || arg.message;
  try {
    return JSON.stringify(arg);
  } catch {
    return String(arg);
  }
}

function emit(level: Level, args: unknown[]): void {
  if (LEVEL_ORDER[level] < LEVEL_ORDER[MIN_LEVEL]) return;
  const msg = args.map(serialize).join(" ");
  const line = JSON.stringify({ ts: new Date().toISOString(), level, msg });
  const stream = level === "error" || level === "warn" ? process.stderr : process.stdout;
  stream.write(line + "\n");
}

export const logger = {
  debug: (...args: unknown[]) => emit("debug", args),
  info: (...args: unknown[]) => emit("info", args),
  warn: (...args: unknown[]) => emit("warn", args),
  error: (...args: unknown[]) => emit("error", args),
  // Alias so `console.log` call sites map cleanly to structured info logs.
  log: (...args: unknown[]) => emit("info", args),
};
