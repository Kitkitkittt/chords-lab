import { describe, expect, it } from "vitest";
import {
  formatPracticeScore,
  getNextPracticePrompt,
  scorePracticeAnswer
} from "./practiceEngine";
import type { PracticePrompt } from "./practiceEngine";

const prompts: PracticePrompt[] = [
  {
    id: "one",
    moduleId: "pitch",
    kind: "single",
    question: "Name the note.",
    choices: ["C", "D"],
    answer: ["C"],
    explanation: "The note is C."
  },
  {
    id: "two",
    moduleId: "chords",
    kind: "chord-builder",
    question: "Build C major.",
    choices: ["C", "E", "G", "A"],
    answer: ["C", "E", "G"],
    explanation: "C major is C E G."
  },
  {
    id: "three",
    moduleId: "scales",
    kind: "ordered",
    question: "Build C major.",
    choices: ["C", "D", "E"],
    answer: ["C", "D", "E"],
    explanation: "Order matters in scale construction."
  },
  {
    id: "four",
    moduleId: "rhythm",
    kind: "grid",
    question: "Tap a rhythm.",
    choices: ["hit", "rest"],
    answer: ["hit", "rest", "hit"],
    explanation: "The rest keeps its position."
  }
];

describe("practice engine", () => {
  it("scores single and multi-answer prompts", () => {
    expect(scorePracticeAnswer(prompts[0], ["C"]).status).toBe("correct");
    expect(scorePracticeAnswer(prompts[0], ["D"]).message).toContain(
      "Expected C"
    );
    expect(scorePracticeAnswer(prompts[1], ["G", "C", "E"]).status).toBe(
      "correct"
    );
  });

  it("scores ordered and grid prompts by sequence", () => {
    expect(scorePracticeAnswer(prompts[2], ["C", "D", "E"]).status).toBe(
      "correct"
    );
    expect(scorePracticeAnswer(prompts[2], ["E", "D", "C"]).status).toBe(
      "incorrect"
    );
    expect(scorePracticeAnswer(prompts[3], ["hit", "rest", "hit"]).status).toBe(
      "correct"
    );
  });

  it("cycles to the next prompt and formats local score", () => {
    expect(getNextPracticePrompt(prompts, "one")?.id).toBe("two");
    expect(getNextPracticePrompt(prompts, "two")?.id).toBe("three");
    expect(getNextPracticePrompt(prompts, "four")?.id).toBe("one");
    expect(formatPracticeScore({ correct: 2, attempted: 3 })).toBe(
      "2/3 correct"
    );
    expect(formatPracticeScore()).toBe("No attempts yet");
  });
});
