import { Note } from "tonal";
import type { AudioEvent, PlaybackPattern } from "./audioEngine";
import { drumGridEvents, type DrumGrid } from "./beats";
import {
  chordNotes,
  progressionChords,
  scaleNotesForTopic,
  type KeyMode
} from "./theory";

/**
 * Jam Room model.
 *
 * A "vibe" is a calm, ready-to-play backing context: a key, a diatonic
 * Roman-numeral loop, a tempo, and a scale to solo with. The Jam Room loops the
 * backing (chords + bass) so a first-time visitor can play melody notes on top
 * within seconds, with no setup and no scoring. Everything derives from the
 * theory engine so the soloing scale always fits the chords.
 */

export type Vibe = {
  id: string;
  label: string;
  /** One-line invitation shown on the card. */
  blurb: string;
  tonic: string;
  mode: KeyMode;
  /** Diatonic Roman-numeral loop, e.g. ["I", "V", "vi", "IV"]. */
  numerals: string[];
  bpm: number;
  /** Scale topic for the play-over notes ("major", "minor", "pentatonic"). */
  scaleTopic: string;
};

export const VIBES: Vibe[] = [
  {
    id: "sunset-pop",
    label: "Sunset pop",
    blurb: "The four chords behind a thousand songs.",
    tonic: "C",
    mode: "major",
    numerals: ["I", "V", "vi", "IV"],
    bpm: 96,
    scaleTopic: "major pentatonic"
  },
  {
    id: "rainy-day",
    label: "Rainy day",
    blurb: "Soft minor loop for slow, thoughtful lines.",
    tonic: "A",
    mode: "minor",
    numerals: ["i", "VI", "III", "VII"],
    bpm: 84,
    scaleTopic: "minor pentatonic"
  },
  {
    id: "lo-fi-study",
    label: "Lo-fi study",
    blurb: "Mellow seventh chords to drift over.",
    tonic: "D",
    mode: "major",
    numerals: ["ii", "V7", "I", "vi"],
    bpm: 78,
    scaleTopic: "major"
  },
  {
    id: "campfire",
    label: "Campfire",
    blurb: "Bright and easy, great for first melodies.",
    tonic: "G",
    mode: "major",
    numerals: ["I", "IV", "V", "IV"],
    bpm: 104,
    scaleTopic: "major pentatonic"
  }
];

export function vibeById(id: string): Vibe | undefined {
  return VIBES.find((vibe) => vibe.id === id);
}

/** Concrete chord symbols for a vibe's progression, in order. */
export function vibeChords(vibe: Vibe): string[] {
  return progressionChords(vibe.numerals, vibe.tonic, vibe.mode);
}

/** Scale notes (pitch classes) a learner can safely solo with over the vibe. */
export function vibeSoloNotes(vibe: Vibe): string[] {
  return scaleNotesForTopic(vibe.tonic, vibe.scaleTopic);
}

/** Stack a triad into a comfortable mid-register voicing with rising octaves. */
function voiceChord(notes: string[], baseOctave = 3): string[] {
  let octave = baseOctave;
  let previousMidi = -1;

  return notes.map((pc) => {
    let midi = Note.midi(`${pc}${octave}`) ?? previousMidi + 1;

    if (previousMidi >= 0 && midi <= previousMidi) {
      octave += 1;
      midi = Note.midi(`${pc}${octave}`) ?? midi + 12;
    }

    previousMidi = midi;
    return `${pc}${octave}`;
  });
}

/** Pick a bass note (root in a low octave) for a chord symbol. */
function bassNoteFor(symbol: string): string {
  const root = chordNotes(symbol)[0] ?? "C";
  const pc = Note.pitchClass(root) || root;
  return `${pc}2`;
}

/**
 * Build a looping backing pattern for a vibe: one bar per chord (4 beats),
 * each chord sustained as a soft pad with a root bass note on the downbeat.
 * An optional drum grid is folded in (repeating per bar). The returned pattern
 * is meant to be fed to `playLoop`.
 */
export function vibeBackingPattern(
  vibe: Vibe,
  drumGrid?: DrumGrid
): PlaybackPattern {
  const chords = vibeChords(vibe);
  const beatsPerBar = 4;
  const events: AudioEvent[] = [];

  chords.forEach((symbol, barIndex) => {
    const barStart = barIndex * beatsPerBar;
    const voiced = voiceChord(chordNotes(symbol));

    events.push({
      note: voiced,
      startBeat: barStart,
      durationBeats: beatsPerBar * 0.9,
      velocity: 0.42,
      track: "chords"
    });

    events.push({
      note: bassNoteFor(symbol),
      startBeat: barStart,
      durationBeats: 1,
      velocity: 0.6,
      track: "bass"
    });

    // A gentle mid-bar bass rebound keeps the loop feeling alive.
    events.push({
      note: bassNoteFor(symbol),
      startBeat: barStart + 2,
      durationBeats: 1,
      velocity: 0.45,
      track: "bass"
    });
  });

  if (drumGrid) {
    events.push(...drumGridEvents(drumGrid, chords.length));
  }

  return {
    label: `${vibe.label} backing`,
    bpm: vibe.bpm,
    meter: "4/4",
    mode: "song",
    events
  };
}

/** Total bars in a vibe loop (used for the bar cursor). */
export function vibeBarCount(vibe: Vibe): number {
  return vibe.numerals.length;
}
