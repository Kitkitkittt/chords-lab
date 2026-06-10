import type { AudioEvent, LiveVoiceId } from "./audioEngine";

/**
 * Beats: named drum patterns for the Jam Room, independent of the harmonic
 * "vibe". A beat is a 4-row grid (kick / snare / hat / clap) over 8 eighth-note
 * steps. Beats can be combined with any vibe, and the editable grid in the Jam
 * Room starts from one of these presets.
 *
 * This module is pure: it only describes patterns and converts them to loop
 * events. Playback lives in the audio engine.
 */

/** Drum rows, in display + routing order. Each maps to a percussion voice. */
export const DRUM_ROWS: { id: LiveVoiceId; label: string }[] = [
  { id: "kick", label: "Kick" },
  { id: "snare", label: "Snare" },
  { id: "hat", label: "Hat" },
  { id: "clap", label: "Clap" }
];

export const BEAT_STEPS = 8;

export type DrumGrid = boolean[][];

export type Beat = {
  id: string;
  label: string;
  blurb: string;
  /** 4 rows (kick/snare/hat/clap) x 8 steps. */
  grid: DrumGrid;
};

function row(...steps: number[]): boolean[] {
  const cells = Array.from({ length: BEAT_STEPS }, () => false);
  steps.forEach((step) => {
    if (step >= 0 && step < BEAT_STEPS) {
      cells[step] = true;
    }
  });
  return cells;
}

export const BEATS: Beat[] = [
  {
    id: "none",
    label: "No drums",
    blurb: "Just chords and bass.",
    grid: [row(), row(), row(), row()]
  },
  {
    id: "backbeat",
    label: "Backbeat",
    blurb: "Kick on 1 and 3, snare on 2 and 4.",
    grid: [row(0, 4), row(2, 6), row(0, 2, 4, 6), row()]
  },
  {
    id: "four-floor",
    label: "Four on the floor",
    blurb: "Steady kick on every beat.",
    grid: [row(0, 2, 4, 6), row(4), row(1, 3, 5, 7), row()]
  },
  {
    id: "lo-fi",
    label: "Lo-fi",
    blurb: "Loose, laid-back groove.",
    grid: [row(0, 5), row(4), row(0, 2, 4, 6), row(4)]
  },
  {
    id: "half-time",
    label: "Half-time",
    blurb: "Spacious, heavy snare on 3.",
    grid: [row(0), row(4), row(0, 2, 4, 6), row()]
  },
  {
    id: "bossa",
    label: "Bossa-ish",
    blurb: "Light, syncopated feel.",
    grid: [row(0, 3, 6), row(), row(0, 1, 2, 3, 4, 5, 6, 7), row(2, 5)]
  }
];

export function beatById(id: string): Beat | undefined {
  return BEATS.find((beat) => beat.id === id);
}

/** A fresh, empty editable grid (4 rows x 8 steps). */
export function emptyDrumGrid(): DrumGrid {
  return DRUM_ROWS.map(() => Array.from({ length: BEAT_STEPS }, () => false));
}

/** Deep-clone a grid (for editable state derived from a preset). */
export function cloneDrumGrid(grid: DrumGrid): DrumGrid {
  return grid.map((cells) => [...cells]);
}

/**
 * Convert a drum grid into looped AudioEvents spanning `bars` bars of 4/4.
 * The 8 steps map across one bar (8 x 0.5 beat = 4 beats), and the grid
 * repeats every bar so it locks to the chord loop.
 */
export function drumGridEvents(grid: DrumGrid, bars: number): AudioEvent[] {
  const events: AudioEvent[] = [];
  const beatsPerBar = 4;
  const stepBeats = beatsPerBar / BEAT_STEPS; // 0.5 beat per step

  for (let bar = 0; bar < bars; bar += 1) {
    const barStart = bar * beatsPerBar;

    grid.forEach((cells, rowIndex) => {
      const voice = DRUM_ROWS[rowIndex]?.id ?? "kick";
      cells.forEach((active, step) => {
        if (!active) {
          return;
        }
        events.push({
          note: "C2",
          startBeat: barStart + step * stepBeats,
          durationBeats: 0.2,
          velocity: voice === "kick" ? 0.95 : 0.8,
          track: "drums",
          voice
        });
      });
    });
  }

  return events;
}
