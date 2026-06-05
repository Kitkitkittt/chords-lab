import { Chord, Note, Scale } from "tonal";
import type { SongSketch, TheoryContext } from "../types/course";

const romanToChordByKey: Record<string, Record<string, string>> = {
  C: {
    I: "C",
    ii: "Dm",
    iii: "Em",
    IV: "F",
    V: "G",
    V7: "G7",
    vi: "Am",
    "vii°": "Bdim",
    I6: "C/E"
  },
  G: {
    I: "G",
    ii: "Am",
    iii: "Bm",
    IV: "C",
    V: "D",
    V7: "D7",
    vi: "Em",
    "vii°": "F#dim",
    I6: "G/B"
  },
  F: {
    I: "F",
    ii: "Gm",
    iii: "Am",
    IV: "Bb",
    V: "C",
    V7: "C7",
    vi: "Dm",
    "vii°": "Edim",
    I6: "F/A"
  }
};

function pitchClasses(notes: string[]): string[] {
  return Array.from(
    new Set(notes.map((note) => Note.pitchClass(note)).filter(Boolean))
  );
}

export function theoryContextForChord({
  key = "C",
  chord
}: {
  key?: string;
  chord: string;
}): TheoryContext {
  const chordSymbol = romanToChordByKey[key]?.[chord] ?? chord;
  const scaleNotes = Scale.get(`${key} major`).notes;
  const chordTones = pitchClasses(Chord.get(chordSymbol).notes);
  const safeMelodyNotes = Array.from(new Set([...chordTones, ...scaleNotes]));

  return {
    key,
    chord: chordSymbol,
    scaleNotes,
    chordTones,
    safeMelodyNotes
  };
}

export function theoryContextForSongSketch(
  sketch: SongSketch,
  barIndex: number
): TheoryContext {
  const safeIndex = Math.max(
    0,
    Math.min(barIndex >= 0 ? barIndex : 0, sketch.tracks.chords.length - 1)
  );

  return theoryContextForChord({
    key: "C",
    chord: sketch.tracks.chords[safeIndex] ?? "I"
  });
}
