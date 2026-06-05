import { readFileSync } from "node:fs";
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
