import { describe, expect, it } from "vitest";
import {
  createPracticeSessionConfig,
  generatePracticePrompts
} from "./practiceGenerators";
import {
  countTemplatesForModule,
  validateRhythmMeasure
} from "./practiceTemplates";

describe("practice generators", () => {
  it("creates deterministic generated sessions from a seed", () => {
    const config = createPracticeSessionConfig("scales", {
      promptCount: 4,
      key: "G",
      topic: "major",
      seed: "scale-test"
    });

    expect(generatePracticePrompts(config)).toEqual(
      generatePracticePrompts(config)
    );
    expect(generatePracticePrompts(config)).toHaveLength(4);
  });

  it("generates broad V6 prompt modes with shared playback specs", () => {
    expect(
      generatePracticePrompts(createPracticeSessionConfig("staff"))[0].inputMode
    ).toBe("staff-click");
    expect(
      generatePracticePrompts(createPracticeSessionConfig("rhythm"))[0].inputMode
    ).toBe("rhythm-grid");
    expect(
      generatePracticePrompts(createPracticeSessionConfig("harmony"))[0].inputMode
    ).toBe("harmony-board");
    expect(
      generatePracticePrompts(createPracticeSessionConfig("ear"))[0].inputMode
    ).toBe("listening");
    expect(
      generatePracticePrompts(createPracticeSessionConfig("instruments"))[0]
        .inputMode
    ).toBe("instrument-board");
    expect(
      generatePracticePrompts(createPracticeSessionConfig("chords"))[0]
        .playbackPattern
    ).toMatchObject({ mode: "chord" });
    expect(
      generatePracticePrompts(createPracticeSessionConfig("rhythm"))[0]
        .playbackPattern
    ).toMatchObject({ mode: "rhythm" });
  });

  it("tracks V6 prompt template breadth for every module", () => {
    for (const moduleId of [
      "pitch",
      "staff",
      "scales",
      "intervals",
      "chords",
      "harmony",
      "rhythm",
      "ear",
      "instruments"
    ] as const) {
      expect(countTemplatesForModule(moduleId)).toBeGreaterThanOrEqual(10);
    }
  });

  it("validates rhythm measure totals for composer prompts", () => {
    expect(
      validateRhythmMeasure(["dotted-quarter", "eighth", "quarter", "quarter"])
    ).toEqual({ valid: true, totalBeats: 4 });
    expect(validateRhythmMeasure(["quarter", "eighth"])).toEqual({
      valid: false,
      totalBeats: 1.5
    });
    expect(validateRhythmMeasure(["quarter-rest", "quarter", "half"])).toEqual({
      valid: true,
      totalBeats: 4
    });
  });
});
