import { describe, expect, it } from "vitest";
import { defaultProgressState } from "./progressStorage";
import {
  parseProgressImport,
  previewProgressImport,
  serializeProgressExport
} from "./progressExport";

describe("progress export", () => {
  it("serializes and parses a complete local progress bundle", () => {
    const exported = serializeProgressExport({
      ...defaultProgressState,
      completedLessonSlugs: ["sound-pitch"],
      generatedSessionHistory: [
        {
          id: "session-1",
          moduleId: "staff",
          configSummary: "beginner",
          correct: 1,
          attempted: 2,
          missedPromptIds: ["staff-click-1"],
          completedAt: "2026-05-31T00:00:00.000Z"
        }
      ]
    });
    const preview = previewProgressImport(exported);
    const parsed = parseProgressImport(exported);

    expect(preview.valid).toBe(true);
    expect(preview.lessonCount).toBe(1);
    expect(preview.sessionCount).toBe(1);
    expect(parsed?.completedLessonSlugs).toEqual(["sound-pitch"]);
  });

  it("reports invalid JSON before import", () => {
    expect(previewProgressImport("{").valid).toBe(false);
    expect(parseProgressImport("{")).toBeUndefined();
  });

  it("accepts a backup exported by the current build", () => {
    const exported = serializeProgressExport({
      ...defaultProgressState,
      completedLessonSlugs: ["sound-pitch"]
    });

    // Regression: the gate hard-coded schemaVersion === 1, so bumping the
    // schema made the app reject its own exports.
    expect(previewProgressImport(exported).valid).toBe(true);
    expect(parseProgressImport(exported)?.completedLessonSlugs).toEqual([
      "sound-pitch"
    ]);
  });

  it("accepts an older unversioned backup instead of discarding it", () => {
    const legacy = JSON.stringify({
      completedLessonSlugs: ["sound-pitch"],
      bookmarkedLessonSlugs: []
    });

    expect(previewProgressImport(legacy).valid).toBe(true);
    expect(parseProgressImport(legacy)?.completedLessonSlugs).toEqual([
      "sound-pitch"
    ]);
  });

  it("rejects a backup from a newer build rather than mangling it", () => {
    const fromFuture = JSON.stringify({
      schemaVersion: 999,
      exportedAt: "2026-08-06T00:00:00.000Z",
      appVersion: "99.0.0",
      progress: { ...defaultProgressState, schemaVersion: 999 }
    });

    expect(previewProgressImport(fromFuture).valid).toBe(false);
    expect(parseProgressImport(fromFuture)).toBeUndefined();
  });
});
