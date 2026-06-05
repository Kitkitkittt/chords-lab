import { Chord, Note, Scale } from "tonal";
import { chordInversion, solfegeForKey } from "./theory";
import type {
  ChordShape,
  DegreeHighlight,
  FretboardTuning,
  InstrumentId,
  InstrumentProfile,
  SongLabTrackType,
  SongSketch
} from "../types/course";

export type FretPosition = {
  stringIndex: number;
  stringName: string;
  fret: number;
  note: string;
  isActive: boolean;
  isRoot: boolean;
};

export const songLabTrackTypes: SongLabTrackType[] = [
  "drums",
  "bass",
  "chords",
  "melody",
  "voiceGuide"
];

const chromatic = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B"
];

export const standardTunings: Record<"guitar" | "bass" | "ukulele", FretboardTuning> = {
  guitar: {
    instrumentId: "guitar",
    strings: ["E2", "A2", "D3", "G3", "B3", "E4"],
    fretCount: 12
  },
  bass: {
    instrumentId: "bass",
    strings: ["E1", "A1", "D2", "G2"],
    fretCount: 12
  },
  ukulele: {
    instrumentId: "ukulele",
    strings: ["G4", "C4", "E4", "A4"],
    fretCount: 12
  }
};

export const instrumentProfiles: InstrumentProfile[] = [
  {
    id: "piano",
    title: "Piano",
    family: "keys",
    summary: "See chords, scales, inversions, octaves, and scale degrees.",
    defaultNotes: ["C4", "E4", "G4"],
    practiceRoute: "/practice/chords/setup",
    songLabRole: "chords and melody"
  },
  {
    id: "guitar",
    title: "Guitar",
    family: "strings",
    summary: "Map chord shapes, roots, scale boxes, open strings, and muted strings.",
    defaultNotes: ["C", "E", "G"],
    practiceRoute: "/practice/chords/setup",
    songLabRole: "chord shapes",
    tuning: standardTunings.guitar
  },
  {
    id: "bass",
    title: "Bass",
    family: "strings",
    summary: "Target roots, fifths, octaves, and simple bassline motion.",
    defaultNotes: ["C2", "G2", "A2", "F2"],
    practiceRoute: "/practice/harmony/setup",
    songLabRole: "bassline",
    tuning: standardTunings.bass
  },
  {
    id: "drums",
    title: "Drums",
    family: "rhythm",
    summary: "Build kick, snare, and hat grooves on a visible beat grid.",
    defaultNotes: ["kick", "hat", "snare", "hat"],
    practiceRoute: "/practice/rhythm/setup",
    songLabRole: "groove"
  },
  {
    id: "voice",
    title: "Voice",
    family: "voice",
    summary: "Hear reference tones, solfege, degree labels, and call-response shapes.",
    defaultNotes: ["C4", "D4", "E4", "G4"],
    practiceRoute: "/practice/ear/setup",
    songLabRole: "voice guide"
  },
  {
    id: "ukulele",
    title: "Ukulele",
    family: "strings",
    summary: "Use compact chord shapes and scale notes on a four-string fretboard.",
    defaultNotes: ["C", "E", "G"],
    practiceRoute: "/practice/chords/setup",
    songLabRole: "portable harmony",
    tuning: standardTunings.ukulele
  }
];

export const instrumentsById = new Map(
  instrumentProfiles.map((profile) => [profile.id, profile])
);

export const starterChordShapes: ChordShape[] = [
  {
    id: "guitar-c",
    instrumentId: "guitar",
    symbol: "C",
    name: "C open",
    frets: ["x", 3, 2, 0, 1, 0],
    fingers: ["", "3", "2", "0", "1", "0"],
    root: "C"
  },
  {
    id: "guitar-g",
    instrumentId: "guitar",
    symbol: "G",
    name: "G open",
    frets: [3, 2, 0, 0, 0, 3],
    fingers: ["2", "1", "0", "0", "0", "3"],
    root: "G"
  },
  {
    id: "guitar-am",
    instrumentId: "guitar",
    symbol: "Am",
    name: "A minor open",
    frets: ["x", 0, 2, 2, 1, 0],
    fingers: ["", "0", "2", "3", "1", "0"],
    root: "A"
  },
  {
    id: "ukulele-c",
    instrumentId: "ukulele",
    symbol: "C",
    name: "C shape",
    frets: [0, 0, 0, 3],
    fingers: ["0", "0", "0", "3"],
    root: "C"
  },
  {
    id: "ukulele-f",
    instrumentId: "ukulele",
    symbol: "F",
    name: "F shape",
    frets: [2, 0, 1, 0],
    fingers: ["2", "0", "1", "0"],
    root: "F"
  },
  {
    id: "bass-c",
    instrumentId: "bass",
    symbol: "C",
    name: "C root box",
    frets: ["x", 3, 5, 5],
    fingers: ["", "1", "4", "4"],
    root: "C"
  }
];

export function isInstrumentId(value: string | undefined): value is InstrumentId {
  return instrumentProfiles.some((profile) => profile.id === value);
}

export function pitchClass(note: string): string {
  return Note.pitchClass(note) || note.replace(/[0-9]/g, "");
}

export function noteAtFret(openNote: string, fret: number): string {
  const midi = Note.midi(openNote);

  if (typeof midi === "number") {
    return Note.pitchClass(Note.fromMidi(midi + fret)) || openNote;
  }

  const index = chromatic.indexOf(pitchClass(openNote));
  return chromatic[(index + fret + chromatic.length) % chromatic.length] ?? openNote;
}

export function chordToneHighlights(symbol: string): DegreeHighlight[] {
  const notes = Chord.get(symbol).notes;
  const roles: DegreeHighlight["role"][] = [
    "root",
    "third",
    "fifth",
    "seventh",
    "color"
  ];
  const labels = ["1", "3", "5", "7", "color"];

  return notes.map((note, index) => ({
    note,
    degree: labels[index] ?? "color",
    role: roles[index] ?? "color"
  }));
}

export function scaleDegreeHighlights(
  tonic: string,
  scaleType = "major"
): DegreeHighlight[] {
  const notes = Scale.get(`${tonic} ${scaleType}`).notes;

  return notes.map((note, index) => ({
    note,
    degree: `${index + 1}`,
    role: index === 0 ? "root" : "scale"
  }));
}

export function fretboardPositions(
  tuning: FretboardTuning,
  activeNotes: string[],
  root = activeNotes[0] ?? "",
  fretCount = tuning.fretCount
): FretPosition[][] {
  const activeSet = new Set(activeNotes.map(pitchClass));
  const rootPitch = pitchClass(root);

  return tuning.strings.map((stringName, stringIndex) =>
    Array.from({ length: fretCount + 1 }, (_, fret) => {
      const note = noteAtFret(stringName, fret);

      return {
        stringIndex,
        stringName,
        fret,
        note,
        isActive: activeSet.has(pitchClass(note)),
        isRoot: pitchClass(note) === rootPitch
      };
    })
  );
}

export function chordShapeFor(
  instrumentId: InstrumentId,
  symbol: string
): ChordShape | undefined {
  return starterChordShapes.find(
    (shape) => shape.instrumentId === instrumentId && shape.symbol === symbol
  );
}

export function bassTargetsFor(symbol: string): string[] {
  // Root, fifth, root (up an octave), fifth — a common beginner bass shape.
  const notes = Chord.get(symbol).notes;
  const root = notes[0] ?? "C";
  const fifth = chordInversion(symbol, 2)[0] ?? notes[2] ?? notes[1] ?? root;

  return [`${root}2`, `${fifth}2`, `${root}3`, `${fifth}2`];
}

export const drumGroovePresets: Record<string, boolean[][]> = {
  backbeat: [
    [true, false, false, false],
    [false, false, true, false],
    [true, false, false, false],
    [false, false, true, false]
  ],
  fourOnFloor: [
    [true, false, false, false],
    [true, false, true, false],
    [true, false, false, false],
    [true, false, true, false]
  ],
  halfTime: [
    [true, false, false, false],
    [false, false, false, false],
    [false, false, true, false],
    [false, false, false, false]
  ]
};

export type VoiceDegreeStep = {
  solfege: string;
  degree: string;
  note: string;
};

/**
 * Movable-do solfege ladder for a key (one octave plus the upper tonic).
 * Derived from the theory engine so it works for any tonic/mode instead of the
 * old static C-major-only table.
 */
export function voiceDegreeLadder(
  tonic = "C",
  mode: "major" | "minor" = "major",
  startOctave = 4
): VoiceDegreeStep[] {
  const steps = solfegeForKey(tonic, mode);
  const ladder: VoiceDegreeStep[] = steps.map((step, index) => ({
    solfege: step.solfege,
    degree: `${step.degree}`,
    note: `${step.note}${startOctave + (index > 0 && isWrapped(steps, index) ? 1 : 0)}`
  }));

  // Append the upper tonic (degree 8) one octave above the first.
  ladder.push({
    solfege: steps[0]?.solfege ?? "do",
    degree: "8",
    note: `${steps[0]?.note ?? tonic}${startOctave + 1}`
  });

  return ladder;
}

/** True once the scale letter wraps past the starting note's register. */
function isWrapped(
  steps: { note: string }[],
  index: number
): boolean {
  const startChroma = Note.chroma(steps[0]?.note ?? "C") ?? 0;
  const current = Note.chroma(steps[index]?.note ?? "C") ?? 0;
  return current < startChroma;
}

export const voiceDegreeMap: VoiceDegreeStep[] = voiceDegreeLadder("C", "major");

export function explainSongSketch(sketch: SongSketch): string {
  const firstChord = sketch.tracks.chords[0] ?? "I";
  const hasVoice = sketch.tracks.voiceGuide.some((note) => note !== "rest");
  const activeDrums = sketch.tracks.drums.flat().filter(Boolean).length;

  return `${sketch.form.join(" ")} form at ${sketch.bpm} BPM. The loop starts on ${firstChord}, uses ${activeDrums} drum hits, and ${hasVoice ? "includes" : "does not include"} a voice guide.`;
}
