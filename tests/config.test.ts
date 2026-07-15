import { describe, it, expect } from "vitest";
import { loadConfig } from "../src/server/config";

describe("loadConfig", () => {
  it("applies sane defaults", () => {
    const c = loadConfig({});
    expect(c.nodeEnv).toBe("development");
    expect(c.isProd).toBe(false);
    expect(c.port).toBe(3000);
    expect(c.requestTimeoutMs).toBe(30000);
    expect(c.corsOrigins).toEqual([]);
  });

  it("coerces PORT and parses CORS_ORIGINS", () => {
    const c = loadConfig({ PORT: "8080", CORS_ORIGINS: "https://a.com, https://b.com" });
    expect(c.port).toBe(8080);
    expect(c.corsOrigins).toEqual(["https://a.com", "https://b.com"]);
  });

  it("throws on structurally invalid values", () => {
    expect(() => loadConfig({ PORT: "not-a-number" })).toThrow(/Invalid environment configuration/);
    expect(() => loadConfig({ NODE_ENV: "staging" })).toThrow(/Invalid environment configuration/);
  });

  it("warns (but does not throw) on missing prod secrets", () => {
    const c = loadConfig({ NODE_ENV: "production" });
    expect(c.isProd).toBe(true);
    expect(c.warnings.some((w) => w.includes("ADMIN_API_TOKEN"))).toBe(true);
    expect(c.warnings.some((w) => w.includes("GEMINI_API_KEY"))).toBe(true);
  });
});
