import { describe, it, expect, afterAll } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import { FileStore } from "../src/server/fileStore";

const tmp = path.join(os.tmpdir(), `miasanai-store-test-${process.pid}.json`);

afterAll(() => {
  try { fs.unlinkSync(tmp); } catch { /* ignore */ }
});

describe("FileStore", () => {
  it("returns null for unknown collections", () => {
    const store = new FileStore(tmp);
    expect(store.get("does-not-exist")).toBeNull();
  });

  it("persists values across instances (survives 'restart')", () => {
    const a = new FileStore(tmp);
    a.set("presets", [{ id: "p1", name: "Matchday" }]);
    const b = new FileStore(tmp); // fresh instance reads from disk
    expect(b.get("presets")).toEqual([{ id: "p1", name: "Matchday" }]);
    expect(b.keys()).toContain("presets");
  });

  it("overwrites existing collection values", () => {
    const store = new FileStore(tmp);
    store.set("settings", { theme: "dark" });
    store.set("settings", { theme: "light" });
    expect(store.get("settings")).toEqual({ theme: "light" });
  });
});
