/**
 * Skill graph for Chords Lab.
 *
 * This module defines a typed taxonomy of learnable skills and connects the
 * three previously disconnected layers of the app:
 *
 *   lessons (what is taught) -> skills (the unit of mastery) -> prompts (what is
 *   practiced) -> adaptive review (what is scheduled).
 *
 * Practice prompts already carry free-text `skillTargets`. This module maps the
 * primary skill target of each prompt to a canonical `SkillId`, so mastery,
 * recommendations, review interleaving, and learning tracks can all be computed
 * from a single graph instead of scattered counters.
 *
 * The skill graph is pure data and pure functions (no React, no storage).
 */

export type SkillId =
  | "note-reading"
  | "staff-position"
  | "scale-spelling"
  | "interval-quality"
  | "chord-spelling"
  | "roman-numerals"
  | "voice-leading"
  | "rhythm-reading"
  | "ear-training"
  | "instrument-application";

export type SkillTrackId = "reading-pitch" | "harmony-songwriting" | "ear-rhythm";

export const skillTrackIds: SkillTrackId[] = [
  "reading-pitch",
  "harmony-songwriting",
  "ear-rhythm"
];

export type SkillMeta = {
  id: SkillId;
  title: string;
  /** Short learner-facing description. */
  summary: string;
  /** The generated practice module that trains this skill. */
  moduleId: string;
  /** Skills that are helpful to learn first (soft prerequisites, no hard lock). */
  prerequisites: SkillId[];
  /** Learning tracks this skill belongs to. */
  tracks: SkillTrackId[];
};

export const skillMetas: SkillMeta[] = [
  {
    id: "note-reading",
    title: "Note reading",
    summary: "Name notes shown on the staff.",
    moduleId: "pitch",
    prerequisites: [],
    tracks: ["reading-pitch"]
  },
  {
    id: "staff-position",
    title: "Staff positions",
    summary: "Place notes on the treble and bass staff.",
    moduleId: "staff",
    prerequisites: ["note-reading"],
    tracks: ["reading-pitch"]
  },
  {
    id: "scale-spelling",
    title: "Scale spelling",
    summary: "Build scales from a tonic.",
    moduleId: "scales",
    prerequisites: ["note-reading"],
    tracks: ["reading-pitch", "harmony-songwriting"]
  },
  {
    id: "interval-quality",
    title: "Interval quality",
    summary: "Measure interval size and quality.",
    moduleId: "intervals",
    prerequisites: ["note-reading"],
    tracks: ["reading-pitch", "ear-rhythm"]
  },
  {
    id: "chord-spelling",
    title: "Chord spelling",
    summary: "Spell triads, sevenths, and inversions.",
    moduleId: "chords",
    prerequisites: ["interval-quality", "scale-spelling"],
    tracks: ["harmony-songwriting"]
  },
  {
    id: "roman-numerals",
    title: "Roman numerals",
    summary: "Turn chords into harmonic grammar.",
    moduleId: "harmony",
    prerequisites: ["chord-spelling"],
    tracks: ["harmony-songwriting"]
  },
  {
    id: "voice-leading",
    title: "Voice leading",
    summary: "Connect chords with smooth motion.",
    moduleId: "harmony",
    prerequisites: ["roman-numerals"],
    tracks: ["harmony-songwriting"]
  },
  {
    id: "rhythm-reading",
    title: "Rhythm reading",
    summary: "Read beats, rests, dots, ties, and tuplets.",
    moduleId: "rhythm",
    prerequisites: [],
    tracks: ["ear-rhythm"]
  },
  {
    id: "ear-training",
    title: "Ear training",
    summary: "Identify intervals, chords, scales, and cadences by sound.",
    moduleId: "ear",
    prerequisites: ["interval-quality"],
    tracks: ["ear-rhythm"]
  },
  {
    id: "instrument-application",
    title: "Instrument application",
    summary: "Apply theory across piano, strings, drums, and voice.",
    moduleId: "instruments",
    prerequisites: ["chord-spelling", "scale-spelling"],
    tracks: ["harmony-songwriting", "ear-rhythm"]
  }
];

export const skillsById = new Map(skillMetas.map((skill) => [skill.id, skill]));

/**
 * Map a free-text prompt skill target (the first entry in `skillTargets`) to a
 * canonical SkillId. Returns `undefined` for tokens that are not primary skills
 * (for example clef names or instrument ids used as secondary tags).
 */
const primarySkillByToken: Record<string, SkillId> = {
  "note-reading": "note-reading",
  "staff-click": "staff-position",
  "scale-spelling": "scale-spelling",
  "interval-quality": "interval-quality",
  "interval-size": "interval-quality",
  "chord-symbol": "chord-spelling",
  triads: "chord-spelling",
  "seventh-chords": "chord-spelling",
  "roman-numerals": "roman-numerals",
  "voice-leading": "voice-leading",
  "rhythm-grid": "rhythm-reading",
  "ear-training": "ear-training",
  "instrument-application": "instrument-application"
};

export function skillIdForTargets(
  skillTargets: string[] | undefined
): SkillId | undefined {
  if (!skillTargets) {
    return undefined;
  }

  for (const token of skillTargets) {
    const skillId = primarySkillByToken[token];

    if (skillId) {
      return skillId;
    }
  }

  return undefined;
}

/** Map a generated practice module id to its primary skill, when one exists. */
export function skillIdForModule(moduleId: string): SkillId | undefined {
  return skillMetas.find((skill) => skill.moduleId === moduleId)?.id;
}

export function skillsForTrack(trackId: SkillTrackId): SkillMeta[] {
  return skillMetas.filter((skill) => skill.tracks.includes(trackId));
}

/**
 * Canonical lesson -> skills map. Lessons can override this with an optional
 * `skills` field in their metadata; otherwise this slug-based map is used so the
 * 23 existing MDX lessons connect to the skill graph without editing each file.
 */
const lessonSkillMap: Record<string, SkillId[]> = {
  "sound-pitch": ["note-reading"],
  "staff-keyboard": ["staff-position", "note-reading"],
  "rhythm-meter": ["rhythm-reading"],
  "accidentals-steps": ["note-reading", "scale-spelling"],
  "scales-keys": ["scale-spelling"],
  intervals: ["interval-quality"],
  triads: ["chord-spelling"],
  "review-glossary": [],
  "scale-fluency": ["scale-spelling"],
  "sevenths-inversions": ["chord-spelling"],
  "diatonic-harmony": ["roman-numerals"],
  "rhythm-meter-lab": ["rhythm-reading"],
  "ear-training-basics": ["ear-training"],
  "song-building": ["instrument-application", "roman-numerals"],
  "intervals-fluency": ["interval-quality"],
  "minor-scales-modes": ["scale-spelling"],
  "seventh-chords-keys": ["chord-spelling", "roman-numerals"],
  "cadences-phrases": ["roman-numerals"],
  "common-progressions": ["roman-numerals"],
  "voice-leading-basics": ["voice-leading"],
  "pop-rock-harmony": ["roman-numerals"],
  "form-song-sections": ["instrument-application"],
  "analysis-lab": ["roman-numerals"],
  "chord-extensions": ["chord-spelling"],
  "syncopation-groove": ["rhythm-reading"],
  "twelve-bar-blues": ["roman-numerals", "chord-spelling"]
};

/**
 * Skills a lesson teaches. Prefers an explicit `meta.skills` override, then
 * falls back to the canonical slug-based map.
 */
export function skillsForLesson(
  slug: string,
  metaSkills?: string[]
): SkillId[] {
  if (metaSkills && metaSkills.length > 0) {
    return metaSkills.filter((skill): skill is SkillId =>
      skillsById.has(skill as SkillId)
    );
  }

  return lessonSkillMap[slug] ?? [];
}

