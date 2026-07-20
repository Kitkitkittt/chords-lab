import { describe, expect, it, vi } from "vitest";
import { defaultProgressState, PROGRESS_STORAGE_KEY } from "./progressStorage";
import {
  createProgressRepository,
  type ProgressStore
} from "./progressRepository";

function progressWithLesson(slug: string) {
  return { ...defaultProgressState, completedLessonSlugs: [slug] };
}

function storageWith(progress: unknown): Storage {
  const values = new Map<string, string>();
  if (progress) {
    values.set(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
  }
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => Array.from(values.keys())[index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value)
  };
}

describe("progress repository", () => {
  it("prefers normalized primary state and mirrors it locally", async () => {
    const primary: ProgressStore = {
      read: vi.fn().mockResolvedValue({
        schemaVersion: 1,
        completedLessonSlugs: ["primary"],
        settings: { reducedMotion: "no" }
      }),
      write: vi.fn()
    };
    const fallback = storageWith(progressWithLesson("local"));

    const progress = await createProgressRepository(primary).hydrate(fallback);

    expect(progress.completedLessonSlugs).toEqual(["primary"]);
    expect(progress.settings.reducedMotion).toBe(false);
    expect(JSON.parse(fallback.getItem(PROGRESS_STORAGE_KEY) ?? "{}")).toEqual(progress);
  });

  it("migrates local state when primary is empty", async () => {
    const local = progressWithLesson("local");
    const primary: ProgressStore = {
      read: vi.fn().mockResolvedValue(undefined),
      write: vi.fn().mockResolvedValue(undefined)
    };

    const progress = await createProgressRepository(primary).hydrate(storageWith(local));

    expect(progress).toEqual(local);
    expect(primary.write).toHaveBeenCalledWith(local);
  });

  it("falls back locally when the primary read fails", async () => {
    const local = progressWithLesson("local");
    const primary: ProgressStore = {
      read: vi.fn().mockRejectedValue(new Error("unavailable")),
      write: vi.fn()
    };

    await expect(createProgressRepository(primary).hydrate(storageWith(local))).resolves.toEqual(local);
  });

  it("keeps local progress when primary writes fail", async () => {
    const primary: ProgressStore = {
      read: vi.fn(),
      write: vi.fn().mockRejectedValue(new Error("unavailable"))
    };
    const fallback = storageWith(null);
    const progress = progressWithLesson("saved");

    await expect(createProgressRepository(primary).persist(fallback, progress)).resolves.toBeUndefined();
    expect(JSON.parse(fallback.getItem(PROGRESS_STORAGE_KEY) ?? "{}")).toEqual(progress);
  });

  it("serializes primary writes in call order", async () => {
    const releases: Array<() => void> = [];
    const primary: ProgressStore = {
      read: vi.fn(),
      write: vi.fn(
        () => new Promise<void>((resolve) => releases.push(resolve))
      )
    };
    const repository = createProgressRepository(primary);
    const fallback = storageWith(null);
    const first = repository.persist(fallback, progressWithLesson("first"));
    const second = repository.persist(fallback, progressWithLesson("second"));

    await Promise.resolve();
    expect(primary.write).toHaveBeenCalledTimes(1);
    releases[0]();
    await first;
    expect(primary.write).toHaveBeenCalledTimes(2);
    releases[1]();
    await second;
    expect(primary.write).toHaveBeenNthCalledWith(
      2,
      progressWithLesson("second")
    );
  });

  it("works locally without a primary store", async () => {
    const fallback = storageWith(null);
    const repository = createProgressRepository(null);
    const progress = progressWithLesson("local-only");

    await repository.persist(fallback, progress);

    await expect(repository.hydrate(fallback)).resolves.toEqual(progress);
  });
});
