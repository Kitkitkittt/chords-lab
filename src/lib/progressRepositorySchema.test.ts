import { beforeEach, describe, expect, it } from "vitest";
import { PROGRESS_STORAGE_KEY } from "./progressStorage";
import { createProgressRepository } from "./progressRepository";

class MemoryStorage implements Storage {
  private data = new Map<string, string>();

  get length() {
    return this.data.size;
  }

  clear() {
    this.data.clear();
  }

  getItem(key: string) {
    return this.data.get(key) ?? null;
  }

  key(index: number) {
    return Array.from(this.data.keys())[index] ?? null;
  }

  removeItem(key: string) {
    this.data.delete(key);
  }

  setItem(key: string, value: string) {
    this.data.set(key, value);
  }
}

describe("progress repository schema handling", () => {
  let storage: MemoryStorage;

  beforeEach(() => {
    storage = new MemoryStorage();
    Object.defineProperty(globalThis, "localStorage", {
      value: storage,
      configurable: true,
      writable: true
    });
  });

  it("recovers unversioned localStorage progress instead of resetting it", async () => {
    storage.setItem(
      PROGRESS_STORAGE_KEY,
      JSON.stringify({ completedLessonSlugs: ["intervals", "major-scale"] })
    );

    const repository = createProgressRepository(null);
    const loaded = await repository.hydrate(storage);

    expect(loaded.completedLessonSlugs).toEqual([
      "intervals",
      "major-scale"
    ]);
  });

  it("ignores localStorage progress stamped by a newer build", async () => {
    storage.setItem(
      PROGRESS_STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 999,
        completedLessonSlugs: ["intervals"]
      })
    );

    const repository = createProgressRepository(null);
    const loaded = await repository.hydrate(storage);

    expect(loaded.completedLessonSlugs).toEqual([]);
  });
});


