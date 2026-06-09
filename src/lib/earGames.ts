import { Note } from "tonal";
import { chordNotes, formatInterval, intervalSemitones } from "./theory";

/**
 * Casual ear games for the Play hub.
 *
 * These are deliberately low-stakes: a round plays something, the player taps a
 * guess, and the answer is revealed immediately with a friendly note. There is
 * NO scoring, NO timer, and nothing is persisted to progress. The goal is play
 * and curiosity, not assessment (graded ear training lives in Practice).
 *
 * This module is pure: it only generates round data. Playback and UI live in
 * the component layer.
 */

export type EarGameId = "interval" | "chord-quality" | "higher-lower";

export type EarGameOption = {
  id: string;
  label: string;
};

export type EarGameRound = {
  game: EarGameId;
  /** Notes to sound, in order, when previewing the round. */
  notes: string[];
  /** Whether the notes should play together (chord) or in sequence. */
  play: "chord" | "sequence";
  options: EarGameOption[];
  /** The id of the correct option. */
  answerId: string;
  /** Friendly one-line explanation shown on reveal. */
  reveal: string;
  /** Short prompt shown above the options. */
  prompt: string;
};

export type EarGameMeta = {
  id: EarGameId;
  label: string;
  blurb: string;
};

export const EAR_GAMES: EarGameMeta[] = [
  {
    id: "interval",
    label: "Name the gap",
    blurb: "Two notes play. Which interval was it?"
  },
  {
    id: "chord-quality",
    label: "Major or minor?",
    blurb: "Hear a chord and feel its colour."
  },
  {
    id: "higher-lower",
    label: "Higher or lower?",
    blurb: "Two notes. Did the pitch rise or fall?"
  }
];

const ROOTS = ["C", "D", "E", "F", "G", "A"];

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Intervals a beginner can reasonably distinguish, with friendly labels.
const INTERVAL_CHOICES: { interval: string; label: string }[] = [
  { interval: "2M", label: "Major 2nd" },
  { interval: "3m", label: "Minor 3rd" },
  { interval: "3M", label: "Major 3rd" },
  { interval: "4P", label: "Perfect 4th" },
  { interval: "5P", label: "Perfect 5th" },
  { interval: "8P", label: "Octave" }
];

function intervalRound(): EarGameRound {
  const root = `${pick(ROOTS)}4`;
  const choice = pick(INTERVAL_CHOICES);
  const top = Note.transpose(root, choice.interval);

  const distractors = shuffle(
    INTERVAL_CHOICES.filter((item) => item.interval !== choice.interval)
  ).slice(0, 3);
  const options = shuffle([choice, ...distractors]).map((item) => ({
    id: item.interval,
    label: item.label
  }));

  return {
    game: "interval",
    notes: [root, top],
    play: "sequence",
    options,
    answerId: choice.interval,
    prompt: "Which interval did you hear?",
    reveal: `That was a ${formatInterval(choice.interval, {
      verbose: true
    })} (${intervalSemitones(choice.interval)} semitones).`
  };
}

function chordQualityRound(): EarGameRound {
  const root = pick(ROOTS);
  const qualities = [
    { id: "major", label: "Major", symbol: `${root}` },
    { id: "minor", label: "Minor", symbol: `${root}m` }
  ];
  const choice = pick(qualities);
  const notes = chordNotes(choice.symbol).map((pc) => `${pc}4`);

  return {
    game: "chord-quality",
    notes,
    play: "chord",
    options: shuffle(qualities).map((item) => ({
      id: item.id,
      label: item.label
    })),
    answerId: choice.id,
    prompt: "Major or minor?",
    reveal:
      choice.id === "major"
        ? "Major chords sound bright and open."
        : "Minor chords sound darker and softer."
  };
}

function higherLowerRound(): EarGameRound {
  const root = `${pick(ROOTS)}4`;
  // A clear leap up or down so the direction is unambiguous.
  const leap = pick(["3M", "4P", "5P", "8P"]);
  const goesUp = Math.random() < 0.5;
  const second = goesUp
    ? Note.transpose(root, leap)
    : Note.transpose(root, `-${leap}`);

  return {
    game: "higher-lower",
    notes: [root, second],
    play: "sequence",
    options: [
      { id: "higher", label: "Higher" },
      { id: "lower", label: "Lower" }
    ],
    answerId: goesUp ? "higher" : "lower",
    prompt: "Did the second note go higher or lower?",
    reveal: goesUp
      ? "The second note was higher — the pitch rose."
      : "The second note was lower — the pitch fell."
  };
}

/** Build a fresh round for the given game. */
export function nextEarGameRound(game: EarGameId): EarGameRound {
  switch (game) {
    case "chord-quality":
      return chordQualityRound();
    case "higher-lower":
      return higherLowerRound();
    case "interval":
    default:
      return intervalRound();
  }
}

export function earGameMeta(game: EarGameId): EarGameMeta {
  return EAR_GAMES.find((item) => item.id === game) ?? EAR_GAMES[0];
}
