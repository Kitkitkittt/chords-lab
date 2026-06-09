import { describe, expect, it } from "vitest";
import {
  skillIdForModule,
  skillIdForTargets,
  skillsForLesson,
  skillsForTrack
} from "./skills";
import {
  interleaveReviewQueue,
  learningTracks,
  overallMastery,
  recommendSkills,
  rollUpSkillMastery,
  skillLevelMap,
  SKILL_LEVEL_RANK,
  trackProgressList
} from "./learningPath";
import { createDefaultAdaptiveSkillState } from "./adaptiveReview";
import type { ProgressState, SkillMastery } from "../types/course";

function mastery(overrides: Partial<SkillMastery> = {}): SkillMastery {
  return { ...createDefaultAdaptiveSkillState(), ...overrides };
}

function progressWith(
  skillMastery: ProgressState["skillMastery"]
): ProgressState {
  return {
    schemaVersion: 1,
    completedLessonSlugs: [],
    bookmarkedLessonSlugs: [],
    checkResults: {},
    practiceResults: {},
    practiceMastery: {},
    reviewPromptState: {},
    skillMastery,
    generatedSessionHistory: [],
    savedSongSketches: [],
    sync: { enabled: false, provider: "none" },
    settings: { audioEnabled: true, reducedMotion: false }
  };
}

describe("skills taxonomy", () => {
  it("maps prompt skill targets to canonical skill ids", () => {
    expect(skillIdForTargets(["note-reading", "treble"])).toBe("note-reading");
    expect(skillIdForTargets(["staff-click", "bass"])).toBe("staff-position");
    expect(skillIdForTargets(["chord-symbol", "triads"])).toBe("chord-spelling");
    expect(skillIdForTargets(["voice-leading", "progressions"])).toBe(
      "voice-leading"
    );
    expect(skillIdForTargets(["unknown-token"])).toBeUndefined();
    expect(skillIdForTargets(undefined)).toBeUndefined();
  });

  it("maps modules and lessons to skills", () => {
    expect(skillIdForModule("harmony")).toBe("roman-numerals");
    expect(skillsForLesson("sound-pitch")).toEqual(["note-reading"]);
    expect(skillsForLesson("voice-leading-basics")).toEqual(["voice-leading"]);
    expect(skillsForLesson("unknown-slug")).toEqual([]);
  });

  it("honors explicit meta.skills overrides", () => {
    expect(skillsForLesson("sound-pitch", ["interval-quality"])).toEqual([
      "interval-quality"
    ]);
    // Unknown override skills are filtered out.
    expect(skillsForLesson("sound-pitch", ["not-a-skill"])).toEqual([]);
  });

  it("lists skills for a track", () => {
    const harmonySkills = skillsForTrack("harmony-songwriting").map((s) => s.id);
    expect(harmonySkills).toContain("roman-numerals");
    expect(harmonySkills).toContain("voice-leading");
  });
});

describe("learning path", () => {
  it("rolls up mastery per skill id", () => {
    const progress = progressWith({
      "note-reading": mastery({ correct: 9, attempted: 10 }),
      treble: mastery({ correct: 1, attempted: 1 })
    });
    const rollup = rollUpSkillMastery(progress.skillMastery);
    const noteReading = rollup.get("note-reading");

    expect(noteReading?.correct).toBe(9);
    expect(noteReading?.attempted).toBe(10);
    expect(noteReading?.level).toBe("strong");
  });

  it("recommends review-due skills first", () => {
    const progress = progressWith({
      "rhythm-grid": mastery({
        correct: 1,
        attempted: 4,
        reviewQueue: ["rhythm-grid-1"]
      })
    });
    const recommendations = recommendSkills(progress, 3);

    expect(recommendations[0]?.skill.id).toBe("rhythm-reading");
    expect(recommendations[0]?.reason).toBe("review-due");
  });

  it("biases recommendations toward an active track", () => {
    const progress = progressWith({
      "note-reading": mastery({ correct: 1, attempted: 4 }),
      "chord-symbol": mastery({ correct: 1, attempted: 4 })
    });

    const biased = recommendSkills(
      progress,
      3,
      new Date(),
      "harmony-songwriting"
    );

    expect(biased[0]?.skill.tracks).toContain("harmony-songwriting");
  });

  it("interleaves review across due skills", () => {
    const past = new Date(Date.now() - 86_400_000).toISOString();
    const progress = progressWith({
      "note-reading": mastery({
        reviewQueue: ["n1", "n2"],
        dueAt: past
      }),
      "rhythm-grid": mastery({
        reviewQueue: ["r1"],
        dueAt: past
      })
    });
    const interleaved = interleaveReviewQueue(progress.skillMastery);

    expect(interleaved).toContain("n1");
    expect(interleaved).toContain("r1");
    // Round-robin: the second skill's first prompt comes before the first
    // skill's second prompt.
    expect(interleaved.indexOf("r1")).toBeLessThan(interleaved.indexOf("n2"));
  });

  it("computes an overall mastery score between 0 and 1", () => {
    const empty = overallMastery(progressWith({}));
    expect(empty).toBe(0);

    const strong = overallMastery(
      progressWith({
        "note-reading": mastery({ correct: 10, attempted: 10 })
      })
    );
    expect(strong).toBeGreaterThan(0);
    expect(strong).toBeLessThanOrEqual(1);
  });

  it("detects a skill level-up across an attempt boundary", () => {
    const before = progressWith({
      "note-reading": mastery({ correct: 1, attempted: 2 })
    });
    const after = progressWith({
      "note-reading": mastery({ correct: 10, attempted: 10 })
    });

    const beforeLevel =
      skillLevelMap(before.skillMastery).get("note-reading") ?? "new";
    const afterLevel =
      skillLevelMap(after.skillMastery).get("note-reading") ?? "new";

    expect(SKILL_LEVEL_RANK[afterLevel]).toBeGreaterThan(
      SKILL_LEVEL_RANK[beforeLevel]
    );
    expect(afterLevel).toBe("strong");
  });

  it("derives per-track progress and a next skill", () => {
    const progress = progressWith({
      "note-reading": mastery({ correct: 10, attempted: 10 })
    });
    const tracks = trackProgressList(progress);

    expect(tracks).toHaveLength(learningTracks.length);

    const reading = tracks.find((t) => t.track.id === "reading-pitch");
    expect(reading).toBeDefined();
    expect(reading?.mastery).toBeGreaterThan(0);
    // note-reading is strong, so the next skill should be a different one.
    expect(reading?.nextSkill?.id).not.toBe("note-reading");
  });
});
