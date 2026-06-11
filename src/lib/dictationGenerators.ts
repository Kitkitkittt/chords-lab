/**
 * Pure generators for ear-dictation practice prompts.
 *
 * Produces deterministic `PracticePrompt` objects for two dictation modes:
 * - "melodic": a short diatonic C-major motif the learner reconstructs in order
 *   (kind "ordered", scored as an exact ordered match).
 * - "rhythmic": a one-bar 4-cell hit/rest pattern the learner taps back
 *   (kind "grid", scored as an exact ordered match).
 *
 * Prompts attach `audioNotes` and a `playbackPattern` (via the existing
 * audioEngine builders) so they are playable, and keep `answer` a subset of
 * `choices` so the existing practice UI can render and score them with no
 * engine changes. Generation is seed-driven; identical inputs yield identical
 * output (no Math.random).
 */

import { rhythmPattern, sequencePattern } from "./audioEngine";
import type { PracticePrompt } from "./practiceEngine";

export type DictationKind = "melodic" | "rhythmic";

/** Diatonic pitch classes the learner can choose from (C major). */
const melodicChoices = ["C", "D", "E", "F", "G", "A", "B"];

/** Rhythm cells the learner can tap. */
const rhythmicChoices = ["hit", "rest"];

/**
 * Deterministic seeded melody motifs (3-5 scale-step ideas in C major).
 * Each motif is a list of diatonic pitch classes.
 */
const melodyPool: { label: string; notes: string[] }[] = [
  { label: "Step up the tonic triad", notes: ["C", "E", "G"] },
  { label: "Stepwise rise", notes: ["C", "D", "E", "F"] },
  { label: "Arch contour", notes: ["E", "G", "E", "C"] },
  { label: "Dominant approach", notes: ["G", "F", "E", "D", "C"] },
  { label: "Leap and step down", notes: ["C", "G", "F", "E"] },
  { label: "Neighbor turn", notes: ["E", "F", "E", "D", "C"] },
  { label: "Mediant climb", notes: ["E", "G", "A"] },
  { label: "Falling fifth fill", notes: ["G", "E", "D", "C"] }
];

/**
 * Deterministic seeded one-bar rhythm patterns (4 cells of hit/rest).
 */
const rhythmPool: { label: string; cells: string[] }[] = [
  { label: "On the beat", cells: ["hit", "hit", "hit", "hit"] },
  { label: "Rest on two", cells: ["hit", "rest", "hit", "hit"] },
  { label: "Backbeat feel", cells: ["rest", "hit", "rest", "hit"] },
  { label: "Anticipated downbeat", cells: ["hit", "rest", "hit", "rest"] },
  { label: "Two and a tail", cells: ["hit", "hit", "rest", "hit"] },
  { label: "Late entry", cells: ["rest", "hit", "hit", "hit"] },
  { label: "Bookend hits", cells: ["hit", "rest", "rest", "hit"] },
  { label: "Single accent", cells: ["rest", "rest", "hit", "rest"] }
];

/** FNV-style string hash, mirrored from the practice generators. */
function hashSeed(seed: string): number {
  return seed.split("").reduce((hash, char) => {
    return (hash * 31 + char.charCodeAt(0)) >>> 0;
  }, 2166136261);
}

/** Deterministic index into a pool of the given length. */
function seededIndex(seed: string, index: number, length: number): number {
  const value = (hashSeed(`${seed}:${index}`) + index * 1103515245) >>> 0;

  return value % length;
}

function takeBySeed<T>(items: T[], seed: string, index: number): T {
  return items[seededIndex(seed, index, items.length)];
}

/**
 * Assign ascending octaves to a melody of pitch classes so playback steps
 * upward when letters wrap (e.g. ["C","G","E"] -> ["C4","G4","E5"] only when
 * the line would otherwise descend). Mirrors the contour-friendly behaviour of
 * the practice generators' octave helper.
 */
function withMelodyOctaves(notes: string[], startOctave = 4): string[] {
  let octave = startOctave;
  let previousStep = -1;

  return notes.map((note) => {
    const step = melodicChoices.indexOf(note);

    if (previousStep >= 0 && step < previousStep) {
      octave += 1;
    }

    previousStep = step;
    return `${note}${octave}`;
  });
}

/**
 * Build a melodic dictation prompt: play a short C-major motif, then place the
 * heard pitch classes in order.
 */
export function generateMelodicDictation(seed: string, index: number): PracticePrompt {
  const motif = takeBySeed(melodyPool, seed, index);
  const audioNotes = withMelodyOctaves(motif.notes);
  const label = `Melodic dictation ${index + 1}: ${motif.label}`;

  return {
    id: `dictation-melodic-${index}`,
    moduleId: "ear",
    kind: "ordered",
    inputMode: "sequence",
    question: "Play the melody, then place the notes in order.",
    choices: melodicChoices,
    answer: motif.notes,
    explanation: `The melody outlines ${motif.notes.join(" ")} in C major (${motif.label.toLowerCase()}).`,
    citationLabel: "Teoria exercises",
    audioNotes,
    playbackPattern: sequencePattern(label, audioNotes),
    skillTargets: ["ear-training"],
    visualLabel: "Melodic contour"
  };
}

/**
 * Build a rhythmic dictation prompt: play a one-bar 4-cell pattern, then tap
 * the heard hit/rest sequence.
 */
export function generateRhythmicDictation(seed: string, index: number): PracticePrompt {
  const pattern = takeBySeed(rhythmPool, seed, index);
  const cells = pattern.cells;
  const audioNotes = cells.map((cell) => (cell === "hit" ? "C4" : "Rest"));
  const label = `Rhythmic dictation ${index + 1}: ${pattern.label}`;

  return {
    id: `dictation-rhythmic-${index}`,
    moduleId: "rhythm",
    kind: "grid",
    inputMode: "rhythm-grid",
    question: "Play the rhythm, then tap what you heard.",
    choices: rhythmicChoices,
    answer: cells,
    explanation: `The bar reads ${cells.join(" ")} across four beats (${pattern.label.toLowerCase()}).`,
    citationLabel: "Ableton Learning Music",
    audioNotes,
    timeSignature: "4/4",
    playbackPattern: rhythmPattern(label, cells),
    skillTargets: ["rhythm-reading"],
    visualLabel: "4-beat grid"
  };
}

/**
 * Generate `count` deterministic dictation prompts of the given kind. Count is
 * clamped to 1..20. The same arguments always produce identical output.
 */
export function generateDictationPrompts(
  kind: DictationKind,
  count: number,
  seed = "dictation"
): PracticePrompt[] {
  const clamped = Math.max(1, Math.min(Math.floor(count) || 1, 20));
  const build = kind === "melodic" ? generateMelodicDictation : generateRhythmicDictation;

  return Array.from({ length: clamped }, (_, index) => build(`${seed}:${kind}`, index));
}
