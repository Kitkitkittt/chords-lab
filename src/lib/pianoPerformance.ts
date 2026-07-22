import { Note } from "tonal";
import { triadNotes } from "./music";
import { chordsToRomanNumerals, progressionChords } from "./theory";

export type ChordEvaluation = {
  complete: boolean;
  missing: string[];
  extra: string[];
  bass: string | null;
  inversion: string;
};

export type SequenceEvaluation = {
  complete: boolean;
  matched: number;
  nextNote: string | null;
  mistake: string | null;
};

const CHROMATIC = [
  "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"
];
const KEYBOARD = ["a", "w", "s", "e", "d", "f", "t", "g", "y", "h", "u", "j"];
const INVERSIONS = ["Root position", "First inversion", "Second inversion", "Third inversion"];
type ParsedNote = { chroma: number; pitchClass: string; midi: number | null };

function parseNote(note: string): ParsedNote | null {
  const pitchClass = Note.pitchClass(note);
  const chroma = Note.chroma(note);

  if (!pitchClass || typeof chroma !== "number") {
    return null;
  }

  const midi = Note.midi(note);
  return { chroma, pitchClass, midi: typeof midi === "number" ? midi : null };
}

function uniqueNotes(notes: string[]): ParsedNote[] {
  const unique = new Map<number, ParsedNote>();

  for (const note of notes) {
    const parsed = parseNote(note);
    if (parsed) {
      unique.set(parsed.chroma, parsed);
    }
  }

  return [...unique.values()];
}

export function evaluatePianoChord(
  targetNotes: string[],
  playedNotes: string[]
): ChordEvaluation {
  const targets = uniqueNotes(targetNotes);
  const played = uniqueNotes(playedNotes);
  const targetChromas = new Set(targets.map(({ chroma }) => chroma));
  const playedChromas = new Set(played.map(({ chroma }) => chroma));
  const missing = targets
    .filter(({ chroma }) => !playedChromas.has(chroma))
    .map(({ pitchClass }) => pitchClass);
  const extra = played
    .filter(({ chroma }) => !targetChromas.has(chroma))
    .map(({ pitchClass }) => pitchClass);
  const absolute = playedNotes
    .map(parseNote)
    .filter((note): note is ParsedNote & { midi: number } => note?.midi !== null);
  const bassNote = absolute.sort((a, b) => a.midi - b.midi)[0] ?? played[0];

  if (!bassNote) {
    return { complete: false, missing, extra, bass: null, inversion: "Not started" };
  }

  const targetIndex = targets.findIndex(({ chroma }) => chroma === bassNote.chroma);
  const inversion = targetIndex < 0
    ? "Outside bass"
    : INVERSIONS[targetIndex] ?? "Third inversion";

  return {
    complete: targets.length > 0 && missing.length === 0 && extra.length === 0,
    missing,
    extra,
    bass: bassNote.pitchClass,
    inversion
  };
}

export function evaluatePianoSequence(
  targetNotes: string[],
  playedNotes: string[]
): SequenceEvaluation {
  const targets = targetNotes.map(parseNote).filter((note): note is ParsedNote => note !== null);
  const played = playedNotes.map(parseNote);
  let matched = 0;
  let mistake: string | null = null;

  for (const note of played) {
    const expected = targets[matched];
    if (!expected || !note || note.midi === null || expected.midi === null || note.midi !== expected.midi) {
      mistake = note?.pitchClass ?? null;
      break;
    }
    matched += 1;
  }

  const complete = matched === targets.length && played.length === targets.length;
  return {
    complete,
    matched,
    nextNote: matched < targets.length ? targets[matched].pitchClass : null,
    mistake
  };
}

export function progressionChordNotes(symbols: string[], octave = 4): string[][] {
  if (!Number.isInteger(octave) || octave < 1 || octave > 7) {
    return symbols.map(() => []);
  }

  return symbols.map((symbol) => {
    const notes = triadNotes(symbol);
    let previousMidi = -Infinity;
    const absolute: string[] = [];

    for (const note of notes) {
      let currentOctave = octave;
      let midi = Note.midi(`${note}${currentOctave}`);
      if (typeof midi !== "number") {
        return [];
      }
      while (midi <= previousMidi) {
        currentOctave += 1;
        midi += 12;
      }
      absolute.push(`${note}${currentOctave}`);
      previousMidi = midi;
    }

    return absolute;
  });
}

export function pianoMaterialForKey(tonic: string): {
  quests: string[];
  progressions: string[][];
} {
  const questNumerals = ["I", "vi", "IV", "V7", "ii", "iii"];
  const progressionNumerals = [
    ["I", "V", "vi", "IV"],
    ["ii", "V7", "I", "I"],
    ["vi", "IV", "I", "V"]
  ];

  return {
    quests: progressionChords(questNumerals, tonic),
    progressions: progressionNumerals.map((numerals) => progressionChords(numerals, tonic))
  };
}

export function progressionSymbolsToNumerals(symbols: string[], tonic = "C"): string[] {
  const numerals = ["I", "ii", "iii", "IV", "V", "vi", "vii°", "V7"];
  const bySymbol = new Map(
    progressionChords(numerals, tonic).map((symbol, index) => [symbol, numerals[index]])
  );
  const fallback = chordsToRomanNumerals(symbols, tonic);

  return symbols.map((symbol, index) => bySymbol.get(symbol) ?? fallback[index] ?? symbol);
}

export function bandLayerCount(completedTasks: number): number {
  return Number.isFinite(completedTasks)
    ? Math.min(4, Math.max(0, Math.floor(completedTasks)))
    : 0;
}

export function computerKeyToNote(key: string, octave: number): string | null {
  if (!Number.isInteger(octave) || octave < 1 || octave > 7) {
    return null;
  }
  const index = KEYBOARD.indexOf(key.toLowerCase());
  return index < 0 ? null : `${CHROMATIC[index]}${octave}`;
}

export function pianoNotes(startOctave: number, octaveCount: number): string[] {
  if (
    !Number.isInteger(startOctave) ||
    !Number.isInteger(octaveCount) ||
    startOctave < 1 ||
    octaveCount < 1 ||
    startOctave + octaveCount - 1 > 7
  ) {
    return [];
  }

  return Array.from({ length: octaveCount }, (_, index) =>
    CHROMATIC.map((pitchClass) => `${pitchClass}${startOctave + index}`)
  ).flat();
}
