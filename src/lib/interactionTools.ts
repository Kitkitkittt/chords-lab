import { Chord, Note } from "tonal";
import { chordSummary } from "./theory";

function pitchClass(note: string): string {
  return Note.pitchClass(note) || note.replace(/[0-9]/g, "");
}

export function detectChordStack(notes: string[]): string {
  const uniqueNotes = Array.from(new Set(notes.map(pitchClass))).filter(Boolean);

  if (uniqueNotes.length < 3) {
    return uniqueNotes.length > 0 ? "Keep stacking" : "No chord yet";
  }

  const matches = Chord.detect(uniqueNotes);
  const inversionHint =
    uniqueNotes[0] && matches[0] && !matches[0].startsWith(uniqueNotes[0])
      ? ` over ${uniqueNotes[0]} bass`
      : "";

  return matches[0] ? `${matches[0]}${inversionHint}` : "Unlabeled color";
}

export type ChordStackDescription = {
  /** Same string as `detectChordStack`, including any inversion hint. */
  label: string;
  /** Detected chord symbol without inversion hint, or null when unlabeled. */
  symbol: string | null;
  /** Teoria-style quality/type label, e.g. "major", "dominant seventh". */
  quality: string | null;
  /** "triad" | "tetrad" | ... or null when no chord is detected. */
  cardinality: string | null;
};

/**
 * Richer chord-stack detection that adds a teoria-style quality and
 * cardinality label on top of the detected symbol. Useful for explaining what
 * a learner just stacked, not only naming it.
 */
export function describeChordStack(notes: string[]): ChordStackDescription {
  const label = detectChordStack(notes);
  const symbolMatch = label.match(/^([^\s]+?)(?: over .*)?$/);
  const symbol =
    label === "Keep stacking" ||
    label === "No chord yet" ||
    label === "Unlabeled color"
      ? null
      : symbolMatch?.[1] ?? null;

  if (!symbol) {
    return { label, symbol: null, quality: null, cardinality: null };
  }

  const summary = chordSummary(symbol);

  return {
    label,
    symbol,
    quality: summary.empty ? null : summary.quality,
    cardinality: summary.empty ? null : summary.cardinality
  };
}

export function calculateTapTempo(tapTimes: number[]): number | undefined {
  if (tapTimes.length < 2) {
    return undefined;
  }

  const intervals = tapTimes
    .slice(1)
    .map((time, index) => time - tapTimes[index])
    .filter((interval) => interval >= 240 && interval <= 2000);

  if (intervals.length === 0) {
    return undefined;
  }

  const average =
    intervals.reduce((total, interval) => total + interval, 0) / intervals.length;

  return Math.round(60000 / average);
}

export function quantizeBeatPosition(rawBeat: number, subdivision = 0.5): number {
  return Math.max(0, Math.round(rawBeat / subdivision) * subdivision);
}
