import type { GeneratedPracticeModuleId } from "../lib/practiceGenerators";

/**
 * Single source of truth for how each lesson connects to the rest of the app:
 * which practice route its "Practice this" link opens, which module its
 * checkpoint draws prompts from, and which practice module(s) it unlocks for
 * mixed review. Previously these were three separate hand-maintained maps in
 * LessonPage and ReviewPage that could drift apart.
 */
export type LessonLink = {
  /** Route opened by the lesson's "Practice this" action. */
  practiceRoute: string;
  /** Generated practice module used by the lesson checkpoint. */
  checkpointModule: GeneratedPracticeModuleId;
  /** Practice modules this lesson unlocks for mixed review when complete. */
  reviewModules: GeneratedPracticeModuleId[];
};

function routeFor(moduleId: GeneratedPracticeModuleId): string {
  return `/practice/${moduleId}/setup`;
}

export const lessonLinks: Record<string, LessonLink> = {
  "sound-pitch": {
    practiceRoute: routeFor("pitch"),
    checkpointModule: "pitch",
    reviewModules: ["pitch"]
  },
  "staff-keyboard": {
    practiceRoute: routeFor("staff"),
    checkpointModule: "staff",
    reviewModules: ["staff"]
  },
  "rhythm-meter": {
    practiceRoute: routeFor("rhythm"),
    checkpointModule: "rhythm",
    reviewModules: ["rhythm"]
  },
  "accidentals-steps": {
    practiceRoute: routeFor("scales"),
    checkpointModule: "scales",
    reviewModules: ["scales"]
  },
  "scales-keys": {
    practiceRoute: routeFor("scales"),
    checkpointModule: "scales",
    reviewModules: ["scales"]
  },
  intervals: {
    practiceRoute: routeFor("intervals"),
    checkpointModule: "intervals",
    reviewModules: ["intervals", "chords"]
  },
  triads: {
    practiceRoute: routeFor("chords"),
    checkpointModule: "chords",
    reviewModules: ["intervals", "chords"]
  },
  "review-glossary": {
    practiceRoute: "/review",
    checkpointModule: "pitch",
    reviewModules: []
  },
  "scale-fluency": {
    practiceRoute: routeFor("scales"),
    checkpointModule: "scales",
    reviewModules: ["scales"]
  },
  "sevenths-inversions": {
    practiceRoute: routeFor("chords"),
    checkpointModule: "chords",
    reviewModules: ["intervals", "chords"]
  },
  "diatonic-harmony": {
    practiceRoute: routeFor("harmony"),
    checkpointModule: "harmony",
    reviewModules: ["intervals", "chords", "harmony"]
  },
  "rhythm-meter-lab": {
    practiceRoute: routeFor("rhythm"),
    checkpointModule: "rhythm",
    reviewModules: ["rhythm"]
  },
  "ear-training-basics": {
    practiceRoute: routeFor("ear"),
    checkpointModule: "ear",
    reviewModules: ["ear"]
  },
  "song-building": {
    practiceRoute: "/lab/song",
    checkpointModule: "harmony",
    reviewModules: ["harmony"]
  },
  "intervals-fluency": {
    practiceRoute: routeFor("intervals"),
    checkpointModule: "intervals",
    reviewModules: ["intervals"]
  },
  "minor-scales-modes": {
    practiceRoute: routeFor("scales"),
    checkpointModule: "scales",
    reviewModules: ["scales"]
  },
  "seventh-chords-keys": {
    practiceRoute: routeFor("chords"),
    checkpointModule: "chords",
    reviewModules: ["chords"]
  },
  "cadences-phrases": {
    practiceRoute: routeFor("harmony"),
    checkpointModule: "harmony",
    reviewModules: ["harmony"]
  },
  "common-progressions": {
    practiceRoute: routeFor("harmony"),
    checkpointModule: "harmony",
    reviewModules: ["harmony"]
  },
  "voice-leading-basics": {
    practiceRoute: routeFor("harmony"),
    checkpointModule: "harmony",
    reviewModules: ["harmony"]
  },
  "pop-rock-harmony": {
    practiceRoute: "/lab/song",
    checkpointModule: "harmony",
    reviewModules: ["harmony"]
  },
  "form-song-sections": {
    practiceRoute: "/lab/song",
    checkpointModule: "rhythm",
    reviewModules: ["rhythm"]
  },
  "analysis-lab": {
    practiceRoute: routeFor("harmony"),
    checkpointModule: "harmony",
    reviewModules: ["harmony"]
  },
  "chord-extensions": {
    practiceRoute: routeFor("chords"),
    checkpointModule: "chords",
    reviewModules: ["chords", "harmony"]
  },
  "syncopation-groove": {
    practiceRoute: routeFor("rhythm"),
    checkpointModule: "rhythm",
    reviewModules: ["rhythm"]
  },
  "twelve-bar-blues": {
    practiceRoute: routeFor("harmony"),
    checkpointModule: "harmony",
    reviewModules: ["chords", "harmony"]
  }
};

const FALLBACK_LINK: LessonLink = {
  practiceRoute: "/practice",
  checkpointModule: "pitch",
  reviewModules: []
};

export function lessonLinkFor(slug: string): LessonLink {
  return lessonLinks[slug] ?? FALLBACK_LINK;
}

/** Practice modules unlocked for review by a set of completed lessons. */
export function reviewModulesForCompletedLessons(
  completedLessonSlugs: string[]
): string[] {
  const moduleIds = new Set<string>();

  for (const slug of completedLessonSlugs) {
    for (const moduleId of lessonLinks[slug]?.reviewModules ?? []) {
      moduleIds.add(moduleId);
    }
  }

  return Array.from(moduleIds);
}
