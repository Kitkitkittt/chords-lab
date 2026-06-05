import { Chord, Interval, Note, Scale } from "tonal";

const keyboardEnharmonics: Record<string, string> = {
  "B#": "C",
  "C#": "C#",
  Db: "C#",
  "C##": "D",
  "D#": "D#",
  Eb: "D#",
  "D##": "E",
  Fb: "E",
  "E#": "F",
  "F#": "F#",
  Gb: "F#",
  "F##": "G",
  "G#": "G#",
  Ab: "G#",
  "G##": "A",
  "A#": "A#",
  Bb: "A#",
  "A##": "B",
  Cb: "B"
};

export function noteFrequency(noteName: string): number | null {
  const frequency = Note.freq(noteName);
  return typeof frequency === "number" ? Math.round(frequency * 100) / 100 : null;
}

export function majorScaleNotes(tonic: string): string[] {
  return Scale.get(`${tonic} major`).notes;
}

export function naturalMinorScaleNotes(tonic: string): string[] {
  return Scale.get(`${tonic} minor`).notes;
}

export function intervalName(from: string, to: string): string {
  const interval = Interval.distance(from, to);
  const data = Interval.get(interval);
  return data.name || interval;
}

export function triadNotes(symbol: string): string[] {
  return Chord.get(symbol).notes;
}

export function keyboardPitchClasses(): string[] {
  return ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
}

export function normalizePitchClassForKeyboard(noteName: string): string {
  const pitchClass = noteName.replace(/[0-9]/g, "");
  return keyboardEnharmonics[pitchClass] ?? pitchClass;
}

export function normalizeNoteForPlayback(noteName: string): string {
  const octave = noteName.match(/[0-9]+$/)?.[0] ?? "";
  return `${normalizePitchClassForKeyboard(noteName)}${octave}`;
}
