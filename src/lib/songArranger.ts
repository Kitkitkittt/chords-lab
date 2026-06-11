/**
 * Pure multi-section arranger model for Song Lab.
 *
 * An {@link Arrangement} is an ordered list of named {@link ArrangementSection}s
 * (Verse/Chorus/Bridge/...), where each section wraps a {@link SongSketch}. The
 * arrangement can be flattened back into ONE big `SongSketch` for playback or
 * export with the existing engine.
 *
 * No React, no storage, no DOM. The musical output of {@link flattenArrangement}
 * is a pure function of the section sketches' musical content (ids/timestamps
 * aside); only id/timestamp generation uses `Date.now()`/`Math.random()`.
 */
import type { SongSketch } from "../types/course";
import {
  createDefaultSongSketch,
  normalizeSongSketch,
  updateSongSketch
} from "./songSketches";

export type SectionLabel = "Intro" | "Verse" | "Chorus" | "Bridge" | "Outro";

export type ArrangementSection = {
  id: string;
  label: SectionLabel;
  sketch: SongSketch;
};

export type Arrangement = {
  id: string;
  title: string;
  bpm: number;
  meter: string;
  key: string;
  mode: "major" | "minor";
  sections: ArrangementSection[];
  createdAt: string;
  updatedAt: string;
};

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 8);
}

function cloneSketch(sketch: SongSketch): SongSketch {
  return {
    ...sketch,
    form: [...sketch.form],
    tracks: {
      drums: sketch.tracks.drums.map((bar) => [...bar]),
      bass: [...sketch.tracks.bass],
      chords: [...sketch.tracks.chords],
      melody: [...sketch.tracks.melody],
      voiceGuide: [...sketch.tracks.voiceGuide]
    },
    mutedTracks: [...sketch.mutedTracks],
    soloTracks: [...sketch.soloTracks]
  };
}

export function createSection(
  label: SectionLabel,
  sketch?: SongSketch
): ArrangementSection {
  return {
    id: `section-${Date.now()}-${randomSuffix()}`,
    label,
    sketch: sketch ?? createDefaultSongSketch(label)
  };
}

export function createArrangement(title = "Untitled arrangement"): Arrangement {
  const now = new Date().toISOString();
  const verse = createSection("Verse");

  return {
    id: `arr-${Date.now()}-${randomSuffix()}`,
    title,
    bpm: verse.sketch.bpm,
    meter: verse.sketch.meter,
    key: verse.sketch.key ?? "C",
    mode: verse.sketch.mode === "minor" ? "minor" : "major",
    sections: [verse],
    createdAt: now,
    updatedAt: now
  };
}

export function addSection(
  arrangement: Arrangement,
  label: SectionLabel
): Arrangement {
  const inherited = updateSongSketch(createDefaultSongSketch(label), {
    bpm: arrangement.bpm,
    meter: arrangement.meter,
    key: arrangement.key,
    mode: arrangement.mode
  });
  const section = createSection(label, inherited);

  return {
    ...arrangement,
    sections: [...arrangement.sections, section],
    updatedAt: new Date().toISOString()
  };
}

export function removeSection(
  arrangement: Arrangement,
  sectionId: string
): Arrangement {
  const remaining = arrangement.sections.filter(
    (section) => section.id !== sectionId
  );

  if (remaining.length === 0) {
    return arrangement;
  }

  return {
    ...arrangement,
    sections: remaining,
    updatedAt: new Date().toISOString()
  };
}

export function moveSection(
  arrangement: Arrangement,
  sectionId: string,
  direction: "up" | "down"
): Arrangement {
  const index = arrangement.sections.findIndex(
    (section) => section.id === sectionId
  );

  if (index === -1) {
    return arrangement;
  }

  const target = direction === "up" ? index - 1 : index + 1;

  if (target < 0 || target >= arrangement.sections.length) {
    return arrangement;
  }

  const sections = [...arrangement.sections];
  [sections[index], sections[target]] = [sections[target], sections[index]];

  return {
    ...arrangement,
    sections,
    updatedAt: new Date().toISOString()
  };
}

export function duplicateSection(
  arrangement: Arrangement,
  sectionId: string
): Arrangement {
  const index = arrangement.sections.findIndex(
    (section) => section.id === sectionId
  );

  if (index === -1) {
    return arrangement;
  }

  const original = arrangement.sections[index];
  const copy: ArrangementSection = {
    id: `section-${Date.now()}-${randomSuffix()}`,
    label: original.label,
    sketch: cloneSketch(original.sketch)
  };

  const sections = [
    ...arrangement.sections.slice(0, index + 1),
    copy,
    ...arrangement.sections.slice(index + 1)
  ];

  return {
    ...arrangement,
    sections,
    updatedAt: new Date().toISOString()
  };
}

export function flattenArrangement(arrangement: Arrangement): SongSketch {
  const now = new Date().toISOString();
  const form: string[] = [];
  const drums: boolean[][] = [];
  const bass: string[] = [];
  const chords: string[] = [];
  const melody: string[] = [];
  const voiceGuide: string[] = [];

  for (const section of arrangement.sections) {
    const { sketch } = section;
    form.push(...sketch.form);
    drums.push(...sketch.tracks.drums.map((bar) => [...bar]));
    bass.push(...sketch.tracks.bass);
    chords.push(...sketch.tracks.chords);
    melody.push(...sketch.tracks.melody);
    voiceGuide.push(...sketch.tracks.voiceGuide);
  }

  return normalizeSongSketch({
    id: `flattened-${arrangement.id}`,
    title: arrangement.title,
    bpm: arrangement.bpm,
    meter: arrangement.meter,
    key: arrangement.key,
    mode: arrangement.mode,
    form,
    tracks: {
      drums,
      bass,
      chords,
      melody,
      voiceGuide
    },
    mutedTracks: [],
    soloTracks: [],
    createdAt: now,
    updatedAt: now
  });
}

export function totalBars(arrangement: Arrangement): number {
  return arrangement.sections.reduce(
    (sum, section) => sum + section.sketch.form.length,
    0
  );
}
