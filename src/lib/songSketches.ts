import type { CapturedNote, SongSketch } from "../types/course";
import { songLabTrackTypes } from "./instruments";

export const songChordChoices = ["I", "vi", "IV", "V", "ii", "V7", "I6", "iii"];
export const songKeyChoices = [
  "C",
  "G",
  "D",
  "A",
  "E",
  "F",
  "Bb",
  "Eb"
];
export const songBassChoices = ["C2", "A2", "F2", "G2", "D2", "E2", "B1", "C3"];
export const songMelodyChoices = ["E4", "G4", "A4", "C5", "D5", "B4", "F4", "E5"];
export const songVoiceChoices = ["C4", "D4", "E4", "G4", "A4", "C5", "rest"];

export function createDefaultSongSketch(title = "Untitled loop"): SongSketch {
  const now = new Date().toISOString();

  return {
    id: `song-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title,
    bpm: 92,
    meter: "4/4",
    key: "C",
    mode: "major",
    form: ["A", "A", "B", "A", "A", "B", "C", "A"],
    tracks: {
      drums: [
        [true, false, true, true],
        [true, false, false, true],
        [true, true, false, true],
        [true, false, true, false],
        [true, false, true, true],
        [true, false, false, true],
        [true, true, true, false],
        [true, false, true, true]
      ],
      bass: ["C2", "C2", "A2", "A2", "F2", "F2", "G2", "G2"],
      chords: ["I", "I", "vi", "vi", "IV", "IV", "V", "V"],
      melody: ["E4", "G4", "A4", "C5", "D5", "C5", "B4", "G4"],
      voiceGuide: ["C4", "D4", "E4", "G4", "A4", "G4", "E4", "C4"]
    },
    mutedTracks: [],
    soloTracks: [],
    createdAt: now,
    updatedAt: now
  };
}

export function duplicateSongSketch(sketch: SongSketch): SongSketch {
  const now = new Date().toISOString();

  return {
    ...sketch,
    id: `song-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: `${sketch.title} copy`,
    createdAt: now,
    updatedAt: now
  };
}

export function updateSongSketch(
  sketch: SongSketch,
  updates: Partial<Omit<SongSketch, "id" | "createdAt">>
): SongSketch {
  return {
    ...sketch,
    ...updates,
    tracks: updates.tracks ?? sketch.tracks,
    updatedAt: new Date().toISOString()
  };
}

export function exportSongSketches(sketches: SongSketch[]): string {
  return JSON.stringify({ version: 1, sketches }, null, 2);
}

/**
 * Build a persistable SongSketch from a Jam Room take: the vibe's key/mode/tempo
 * and chord loop become the bar-based tracks, and the freely-timed live melody
 * is attached as `capturedMelody`. Bass roots are derived from each chord's
 * pitch class; melody/voice tracks are left as gentle defaults so the sketch is
 * immediately editable in Song Lab.
 */
export function createSketchFromJam(input: {
  title: string;
  key: string;
  mode: "major" | "minor";
  bpm: number;
  /** Roman numerals, one per bar (stored in tracks.chords for Song Lab). */
  numerals: string[];
  bassRoots: string[];
  capturedMelody?: CapturedNote[];
}): SongSketch {
  const now = new Date().toISOString();
  const bars = Math.max(1, input.numerals.length);
  const form = Array.from({ length: bars }, (_, index) =>
    String.fromCharCode(65 + (index % 8))
  );

  return {
    id: `song-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: input.title,
    bpm: Math.max(40, Math.round(input.bpm) || 92),
    meter: "4/4",
    key: input.key || "C",
    mode: input.mode === "minor" ? "minor" : "major",
    form,
    tracks: {
      drums: form.map(() => [true, false, true, false]),
      bass: form.map((_, index) => input.bassRoots[index] ?? "C2"),
      chords: form.map((_, index) => input.numerals[index] ?? "I"),
      melody: form.map(() => "rest"),
      voiceGuide: form.map(() => "rest")
    },
    mutedTracks: [],
    soloTracks: [],
    ...(input.capturedMelody && input.capturedMelody.length > 0
      ? { capturedMelody: input.capturedMelody }
      : {}),
    createdAt: now,
    updatedAt: now
  };
}

/** Round-trip a captured live melody into a valid CapturedNote list. */
export function normalizeCapturedMelody(raw: unknown): CapturedNote[] | undefined {
  if (!Array.isArray(raw)) {
    return undefined;
  }

  const notes = raw.flatMap((item): CapturedNote[] => {
    if (!item || typeof item !== "object") {
      return [];
    }
    const note = (item as { note?: unknown }).note;
    const startBeat = (item as { startBeat?: unknown }).startBeat;
    const durationBeats = (item as { durationBeats?: unknown }).durationBeats;
    if (
      typeof note !== "string" ||
      typeof startBeat !== "number" ||
      typeof durationBeats !== "number"
    ) {
      return [];
    }
    const velocity = (item as { velocity?: unknown }).velocity;
    return [
      {
        note,
        startBeat: Math.max(0, startBeat),
        durationBeats: Math.max(0.05, durationBeats),
        ...(typeof velocity === "number" ? { velocity } : {})
      }
    ];
  });

  return notes.length > 0 ? notes : undefined;
}

export function normalizeSongSketch(sketch: SongSketch): SongSketch {
  const capturedMelody = normalizeCapturedMelody(sketch.capturedMelody);

  return {
    ...sketch,
    key: sketch.key ?? "C",
    mode: sketch.mode === "minor" ? "minor" : "major",
    capturedMelody,
    tracks: {
      drums: sketch.tracks.drums,
      bass: sketch.tracks.bass,
      chords: sketch.tracks.chords,
      melody: sketch.tracks.melody,
      voiceGuide:
        sketch.tracks.voiceGuide ??
        Array.from({ length: sketch.form.length }, () => "rest")
    },
    mutedTracks: (sketch.mutedTracks ?? []).filter((track) =>
      songLabTrackTypes.includes(track)
    ),
    soloTracks: (sketch.soloTracks ?? []).filter((track) =>
      songLabTrackTypes.includes(track)
    )
  };
}

export function parseSongSketches(raw: string): SongSketch[] {
  const parsed = JSON.parse(raw) as { sketches?: SongSketch[] };

  return Array.isArray(parsed.sketches)
    ? parsed.sketches.map(normalizeSongSketch)
    : [];
}
