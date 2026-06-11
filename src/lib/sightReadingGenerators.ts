/**
 * Sight-reading practice generators.
 *
 * Pure (no React, no Tone.js) deterministic builders that turn a seed + index
 * into a short notated melody the learner reads off the staff and reconstructs
 * by selecting note names in order. Output is a standard `PracticePrompt` that
 * the existing practice UI already understands: the melody is drawn from a
 * `renderSpec` of type "staff" (VexFlow EasyScore "Note/duration" tokens) and
 * is playable through a `sequencePattern` playback pattern.
 *
 * Melodies stay diatonic in C major so the seven pitch-class choices
 * (C D E F G A B) always cover the answer. Beginner prompts walk stepwise in
 * quarter notes; intermediate prompts add an occasional leap and a closing
 * half note. Everything is derived from the seed, so identical inputs always
 * produce identical prompts.
 */
import { sequencePattern } from "./audioEngine";
import type { PracticePrompt } from "./practiceEngine";

export type SightReadingLevel = "beginner" | "intermediate";

/** Diatonic C-major ladder spanning C4..C5, used to build melodies. */
const C_MAJOR_LADDER = ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5"];

/** The seven C-major pitch-class choices offered to the learner. */
const C_MAJOR_PITCH_CLASSES = ["C", "D", "E", "F", "G", "A", "B"];

const MIN_PROMPTS = 1;
const MAX_PROMPTS = 20;
const DEFAULT_SEED = "sight-reading";

/** FNV-style deterministic hash matching the repo's other generators. */
function hashSeed(seed: string): number {
  return seed.split("").reduce((hash, char) => {
    return (hash * 31 + char.charCodeAt(0)) >>> 0;
  }, 2166136261);
}

/** Deterministic non-negative integer in [0, mod) derived from a seed + step. */
function seededValue(seed: string, step: number, mod: number): number {
  const value = (hashSeed(`${seed}:${step}`) + step * 1103515245) >>> 0;

  return value % mod;
}

/** Strip the octave digit from a note, e.g. "C4" -> "C". */
function pitchClassOf(note: string): string {
  return note.replace(/[0-9]/g, "");
}

/** Clamp a ladder position into the valid C4..C5 range. */
function clampPosition(position: number): number {
  if (position < 0) {
    return 0;
  }

  if (position > C_MAJOR_LADDER.length - 1) {
    return C_MAJOR_LADDER.length - 1;
  }

  return position;
}

type Melody = {
  notes: string[];
  durations: string[];
};

/**
 * Build a deterministic diatonic melody for the given level. Beginner melodies
 * are four stepwise quarter notes; intermediate melodies are five or six notes
 * that may leap by a third and close on a half note.
 */
function buildMelody(seed: string, index: number, level: SightReadingLevel): Melody {
  const noteCount =
    level === "beginner" ? 4 : 5 + seededValue(`${seed}:count`, index, 2);
  let position = seededValue(`${seed}:start`, index, C_MAJOR_LADDER.length);
  const notes = [C_MAJOR_LADDER[position]];

  for (let step = 1; step < noteCount; step += 1) {
    if (level === "beginner") {
      // Stepwise motion: move up or down a single ladder rung.
      const direction = seededValue(`${seed}:step:${index}`, step, 2) === 0 ? -1 : 1;
      position = clampPosition(position + direction);
    } else {
      // Intermediate motion may leap a third (two rungs) in either direction.
      const moves = [-2, -1, 1, 2];
      const move = moves[seededValue(`${seed}:leap:${index}`, step, moves.length)];
      position = clampPosition(position + move);
    }

    notes.push(C_MAJOR_LADDER[position]);
  }

  const durations = notes.map((_, noteIndex) =>
    level === "intermediate" && noteIndex === notes.length - 1 ? "h" : "q"
  );

  return { notes, durations };
}

/**
 * Generate a single sight-reading prompt: a short notated C-major melody the
 * learner reads and reconstructs by selecting pitch classes in order.
 */
export function generateSightReadingPrompt(
  seed: string,
  index: number,
  level: SightReadingLevel = "beginner"
): PracticePrompt {
  const { notes, durations } = buildMelody(seed, index, level);
  const notation = notes
    .map((note, noteIndex) => `${note}/${durations[noteIndex]}`)
    .join(", ");
  const answer = notes.map(pitchClassOf);
  const audioNotes = [...notes];
  const playbackLabel = `Sight-reading melody (${level})`;

  return {
    id: `sight-reading-${level}-${index}`,
    moduleId: "staff",
    kind: "ordered",
    inputMode: "sequence",
    question: "Read the melody and place the note names in order. Play it to check.",
    choices: [...C_MAJOR_PITCH_CLASSES],
    answer,
    explanation: `The melody reads ${answer.join(", ")}.`,
    citationLabel: "MusicTheory.net lessons",
    skillTargets: ["note-reading"],
    notation,
    clef: "treble",
    audioNotes,
    playbackPattern: sequencePattern(playbackLabel, audioNotes),
    renderSpec: {
      type: "staff",
      clef: "treble",
      notation
    }
  };
}

/**
 * Generate `count` (clamped to 1..20) deterministic sight-reading prompts for a
 * level. The same arguments always produce the same prompts.
 */
export function generateSightReadingPrompts(
  count: number,
  level: SightReadingLevel = "beginner",
  seed: string = DEFAULT_SEED
): PracticePrompt[] {
  const safeCount = Math.max(
    MIN_PROMPTS,
    Math.min(Number.isFinite(count) ? count : MIN_PROMPTS, MAX_PROMPTS)
  );

  return Array.from({ length: safeCount }, (_, index) =>
    generateSightReadingPrompt(seed, index, level)
  );
}
