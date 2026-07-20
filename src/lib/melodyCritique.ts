/**
 * Song Lab melody critique.
 *
 * Pure functions (no React, no Tone.js, no randomness, no I/O, no Date) that
 * look at a melody line against its chord progression and report, bar by bar,
 * how each note sits inside the harmony. Every note is classified as a
 * chord-tone, a scale-tone, a tension (outside the key), or a rest, with a
 * calm, plain-language reason the learner can act on without feeling scolded.
 *
 * Chord and scale resolution is delegated to the canonical theory layer:
 * `theoryContextForChord` (`./theoryContext`) turns a key, mode, and chord
 * token (Roman numeral, figured-bass, or literal symbol) into pitch-class
 * sets, so this module never re-implements chord or scale spelling. Pitch-class
 * comparison (via tonal's `Note`) means octave choice never changes a verdict.
 *
 * All functions are deterministic and never throw: empty, ragged, or all-rest
 * input is handled gracefully.
 */
import { Note } from "tonal";

import { theoryContextForChord } from "./theoryContext";
import type { KeyMode } from "./theory";

/** How a single melody note relates to the chord under it. */
export type MelodyNoteStatus = "chord-tone" | "scale-tone" | "tension" | "rest";

/** A single melody note classified against the chord in its bar. */
export type MelodyNote = {
  barIndex: number;
  note: string;
  status: MelodyNoteStatus;
  reason: string;
};

/** Bar-by-bar critique plus one calm overall summary sentence. */
export type MelodyCritique = {
  notes: MelodyNote[];
  summary: string;
};

/** A melodic jump wider than the leap threshold. */
export type MelodyLeap = {
  fromIndex: number;
  toIndex: number;
  semitones: number;
};

/** Lowest and highest pitched notes plus the span between them. */
export type MelodyRange = {
  lowest: string | null;
  highest: string | null;
  spanSemitones: number;
};

/**
 * A melody slot counts as a rest when it is empty, whitespace, or one of the
 * rest tokens the Song Lab audio engine recognizes ("rest" / "Rest" / "tie").
 */
function isRestToken(token: string | undefined): boolean {
  if (!token) {
    return true;
  }

  const normalized = token.trim().toLowerCase();
  return normalized.length === 0 || normalized === "rest" || normalized === "tie";
}

/** Pitch class of a note, or "" when the token is not a real pitch. */
function pitchClassOf(note: string): string {
  return Note.pitchClass(note) || "";
}

/** True when two pitch classes name the same chroma (octave-insensitive). */
function samePitchClass(a: string, b: string): boolean {
  if (!a || !b) {
    return false;
  }

  const chromaA = Note.chroma(a);
  const chromaB = Note.chroma(b);

  if (typeof chromaA !== "number" || typeof chromaB !== "number") {
    return a === b;
  }

  return chromaA === chromaB;
}

/** True when `note`'s pitch class appears anywhere in the pitch-class list. */
function inPitchClasses(note: string, pitchClasses: string[]): boolean {
  const target = pitchClassOf(note);

  if (!target) {
    return false;
  }

  return pitchClasses.some((candidate) => samePitchClass(target, candidate));
}

function chordToneReason(note: string, chord: string): string {
  const pc = pitchClassOf(note) || note;
  return `${pc} sits right inside the ${chord} chord \u2014 a strong, restful landing.`;
}

function scaleToneReason(note: string, chord: string): string {
  const pc = pitchClassOf(note) || note;
  return `${pc} is a passing color outside the ${chord} chord, but still in the key \u2014 it adds gentle motion.`;
}

function tensionReason(note: string): string {
  const pc = pitchClassOf(note) || note;
  return `${pc} sits outside the key \u2014 try it as a quick passing tone, or move to a nearby scale note.`;
}

function restReason(): string {
  return "A rest here gives the line room to breathe.";
}

function classifyNote(
  note: string,
  barIndex: number,
  chordTones: string[],
  scaleNotes: string[],
  chordSymbol: string
): MelodyNote {
  if (inPitchClasses(note, chordTones)) {
    return {
      barIndex,
      note,
      status: "chord-tone",
      reason: chordToneReason(note, chordSymbol)
    };
  }

  if (inPitchClasses(note, scaleNotes)) {
    return {
      barIndex,
      note,
      status: "scale-tone",
      reason: scaleToneReason(note, chordSymbol)
    };
  }

  return {
    barIndex,
    note,
    status: "tension",
    reason: tensionReason(note)
  };
}

/**
 * Build a calm one-sentence summary from the classified notes. Deterministic
 * phrasing driven by the chord-tone / tension counts and whether any large
 * leaps are present.
 */
function buildSummary(notes: MelodyNote[], leapCount: number): string {
  const pitched = notes.filter((entry) => entry.status !== "rest");

  if (pitched.length === 0) {
    return "This line is all rests for now \u2014 add a few notes to shape a melody.";
  }

  const chordTones = pitched.filter(
    (entry) => entry.status === "chord-tone"
  ).length;
  const tensions = pitched.filter((entry) => entry.status === "tension").length;
  const leapPhrase =
    leapCount > 0
      ? " A few wide leaps add drama \u2014 a step or two between them would smooth the line."
      : " The motion stays smooth and stepwise.";

  if (tensions === 0 && chordTones === pitched.length) {
    return `Every note lands on a chord tone, so the melody rests easily on the harmony.${leapPhrase}`;
  }

  if (tensions === 0) {
    return `${chordTones} of ${pitched.length} notes are chord tones and the rest stay in the key, so the line feels settled.${leapPhrase}`;
  }

  return `${chordTones} of ${pitched.length} notes are chord tones with ${tensions} outside the key for color \u2014 resolve those into a nearby scale note to keep it grounded.${leapPhrase}`;
}

/**
 * Critique a melody against its chord progression, bar by bar. Melody and
 * chords are parallel by bar index; out-of-range chord slots are clamped to
 * the last available chord so a melody longer than the chord list still gets a
 * sensible verdict. Rests are reported without tension analysis.
 */
export function critiqueMelody({
  key = "C",
  mode = "major",
  chords,
  melody
}: {
  key?: string;
  mode?: KeyMode;
  chords: string[];
  melody: string[];
}): MelodyCritique {
  const hasChords = chords.length > 0;

  const notes: MelodyNote[] = melody.map((rawNote, barIndex) => {
    const note = rawNote ?? "";

    if (isRestToken(note)) {
      return {
        barIndex,
        note,
        status: "rest",
        reason: restReason()
      };
    }

    if (!hasChords) {
      return classifyNote(note, barIndex, [], [], "current");
    }

    const clampedIndex = Math.min(barIndex, chords.length - 1);
    const chordToken = chords[clampedIndex] ?? "I";
    const context = theoryContextForChord({ key, mode, chord: chordToken });

    return classifyNote(
      note,
      barIndex,
      context.chordTones,
      context.scaleNotes,
      context.chord
    );
  });

  const leapCount = largeLeaps(melody).length;

  return {
    notes,
    summary: buildSummary(notes, leapCount)
  };
}

/**
 * Find melodic jumps wider than `thresholdSemitones` (default a perfect fifth,
 * 7 semitones) between consecutive pitched notes. Rests are skipped, so a leap
 * is measured between the notes on either side of any gap. Interval size comes
 * from `Note.midi`, so octave placement matters here (unlike pitch-class
 * classification).
 */
export function largeLeaps(
  melody: string[],
  thresholdSemitones = 7
): MelodyLeap[] {
  const leaps: MelodyLeap[] = [];
  let previousIndex = -1;
  let previousMidi: number | null = null;

  melody.forEach((rawNote, index) => {
    if (isRestToken(rawNote)) {
      return;
    }

    const midi = Note.midi(rawNote);

    if (typeof midi !== "number") {
      return;
    }

    if (previousMidi !== null && previousIndex !== -1) {
      const semitones = Math.abs(midi - previousMidi);

      if (semitones > thresholdSemitones) {
        leaps.push({ fromIndex: previousIndex, toIndex: index, semitones });
      }
    }

    previousIndex = index;
    previousMidi = midi;
  });

  return leaps;
}

/**
 * Lowest and highest pitched notes in the melody plus the span between them in
 * semitones. Rests are ignored; when there are no pitched notes, both bounds
 * are null and the span is 0.
 */
export function melodyRange(melody: string[]): MelodyRange {
  let lowest: string | null = null;
  let highest: string | null = null;
  let lowestMidi = Number.POSITIVE_INFINITY;
  let highestMidi = Number.NEGATIVE_INFINITY;

  for (const rawNote of melody) {
    if (isRestToken(rawNote)) {
      continue;
    }

    const midi = Note.midi(rawNote);

    if (typeof midi !== "number") {
      continue;
    }

    if (midi < lowestMidi) {
      lowestMidi = midi;
      lowest = rawNote;
    }

    if (midi > highestMidi) {
      highestMidi = midi;
      highest = rawNote;
    }
  }

  if (lowest === null || highest === null) {
    return { lowest: null, highest: null, spanSemitones: 0 };
  }

  return {
    lowest,
    highest,
    spanSemitones: highestMidi - lowestMidi
  };
}
