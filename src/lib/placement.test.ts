import { describe, expect, it } from "vitest";
import { generatePlacementPrompts } from "./placement";

describe("generatePlacementPrompts", () => {
  it("is deterministic and covers each core module once", () => {
    const prompts = generatePlacementPrompts("test-seed");

    expect(prompts).toEqual(generatePlacementPrompts("test-seed"));
    expect(prompts.map((prompt) => prompt.moduleId)).toEqual([
      "pitch",
      "staff",
      "scales",
      "intervals",
      "chords",
      "harmony",
      "rhythm",
      "ear"
    ]);
  });

  it("uses unique placement prompt ids", () => {
    const prompts = generatePlacementPrompts();

    expect(prompts.every((prompt) => prompt.id.startsWith("placement-"))).toBe(true);
    expect(new Set(prompts.map((prompt) => prompt.id)).size).toBe(8);
  });
});
