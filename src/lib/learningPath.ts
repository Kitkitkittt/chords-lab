/**
 * Learning path: closes the loop between the skill graph and local progress.
 *
 * Pure functions that roll up `skillMastery` (keyed by raw prompt skill-target
 * tokens) into per-`SkillId` mastery, then derive soft recommendations and an
 * interleaved review order. No hard locks: recommendations are suggestions that
 * respect the app's calm, no-pressure design.
 */
import { getDueSkillIds } from "./adaptiveReview";
import {
  skillIdForTargets,
  skillMetas,
  skillsById,
  skillsForTrack,
  type SkillId,
  type SkillMeta,
  type SkillTrackId
} from "./skills";
import type { ProgressState } from "../types/course";

export type SkillProgress = {
  skill: SkillMeta;
  correct: number;
  attempted: number;
  /** 0..1 accuracy, 0 when never attempted. */
  accuracy: number;
  /** Coarse mastery level for display and gating. */
  level: "new" | "learning" | "practiced" | "strong";
  due: boolean;
  reviewQueueSize: number;
};

const STRONG_ACCURACY = 0.85;
const PRACTICED_ACCURACY = 0.6;
const MIN_ATTEMPTS_FOR_LEVEL = 4;

function levelFor(correct: number, attempted: number): SkillProgress["level"] {
  if (attempted === 0) {
    return "new";
  }

  const accuracy = correct / attempted;

  if (attempted >= MIN_ATTEMPTS_FOR_LEVEL && accuracy >= STRONG_ACCURACY) {
    return "strong";
  }

  if (accuracy >= PRACTICED_ACCURACY) {
    return "practiced";
  }

  return "learning";
}

/**
 * Aggregate raw `skillMastery` entries (keyed by prompt skill-target tokens)
 * into a single record per canonical SkillId.
 */
export function rollUpSkillMastery(
  skillMastery: ProgressState["skillMastery"],
  now = new Date()
): Map<SkillId, SkillProgress> {
  const totals = new Map<
    SkillId,
    { correct: number; attempted: number; due: boolean; queue: number }
  >();
  const dueSkillTokens = new Set(getDueSkillIds(skillMastery, now));

  for (const meta of skillMetas) {
    totals.set(meta.id, { correct: 0, attempted: 0, due: false, queue: 0 });
  }

  for (const [token, mastery] of Object.entries(skillMastery)) {
    const skillId = skillIdForTargets([token]);

    if (!skillId) {
      continue;
    }

    const entry = totals.get(skillId);

    if (!entry) {
      continue;
    }

    entry.correct += mastery.correct;
    entry.attempted += mastery.attempted;
    entry.queue += mastery.reviewQueue.length;

    if (dueSkillTokens.has(token)) {
      entry.due = true;
    }
  }

  const result = new Map<SkillId, SkillProgress>();

  for (const meta of skillMetas) {
    const entry = totals.get(meta.id) ?? {
      correct: 0,
      attempted: 0,
      due: false,
      queue: 0
    };

    result.set(meta.id, {
      skill: meta,
      correct: entry.correct,
      attempted: entry.attempted,
      accuracy: entry.attempted > 0 ? entry.correct / entry.attempted : 0,
      level: levelFor(entry.correct, entry.attempted),
      due: entry.due,
      reviewQueueSize: entry.queue
    });
  }

  return result;
}

export type SkillRecommendation = {
  skill: SkillMeta;
  reason: "review-due" | "shore-up" | "ready" | "next-up";
  detail: string;
};

/** Are a skill's soft prerequisites at least "practiced"? */
function prerequisitesReady(
  skill: SkillMeta,
  rollup: Map<SkillId, SkillProgress>
): boolean {
  return skill.prerequisites.every((prerequisite) => {
    const progress = rollup.get(prerequisite);
    return !progress || progress.level === "practiced" || progress.level === "strong";
  });
}

/**
 * Ordered, soft recommendations:
 *  1. Skills with review due.
 *  2. Weak skills to shore up.
 *  3. New skills whose prerequisites are ready.
 *  4. Anything else not yet strong.
 *
 * When `activeTrackId` is set, skills in that track are promoted within the
 * final list (stable), so an active track gently steers the suggestions without
 * hiding due reviews from other tracks.
 */
export function recommendSkills(
  progress: ProgressState,
  limit = 3,
  now = new Date(),
  activeTrackId?: string
): SkillRecommendation[] {
  const rollup = rollUpSkillMastery(progress.skillMastery, now);
  const recommendations: SkillRecommendation[] = [];
  const used = new Set<SkillId>();

  const push = (skill: SkillMeta, reason: SkillRecommendation["reason"], detail: string) => {
    if (used.has(skill.id)) {
      return;
    }

    used.add(skill.id);
    recommendations.push({ skill, reason, detail });
  };

  for (const progressEntry of rollup.values()) {
    if (progressEntry.due || progressEntry.reviewQueueSize > 0) {
      push(progressEntry.skill, "review-due", "Review is due for this skill.");
    }
  }

  for (const progressEntry of rollup.values()) {
    if (progressEntry.level === "learning") {
      push(
        progressEntry.skill,
        "shore-up",
        "Accuracy is still building. A short practice will help."
      );
    }
  }

  for (const progressEntry of rollup.values()) {
    if (progressEntry.level === "new" && prerequisitesReady(progressEntry.skill, rollup)) {
      push(progressEntry.skill, "ready", "You are ready to start this skill.");
    }
  }

  for (const progressEntry of rollup.values()) {
    if (progressEntry.level !== "strong") {
      push(progressEntry.skill, "next-up", "Keep this skill warm.");
    }
  }

  const ordered = activeTrackId
    ? [...recommendations].sort((left, right) => {
        const leftIn = left.skill.tracks.includes(
          activeTrackId as SkillTrackId
        )
          ? 0
          : 1;
        const rightIn = right.skill.tracks.includes(
          activeTrackId as SkillTrackId
        )
          ? 0
          : 1;
        return leftIn - rightIn;
      })
    : recommendations;

  return ordered.slice(0, limit);
}

/**
 * Interleave review across due skills rather than draining one skill at a time.
 * Returns prompt ids grouped round-robin by skill for better retention.
 */
export function interleaveReviewQueue(
  skillMastery: ProgressState["skillMastery"]
): string[] {
  const dueTokens = getDueSkillIds(skillMastery);
  const queues = dueTokens
    .map((token) => skillMastery[token]?.reviewQueue ?? [])
    .filter((queue) => queue.length > 0);

  const interleaved: string[] = [];
  const seen = new Set<string>();
  let index = 0;
  let added = true;

  while (added) {
    added = false;

    for (const queue of queues) {
      const promptId = queue[index];

      if (promptId !== undefined) {
        added = true;

        if (!seen.has(promptId)) {
          seen.add(promptId);
          interleaved.push(promptId);
        }
      }
    }

    index += 1;
  }

  return interleaved;
}

export function skillProgressList(
  progress: ProgressState,
  now = new Date()
): SkillProgress[] {
  return Array.from(rollUpSkillMastery(progress.skillMastery, now).values());
}

/** Overall mastery summary for display, 0..1 across all skills. */
export function overallMastery(progress: ProgressState): number {
  const list = skillProgressList(progress);

  if (list.length === 0) {
    return 0;
  }

  const score = list.reduce((total, item) => {
    if (item.level === "strong") {
      return total + 1;
    }

    if (item.level === "practiced") {
      return total + 0.66;
    }

    if (item.level === "learning") {
      return total + 0.33;
    }

    return total;
  }, 0);

  return Math.round((score / list.length) * 100) / 100;
}

export function isKnownSkill(skillId: string): skillId is SkillId {
  return skillsById.has(skillId as SkillId);
}

export type SkillLevel = SkillProgress["level"];

/** Ordinal rank of each mastery level, for detecting level-ups. */
export const SKILL_LEVEL_RANK: Record<SkillLevel, number> = {
  new: 0,
  learning: 1,
  practiced: 2,
  strong: 3
};

/**
 * Map each canonical SkillId to its current level. Used to detect when a skill
 * crosses a level boundary so the app can show a calm acknowledgment.
 */
export function skillLevelMap(
  skillMastery: ProgressState["skillMastery"],
  now = new Date()
): Map<SkillId, SkillLevel> {
  const rollup = rollUpSkillMastery(skillMastery, now);
  const levels = new Map<SkillId, SkillLevel>();

  for (const [skillId, progress] of rollup) {
    levels.set(skillId, progress.level);
  }

  return levels;
}

export type TrackMeta = {
  id: SkillTrackId;
  title: string;
  summary: string;
};

export const learningTracks: TrackMeta[] = [
  {
    id: "reading-pitch",
    title: "Reading & Pitch",
    summary: "Read notes, staff positions, scales, and intervals."
  },
  {
    id: "harmony-songwriting",
    title: "Harmony & Songwriting",
    summary: "Build chords, progressions, voice leading, and arrangements."
  },
  {
    id: "ear-rhythm",
    title: "Ear & Rhythm",
    summary: "Identify sounds and read rhythm with confidence."
  }
];

export type TrackProgress = {
  track: TrackMeta;
  /** 0..1 mastery across the track's skills. */
  mastery: number;
  /** The next skill to focus on within this track, if any. */
  nextSkill?: SkillMeta;
  /** True when any skill in the track has review due. */
  hasReviewDue: boolean;
};

/** Per-track progress and a recommended next skill, derived from the graph. */
export function trackProgressList(
  progress: ProgressState,
  now = new Date()
): TrackProgress[] {
  const rollup = rollUpSkillMastery(progress.skillMastery, now);
  const levelScore: Record<SkillProgress["level"], number> = {
    new: 0,
    learning: 0.33,
    practiced: 0.66,
    strong: 1
  };

  return learningTracks.map((track) => {
    const skills = skillsForTrack(track.id);
    const entries = skills
      .map((skill) => rollup.get(skill.id))
      .filter((entry): entry is SkillProgress => Boolean(entry));

    const mastery =
      entries.length === 0
        ? 0
        : Math.round(
            (entries.reduce((total, entry) => total + levelScore[entry.level], 0) /
              entries.length) *
              100
          ) / 100;

    const hasReviewDue = entries.some(
      (entry) => entry.due || entry.reviewQueueSize > 0
    );

    // Next skill: first review-due, then first not-strong, in track order.
    const nextSkill =
      entries.find((entry) => entry.due || entry.reviewQueueSize > 0)?.skill ??
      entries.find((entry) => entry.level !== "strong")?.skill;

    return { track, mastery, nextSkill, hasReviewDue };
  });
}

