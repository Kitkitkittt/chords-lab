import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const lessonDir = join(process.cwd(), "src", "content", "lessons");

const lessonText = [
  "sound-pitch.mdx",
  "staff-keyboard.mdx",
  "rhythm-meter.mdx",
  "accidentals-steps.mdx",
  "scales-keys.mdx",
  "intervals.mdx",
  "triads.mdx",
  "review-glossary.mdx"
]
  .map((fileName) => readFileSync(join(lessonDir, fileName), "utf8"))
  .join("\n")
  .toLowerCase();

const requiredTopicGroups = [
  ["sound", "pitch", "octave", "note letter"],
  ["staff", "clef", "ledger", "keyboard"],
  ["rhythm", "beat", "measure", "note value", "rest", "dot", "tie", "triplet"],
  ["accidental", "half step", "whole step", "enharmonic"],
  ["major scale", "minor", "scale degree", "key signature", "circle of fifths"],
  ["generic", "interval quality", "melodic", "harmonic", "inversion"],
  ["triad", "major", "minor", "diminished", "augmented", "root position", "chord symbol"],
  ["review", "glossary", "seventh chords", "roman numerals", "cadences"]
];

describe("beginner curriculum coverage", () => {
  it("mentions each explicit topic group from the plan", () => {
    for (const group of requiredTopicGroups) {
      for (const term of group) {
        expect(lessonText, `missing curriculum term: ${term}`).toContain(term);
      }
    }
  });
});

/**
 * Every advanced-harmony drill category needs a lesson to learn from, otherwise
 * /practice/advanced-harmony asks questions the course never teaches.
 */
const advancedHarmonyLessons: Record<string, string[]> = {
  "secondary-dominants.mdx": [
    "secondary dominant",
    "tonicize",
    "v/v",
    "dominant seventh",
    "resolve"
  ],
  "borrowed-chords.mdx": [
    "borrowed",
    "modal mixture",
    "parallel minor",
    "bvii",
    "minor iv"
  ],
  "modulation.mdx": ["modulation", "pivot", "common chord", "new key"]
};

describe("advanced harmony curriculum coverage", () => {
  it("ships a lesson for every drillable advanced-harmony category", () => {
    for (const [fileName, terms] of Object.entries(advancedHarmonyLessons)) {
      const path = join(lessonDir, fileName);

      expect(existsSync(path), `missing lesson file: ${fileName}`).toBe(true);

      const text = readFileSync(path, "utf8").toLowerCase();
      for (const term of terms) {
        expect(text, `${fileName} is missing: ${term}`).toContain(term);
      }
    }
  });

  it("registers those lessons in the course so they are reachable", () => {
    const course = readFileSync(
      join(process.cwd(), "src", "data", "course.ts"),
      "utf8"
    );

    for (const slug of [
      "secondary-dominants",
      "borrowed-chords",
      "modulation"
    ]) {
      expect(course, `course.ts does not register ${slug}`).toContain(slug);
    }
  });
});

