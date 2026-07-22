import { describe, expect, it } from "vitest";
import { generateContrastPrompts } from "./contrastPrompts";

describe("generateContrastPrompts", () => {
  it("is deterministic and rotates through all contrast families", () => {
    const prompts = generateContrastPrompts("contrast-test", 6);

    expect(prompts).toEqual(generateContrastPrompts("contrast-test", 6));
    expect(prompts.map((prompt) => prompt.id)).toEqual([
      "contrast-interval-1",
      "contrast-staff-2",
      "contrast-enharmonic-3",
      "contrast-interval-4",
      "contrast-staff-5",
      "contrast-enharmonic-6"
    ]);
  });

  it("keeps inversion, clef transfer, and enharmonic/register context", () => {
    const [interval, staff, enharmonic] = generateContrastPrompts("contrast-test", 3);

    expect(interval.question).toMatch(/inverts/i);
    expect(interval.topicTags).toContain("melodic");
    expect(staff.question).toMatch(/bass clef/i);
    expect(staff.skillTargets).toContain("staff-position");
    expect(enharmonic.question).toMatch(/enharmonic/i);
    expect(enharmonic.keyboardNotes).toHaveLength(2);
  });
});
