// Minimal server-side, file-backed key/value store. Replaces client-only
// LocalStorage persistence so that presets, categories and settings survive
// browser-cache clears and can be shared across devices/users. It is a
// dependency-free stepping stone to a real database: the get/set interface
// stays identical if the backing store is later swapped for SQL/Redis.

import fs from "fs";
import path from "path";

export class FileStore {
  private data: Record<string, unknown> = {};

  constructor(private filePath: string) {
    this.load();
  }

  private load(): void {
    try {
      if (fs.existsSync(this.filePath)) {
        this.data = JSON.parse(fs.readFileSync(this.filePath, "utf8"));
      }
    } catch {
      this.data = {};
    }
  }

  private persist(): void {
    try {
      fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2));
    } catch {
      /* best-effort persistence; caller logs */
    }
  }

  get<T = unknown>(collection: string): T | null {
    return (this.data[collection] as T) ?? null;
  }

  set<T = unknown>(collection: string, value: T): T {
    this.data[collection] = value;
    this.persist();
    return value;
  }

  keys(): string[] {
    return Object.keys(this.data);
  }
}
