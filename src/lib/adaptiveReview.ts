import type { AdaptiveSkillState, ProgressState } from "../types/course";

const defaultEase = 2.3;
const minEase = 1.3;
const maxEase = 3;

function uniqueAppend(items: string[], item: string): string[] {
  return items.includes(item) ? items : [...items, item];
}

function removeItem(items: string[], item: string): string[] {
  return items.filter((current) => current !== item);
}

function addDays(date: Date, days: number): string {
  const next = new Date(date);
  next.setDate(next.getDate() + days);

  return next.toISOString();
}

export function createDefaultAdaptiveSkillState(): AdaptiveSkillState {
  return {
    correct: 0,
    attempted: 0,
    ease: defaultEase,
    intervalDays: 1,
    lapses: 0,
    reviewQueue: []
  };
}

export function updateAdaptiveSkillState(
  previous: AdaptiveSkillState | undefined,
  practiceId: string,
  isCorrect: boolean,
  practicedAt = new Date()
): AdaptiveSkillState {
  const current = previous ?? createDefaultAdaptiveSkillState();
  const ease = Math.min(
    maxEase,
    Math.max(minEase, current.ease + (isCorrect ? 0.08 : -0.22))
  );
  const intervalDays = isCorrect
    ? Math.max(1, Math.round((current.intervalDays || 1) * ease))
    : 0;

  return {
    correct: current.correct + (isCorrect ? 1 : 0),
    attempted: current.attempted + 1,
    ease,
    intervalDays,
    dueAt: isCorrect ? addDays(practicedAt, intervalDays) : practicedAt.toISOString(),
    lapses: current.lapses + (isCorrect ? 0 : 1),
    lastResult: isCorrect ? "correct" : "incorrect",
    lastPracticedAt: practicedAt.toISOString(),
    reviewQueue: isCorrect
      ? removeItem(current.reviewQueue, practiceId)
      : uniqueAppend(current.reviewQueue, practiceId)
  };
}

export function getDueSkillIds(
  skillMastery: ProgressState["skillMastery"],
  now = new Date()
): string[] {
  return Object.entries(skillMastery)
    .filter(([, mastery]) => {
      if (!mastery.dueAt) {
        return mastery.reviewQueue.length > 0;
      }

      return Date.parse(mastery.dueAt) <= now.getTime();
    })
    .sort(([, left], [, right]) => {
      const leftDue = Date.parse(left.dueAt ?? left.lastPracticedAt ?? "0");
      const rightDue = Date.parse(right.dueAt ?? right.lastPracticedAt ?? "0");

      return leftDue - rightDue || right.lapses - left.lapses;
    })
    .map(([skill]) => skill);
}

export function getAdaptiveReviewSummary(progress: ProgressState) {
  const dueSkillIds = getDueSkillIds(progress.skillMastery);
  const missedPromptCount = Object.values(progress.practiceMastery).reduce(
    (total, mastery) => total + mastery.reviewQueue.length,
    0
  );

  return {
    dueSkillIds,
    dueSkillCount: dueSkillIds.length,
    missedPromptCount
  };
}

/**
 * Apply a learner confidence rating to a skill without counting a new attempt.
 * Easy nudges ease up (longer interval); hard nudges ease down. This is the
 * gentle, optional, Anki-style signal used by the practice result panel.
 */
export function applyConfidenceToSkillState(
  previous: AdaptiveSkillState | undefined,
  confidence: "easy" | "hard",
  ratedAt = new Date()
): AdaptiveSkillState {
  const current = previous ?? createDefaultAdaptiveSkillState();
  const delta = confidence === "easy" ? 0.06 : -0.06;
  const ease = Math.min(maxEase, Math.max(minEase, current.ease + delta));
  const wasCorrect = current.lastResult !== "incorrect";
  const intervalDays = wasCorrect
    ? Math.max(1, Math.round((current.intervalDays || 1) * ease))
    : current.intervalDays;

  return {
    ...current,
    ease,
    intervalDays,
    dueAt: wasCorrect ? addDays(ratedAt, intervalDays) : current.dueAt
  };
}
