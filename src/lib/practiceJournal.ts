/**
 * Practice journal and weekly digest (Phase 5: calm motivation).
 *
 * Pure summarizers over `ProgressState.generatedSessionHistory`. There are no
 * streaks, no loss states, and no pressure language here — just a gentle,
 * factual look back at recent practice. No React, no storage, no DOM: every
 * function operates on the data passed in.
 */

import type { ProgressState } from "../types/course";

export type JournalEntry = {
  /** Calendar day in UTC, formatted as YYYY-MM-DD. */
  date: string;
  sessionCount: number;
  correct: number;
  attempted: number;
  /** Distinct module ids practiced that day, in first-seen order. */
  modules: string[];
};

export type WeeklyDigest = {
  sessionCount: number;
  correct: number;
  attempted: number;
  /** correct / attempted, or 0 when nothing was attempted. */
  accuracy: number;
  /** Number of distinct calendar days with at least one session. */
  activeDays: number;
  /** Module id with the most attempts in the window, when any. */
  topModule?: string;
  /** A calm, plain-language sentence summarizing the week. */
  headline: string;
};

/** Safe ratio: correct / attempted, returning 0 when attempted is 0. */
export function accuracy(correct: number, attempted: number): number {
  if (attempted <= 0) {
    return 0;
  }

  return correct / attempted;
}

/** The UTC calendar day (YYYY-MM-DD) for an ISO timestamp. */
function utcDay(isoTimestamp: string): string {
  return new Date(isoTimestamp).toISOString().slice(0, 10);
}

/**
 * Group practice sessions by UTC calendar day, summing correct/attempted and
 * collecting distinct module ids. Days are sorted most-recent first.
 */
export function buildJournal(progress: ProgressState): JournalEntry[] {
  const byDay = new Map<string, JournalEntry>();

  for (const session of progress.generatedSessionHistory) {
    const date = utcDay(session.completedAt);
    let entry = byDay.get(date);

    if (!entry) {
      entry = {
        date,
        sessionCount: 0,
        correct: 0,
        attempted: 0,
        modules: []
      };
      byDay.set(date, entry);
    }

    entry.sessionCount += 1;
    entry.correct += session.correct;
    entry.attempted += session.attempted;

    if (!entry.modules.includes(session.moduleId)) {
      entry.modules.push(session.moduleId);
    }
  }

  return Array.from(byDay.values()).sort((a, b) =>
    a.date < b.date ? 1 : a.date > b.date ? -1 : 0
  );
}

/**
 * Summarize practice within the last 7 days of `now` (defaults to the current
 * time). The headline is a single calm sentence with no streak pressure.
 */
export function buildWeeklyDigest(
  progress: ProgressState,
  now: Date = new Date()
): WeeklyDigest {
  const windowStart = now.getTime() - 7 * 24 * 60 * 60 * 1000;
  const days = new Set<string>();
  const attemptsByModule = new Map<string, number>();

  let sessionCount = 0;
  let correct = 0;
  let attempted = 0;

  for (const session of progress.generatedSessionHistory) {
    const completed = new Date(session.completedAt).getTime();

    if (completed < windowStart || completed > now.getTime()) {
      continue;
    }

    sessionCount += 1;
    correct += session.correct;
    attempted += session.attempted;
    days.add(utcDay(session.completedAt));
    attemptsByModule.set(
      session.moduleId,
      (attemptsByModule.get(session.moduleId) ?? 0) + session.attempted
    );
  }

  let topModule: string | undefined;
  let topAttempts = -1;

  for (const [moduleId, count] of attemptsByModule) {
    if (count > topAttempts) {
      topModule = moduleId;
      topAttempts = count;
    }
  }

  const activeDays = days.size;
  const headline = buildHeadline(sessionCount, activeDays);

  return {
    sessionCount,
    correct,
    attempted,
    accuracy: accuracy(correct, attempted),
    activeDays,
    topModule,
    headline
  };
}

/** A calm one-sentence summary. At most one exclamation, no streak pressure. */
function buildHeadline(sessionCount: number, activeDays: number): string {
  if (sessionCount === 0) {
    return "A fresh week. A short session is a good start.";
  }

  const sessionWord = sessionCount === 1 ? "session" : "sessions";
  const dayWord = activeDays === 1 ? "day" : "days";

  return `A steady week: ${sessionCount} ${sessionWord} across ${activeDays} ${dayWord}.`;
}
