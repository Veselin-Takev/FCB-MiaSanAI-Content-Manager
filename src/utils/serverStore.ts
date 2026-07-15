// Thin client for the server-side persistence layer (/api/store/*).
// Lets the UI read/write shared collections (presets, categories, settings)
// so state is no longer confined to a single browser's LocalStorage.
//
// Integration pattern (per collection): hydrate from the server on mount, and
// mirror local changes back with saveCollection(). LocalStorage can be kept as
// an offline cache in front of these calls.

export async function loadCollection<T = unknown>(collection: string): Promise<T | null> {
  try {
    const res = await fetch("/api/store/get", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ collection }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return (data && (data.value as T)) ?? null;
  } catch {
    return null;
  }
}

export async function saveCollection<T = unknown>(collection: string, value: T): Promise<boolean> {
  try {
    const res = await fetch("/api/store/set", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ collection, value }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
