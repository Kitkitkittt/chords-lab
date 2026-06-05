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
});
