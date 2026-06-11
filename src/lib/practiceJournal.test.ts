import { describe, expect, it } from "vitest";
import type { PracticeSessionHistory, ProgressState } from "../types/course";
import { defaultProgressState } from "./progressStorage";
import { accuracy, buildJournal, buildWeeklyDigest } from "./practiceJournal";

function session(
  overrides: Partial<PracticeSessionHistory>
): PracticeSessionHistory {
  return {
    id: "s-1",
    moduleId: "chords",
    configSummary: "test",
    correct: 0,
    attempted: 0,
    missedPromptIds: [],
    completedAt: "2026-06-10T08:00:00.000Z",
    ...overrides
  };
}

function progressWith(
  history: PracticeSessionHistory[]
): ProgressState {
  return {
    ...defaultProgressState,
    generatedSessionHistory: history
  };
}

describe("accuracy", () => {
  it("computes a safe ratio", () => {
    expect(accuracy(3, 4)).toBe(0.75);
  });

  it("returns 0 when nothing was attempted", () => {
    expect(accuracy(0, 0)).toBe(0);
  });
});

describe("buildJournal", () => {
  it("groups sessions by UTC day, summing same-day sessions", () => {
    const progress = progressWith([
      session({
        id: "a",
        moduleId: "chords",
        correct: 4,
        attempted: 5,
        completedAt: "2026-06-10T08:00:00.000Z"
      }),
      session({
        id: "b",
        moduleId: "ear",
        correct: 2,
        attempted: 3,
        completedAt: "2026-06-10T20:00:00.000Z"
      }),
      session({
        id: "c",
        moduleId: "pitch",
        correct: 1,
        attempted: 1,
        completedAt: "2026-06-08T10:00:00.000Z"
      })
    ]);

    const journal = buildJournal(progress);

    expect(journal).toHaveLength(2);

    const [recent, older] = journal;

    expect(recent.date).toBe("2026-06-10");
    expect(recent.sessionCount).toBe(2);
    expect(recent.correct).toBe(6);
    expect(recent.attempted).toBe(8);
    expect(recent.modules).toEqual(["chords", "ear"]);

    expect(older.date).toBe("2026-06-08");
    expect(older.sessionCount).toBe(1);
    expect(older.modules).toEqual(["pitch"]);
  });

  it("returns an empty array for empty progress", () => {
    expect(buildJournal(defaultProgressState)).toEqual([]);
  });
});

describe("buildWeeklyDigest", () => {
  const now = new Date("2026-06-11T12:00:00.000Z");

  it("counts only sessions within the last 7 days", () => {
    const progress = progressWith([
      session({
        id: "recent-1",
        moduleId: "chords",
        correct: 8,
        attempted: 10,
        completedAt: "2026-06-10T08:00:00.000Z"
      }),
      session({
        id: "recent-2",
        moduleId: "ear",
        correct: 2,
        attempted: 6,
        completedAt: "2026-06-07T08:00:00.000Z"
      }),
      session({
        id: "stale",
        moduleId: "pitch",
        correct: 9,
        attempted: 9,
        completedAt: "2026-05-01T08:00:00.000Z"
      })
    ]);

    const digest = buildWeeklyDigest(progress, now);

    expect(digest.sessionCount).toBe(2);
    expect(digest.correct).toBe(10);
    expect(digest.attempted).toBe(16);
    expect(digest.accuracy).toBeCloseTo(10 / 16);
    expect(digest.activeDays).toBe(2);
    expect(digest.topModule).toBe("chords");
    expect(digest.headline.length).toBeGreaterThan(0);
  });

  it("returns a non-empty headline and zero counts for empty progress", () => {
    const digest = buildWeeklyDigest(defaultProgressState, now);

    expect(digest.sessionCount).toBe(0);
    expect(digest.correct).toBe(0);
    expect(digest.attempted).toBe(0);
    expect(digest.accuracy).toBe(0);
    expect(digest.activeDays).toBe(0);
    expect(digest.topModule).toBeUndefined();
    expect(digest.headline.length).toBeGreaterThan(0);
  });
});
