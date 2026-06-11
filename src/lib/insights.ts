/**
 * Practice insights for Chords Lab.
 *
 * Pure, deterministic analysis that turns local progress data into a small set
 * of calm, encouraging insight cards: where things are getting confusing, which
 * skills are weakest or strongest, how much review is waiting, and recent
 * momentum. The copy is intentionally plain and non-judgmental: no streak
 * pressure, no scolding, no exclamation overload.
 *
 * This module is pure data and pure functions (no React, no storage, no DOM).
 * The `now` clock is injectable so callers and tests stay deterministic.
 */

import type { ProgressState, SkillMastery } from "../types/course";
import { getDueSkillIds } from "./adaptiveReview";
import { skillsById, type SkillId } from "./skills";

export type InsightCard = {
  id: string;
  tone: "celebrate" | "focus" | "neutral";
  title: string;
  body: string;
  actionLabel?: string;
  actionRoute?: string;
};

const dayInMs = 24 * 60 * 60 * 1000;
const defaultMinAttempts = 3;

/** Safe accuracy ratio in the range [0, 1]; returns 0 when nothing attempted. */
export function accuracy(correct: number, attempted: number): number {
  if (attempted <= 0) {
    return 0;
  }

  return correct / attempted;
}

function skillTitle(skillId: SkillId): string {
  return skillsById.get(skillId)?.title ?? skillId;
}

function skillModuleId(skillId: SkillId): string | undefined {
  return skillsById.get(skillId)?.moduleId;
}

type ScoredSkill = {
  skillId: SkillId;
  mastery: SkillMastery;
  ratio: number;
};

function scoredSkills(
  progress: ProgressState,
  minAttempts: number
): ScoredSkill[] {
  return Object.entries(progress.skillMastery)
    .filter(
      (entry): entry is [SkillId, SkillMastery] =>
        skillsById.has(entry[0] as SkillId) &&
        entry[1].attempted >= minAttempts
    )
    .map(([skillId, mastery]) => ({
      skillId,
      mastery,
      ratio: accuracy(mastery.correct, mastery.attempted)
    }));
}

/**
 * The skill with the lowest accuracy among skills practiced at least
 * `minAttempts` times. Returns `undefined` when no skill qualifies.
 */
export function weakestSkill(
  progress: ProgressState,
  minAttempts: number = defaultMinAttempts
): SkillId | undefined {
  const candidates = scoredSkills(progress, minAttempts);

  if (candidates.length === 0) {
    return undefined;
  }

  return candidates.reduce((lowest, current) =>
    current.ratio < lowest.ratio ? current : lowest
  ).skillId;
}

/**
 * The skill with the highest accuracy among skills practiced at least
 * `minAttempts` times. Returns `undefined` when no skill qualifies.
 */
export function strongestSkill(
  progress: ProgressState,
  minAttempts: number = defaultMinAttempts
): SkillId | undefined {
  const candidates = scoredSkills(progress, minAttempts);

  if (candidates.length === 0) {
    return undefined;
  }

  return candidates.reduce((highest, current) =>
    current.ratio > highest.ratio ? current : highest
  ).skillId;
}

function missedPromptCount(progress: ProgressState): number {
  return Object.values(progress.practiceMastery).reduce(
    (total, mastery) => total + mastery.reviewQueue.length,
    0
  );
}

function sessionsInLastDays(
  progress: ProgressState,
  now: Date,
  days: number
): number {
  const cutoff = now.getTime() - days * dayInMs;

  return progress.generatedSessionHistory.filter((session) => {
    const completed = Date.parse(session.completedAt);

    return !Number.isNaN(completed) && completed >= cutoff;
  }).length;
}

function hasAnyActivity(progress: ProgressState): boolean {
  return (
    Object.keys(progress.skillMastery).length > 0 ||
    Object.keys(progress.practiceMastery).length > 0 ||
    Object.keys(progress.practiceResults).length > 0 ||
    progress.generatedSessionHistory.length > 0
  );
}

function formatPercent(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}

/**
 * Build up to ~5 insight cards from local progress, ordered most useful first.
 * Never throws on empty or partial progress.
 */
export function buildInsights(
  progress: ProgressState,
  now: Date = new Date()
): InsightCard[] {
  const cards: InsightCard[] = [];

  // Review load comes first: it is the most actionable signal.
  const dueSkillIds = getDueSkillIds(progress.skillMastery, now);
  const queueCount = missedPromptCount(progress);
  const reviewLoad = dueSkillIds.length + queueCount;

  if (reviewLoad > 0) {
    cards.push({
      id: "review-load",
      tone: "focus",
      title: "A little review is waiting",
      body: `You have ${reviewLoad} item${
        reviewLoad === 1 ? "" : "s"
      } ready to revisit. A short pass will help it settle.`,
      actionLabel: "Open review",
      actionRoute: "/review"
    });
  } else if (progress.generatedSessionHistory.length > 0) {
    cards.push({
      id: "review-clear",
      tone: "celebrate",
      title: "Your review queue is clear",
      body: "Nothing is due right now. Everything you have practiced is resting comfortably.",
      actionLabel: "Browse practice",
      actionRoute: "/practice"
    });
  }

  // Weakest skill: a gentle place to focus next.
  const weakest = weakestSkill(progress);

  if (weakest) {
    const mastery = progress.skillMastery[weakest];
    const ratio = accuracy(mastery.correct, mastery.attempted);
    const moduleId = skillModuleId(weakest);

    cards.push({
      id: `weak-${weakest}`,
      tone: "focus",
      title: `Room to grow: ${skillTitle(weakest)}`,
      body: `You are at ${formatPercent(
        ratio
      )} here. A few focused reps would make a noticeable difference.`,
      actionLabel: "Practice this",
      actionRoute: moduleId ? `/practice/${moduleId}` : "/practice"
    });
  }

  // Strongest skill: quiet recognition of progress.
  const strongest = strongestSkill(progress);

  if (strongest && strongest !== weakest) {
    const mastery = progress.skillMastery[strongest];
    const ratio = accuracy(mastery.correct, mastery.attempted);

    cards.push({
      id: `strong-${strongest}`,
      tone: "celebrate",
      title: `${skillTitle(strongest)} is looking solid`,
      body: `You are holding ${formatPercent(
        ratio
      )} accuracy here. Nice, steady work.`
    });
  }

  // Momentum: recent sessions, framed as encouragement rather than pressure.
  const recentSessions = sessionsInLastDays(progress, now, 7);

  if (recentSessions > 0) {
    cards.push({
      id: "momentum",
      tone: "celebrate",
      title: "You have kept things moving",
      body: `You finished ${recentSessions} session${
        recentSessions === 1 ? "" : "s"
      } in the last week. Small sessions add up.`
    });
  }

  // Gentle default when there is essentially nothing to analyze yet.
  if (cards.length === 0 || !hasAnyActivity(progress)) {
    cards.push({
      id: "getting-started",
      tone: "neutral",
      title: "Start with a short session",
      body: "A few minutes of practice gives us something to learn from. There is no rush.",
      actionLabel: "Begin practice",
      actionRoute: "/practice"
    });
  }

  return cards.slice(0, 5);
}
