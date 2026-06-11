/**
 * Pure generators for Phase 6 intermediate harmony practice prompts:
 * secondary dominants, borrowed chords (modal mixture), and modulation /
 * pivot-chord recognition.
 *
 * Every generator returns a standard {@link PracticePrompt} with kind
 * "single" so the prompts plug directly into the existing practice UI and
 * {@link scorePracticeAnswer}. Output is fully deterministic: the same
 * (seed, index) inputs always produce identical prompts, and `answer` is
 * always one of `choices`. No engine changes and no external dependencies.
 */

import type { PracticePrompt } from "./practiceEngine";

export type AdvancedHarmonyTopic =
  | "secondary-dominants"
  | "borrowed-chords"
  | "modulation";

/** FNV-style string hash mirrored from practiceGenerators for stable seeds. */
function hashSeed(seed: string): number {
  return seed.split("").reduce((hash, char) => {
    return (hash * 31 + char.charCodeAt(0)) >>> 0;
  }, 2166136261);
}

/** Deterministic index into a collection of `length` items for a given seed. */
function seededIndex(seed: string, index: number, length: number): number {
  const value = (hashSeed(`${seed}:${index}`) + index * 1103515245) >>> 0;

  return value % length;
}

/** Deterministically pick one item from a pool by seed + index. */
function takeBySeed<T>(items: T[], seed: string, index: number): T {
  if (index === 0) {
    return items[0];
  }

  return items[seededIndex(seed, index, items.length)];
}

/** Deterministic Fisher-Yates shuffle so choices are stable per seed. */
function shuffleBySeed<T>(items: T[], seed: string, index: number): T[] {
  const result = [...items];

  for (let position = result.length - 1; position > 0; position -= 1) {
    const swap = seededIndex(`${seed}:shuffle:${index}`, position, position + 1);
    [result[position], result[swap]] = [result[swap], result[position]];
  }

  return result;
}

/**
 * Build a 4-option choice list that always contains `answer`, drawing the
 * remaining distractors deterministically from `pool` (excluding the answer).
 */
function buildChoices(
  answer: string,
  pool: string[],
  seed: string,
  index: number
): string[] {
  const distractors = pool.filter((option) => option !== answer);
  const picked: string[] = [];

  for (
    let offset = 0;
    picked.length < 3 && offset < distractors.length * 2;
    offset += 1
  ) {
    const candidate = takeBySeed(distractors, `${seed}:distractor`, index + offset);

    if (!picked.includes(candidate)) {
      picked.push(candidate);
    }
  }

  return shuffleBySeed([answer, ...picked], seed, index);
}

const CITATION = "Open Music Theory";
const ROMAN_SKILL = ["roman-numerals"];

type SecondaryDominantEntry = {
  numeral: string;
  target: string;
  answer: string;
};

/** Secondary dominants in C major (each tonicizes a diatonic chord). */
const secondaryDominants: SecondaryDominantEntry[] = [
  { numeral: "V/ii", target: "the supertonic (ii)", answer: "A7" },
  { numeral: "V/iii", target: "the mediant (iii)", answer: "B7" },
  { numeral: "V/IV", target: "the subdominant (IV)", answer: "C7" },
  { numeral: "V/V", target: "the dominant (V)", answer: "D7" },
  { numeral: "V/vi", target: "the submediant (vi)", answer: "E7" }
];

const secondaryDominantPool = secondaryDominants.map((entry) => entry.answer);

export function generateSecondaryDominantPrompt(
  seed: string,
  index: number
): PracticePrompt {
  const entry = takeBySeed(secondaryDominants, seed, index);
  const choices = buildChoices(entry.answer, secondaryDominantPool, seed, index);

  return {
    id: `adv-secondary-${index}`,
    moduleId: "harmony",
    kind: "single",
    question: `In C major, which chord is ${entry.numeral} (the secondary dominant of ${entry.target})?`,
    choices,
    answer: [entry.answer],
    explanation: `${entry.numeral} is a dominant seventh built a fifth above its target, so it is spelled ${entry.answer} and resolves to ${entry.target}.`,
    citationLabel: CITATION,
    skillTargets: ROMAN_SKILL
  };
}

type BorrowedChordEntry = {
  label: string;
  answer: string;
};

/** Borrowed chords (modal mixture) commonly used in C major. */
const borrowedChords: BorrowedChordEntry[] = [
  { label: "the minor iv", answer: "F minor" },
  { label: "the bVII", answer: "Bb major" },
  { label: "the bVI", answer: "Ab major" },
  { label: "the bIII", answer: "Eb major" },
  { label: "the iio (diminished, borrowed)", answer: "D diminished" }
];

const borrowedChordPool = borrowedChords.map((entry) => entry.answer);

export function generateBorrowedChordPrompt(
  seed: string,
  index: number
): PracticePrompt {
  const entry = takeBySeed(borrowedChords, seed, index);
  const choices = buildChoices(entry.answer, borrowedChordPool, seed, index);

  return {
    id: `adv-borrowed-${index}`,
    moduleId: "harmony",
    kind: "single",
    question: `Which borrowed chord is ${entry.label} in C major?`,
    choices,
    answer: [entry.answer],
    explanation: `Modal mixture borrows ${entry.label} from C minor, giving ${entry.answer}.`,
    citationLabel: CITATION,
    skillTargets: ROMAN_SKILL
  };
}

type ModulationEntry = {
  fromKey: string;
  toKey: string;
  /** Chords diatonic to both keys; any is a valid pivot. */
  pivots: string[];
};

/** Modulation scenarios with chords diatonic to both source and target keys. */
const modulations: ModulationEntry[] = [
  {
    fromKey: "C major",
    toKey: "G major",
    pivots: ["C major", "A minor", "E minor", "G major"]
  },
  {
    fromKey: "C major",
    toKey: "F major",
    pivots: ["C major", "D minor", "A minor", "F major"]
  },
  {
    fromKey: "G major",
    toKey: "D major",
    pivots: ["G major", "E minor", "B minor", "D major"]
  },
  {
    fromKey: "C major",
    toKey: "A minor",
    pivots: ["C major", "E minor", "A minor", "D minor"]
  },
  {
    fromKey: "F major",
    toKey: "C major",
    pivots: ["F major", "D minor", "A minor", "C major"]
  }
];

/** Plausible non-pivot distractors that are not diatonic to both keys. */
const modulationDistractors = [
  "B major",
  "F# minor",
  "Db major",
  "C# minor",
  "Ab major",
  "Eb major"
];

export function generateModulationPrompt(
  seed: string,
  index: number
): PracticePrompt {
  const entry = takeBySeed(modulations, seed, index);
  const answer = takeBySeed(entry.pivots, `${seed}:pivot`, index);
  const choices = buildChoices(answer, modulationDistractors, seed, index);

  return {
    id: `adv-modulation-${index}`,
    moduleId: "harmony",
    kind: "single",
    question: `A song moves from ${entry.fromKey} to ${entry.toKey}. Which chord is a common pivot (diatonic to both keys)?`,
    choices,
    answer: [answer],
    explanation: `A pivot chord belongs to both keys. ${answer} is diatonic to ${entry.fromKey} and ${entry.toKey}, so it can smoothly reinterpret the harmony.`,
    citationLabel: CITATION,
    skillTargets: ROMAN_SKILL
  };
}

export function generateAdvancedHarmonyPrompts(
  topic: AdvancedHarmonyTopic,
  count: number,
  seed = "advanced-harmony"
): PracticePrompt[] {
  const promptCount = Math.max(1, Math.min(Number.isFinite(count) ? count : 1, 20));
  const generators: Record<
    AdvancedHarmonyTopic,
    (index: number) => PracticePrompt
  > = {
    "secondary-dominants": (index) => generateSecondaryDominantPrompt(seed, index),
    "borrowed-chords": (index) => generateBorrowedChordPrompt(seed, index),
    modulation: (index) => generateModulationPrompt(seed, index)
  };
  const generator = generators[topic];

  return Array.from({ length: promptCount }, (_, index) => generator(index));
}
