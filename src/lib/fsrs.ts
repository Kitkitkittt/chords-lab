/**
 * Simplified FSRS-style spaced-repetition scheduler.
 *
 * This is a self-contained, PURE module modelling the spirit of FSRS
 * (Free Spaced Repetition Scheduler) without the exact published weights.
 * Each card tracks a `stability` (days the memory is expected to hold) and a
 * `difficulty` (1=easy .. 10=hard). Reviews nudge these values in faithful,
 * monotonic directions and derive the next interval from stability.
 *
 * NOTE: This is a deliberately simplified model. It is deterministic, has no
 * external coupling, and is intended to eventually replace the ease-based
 * scheduler in `adaptiveReview.ts`. The only nondeterminism allowed is the
 * injectable `now` parameter, which defaults to `new Date()`.
 */

export type Rating = "again" | "hard" | "good" | "easy";

export type FsrsCard = {
  stability: number;
  difficulty: number;
  reps: number;
  lapses: number;
  lastReviewedAt?: string;
  dueAt?: string;
};

// Difficulty is clamped to this 1 (easiest) .. 10 (hardest) scale.
const minDifficulty = 1;
const maxDifficulty = 10;
const defaultDifficulty = 5;

// Stability floor used when a card lapses ("again").
const lapseStability = 0.5;

// Initial stability (in days) granted on the first successful review,
// keyed by how confidently the learner answered.
const initialStability: Record<Exclude<Rating, "again">, number> = {
  hard: 1,
  good: 2,
  easy: 4
};

// How difficulty drifts per rating. Negative = easier, positive = harder.
const difficultyDelta: Record<Rating, number> = {
  again: 1.0,
  hard: 0.6,
  good: -0.4,
  easy: -0.8
};

// Multiplicative stability growth applied to subsequent successful reviews.
const stabilityGrowth: Record<Exclude<Rating, "again">, number> = {
  hard: 1.2,
  good: 1.8,
  easy: 2.6
};

function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value));
}

function addDays(date: Date, days: number): string {
  const next = new Date(date);
  next.setDate(next.getDate() + days);

  return next.toISOString();
}

/**
 * Create a fresh card with sensible defaults: zero stability (never studied),
 * mid-scale difficulty, and no review history.
 */
export function createCard(): FsrsCard {
  return {
    stability: 0,
    difficulty: defaultDifficulty,
    reps: 0,
    lapses: 0
  };
}

/**
 * Derived interval in whole days from the card's stability. Rounded, min 1.
 */
export function intervalDays(card: FsrsCard): number {
  return Math.max(1, Math.round(card.stability));
}

/**
 * Apply a review rating to a card, returning a NEW card (pure, no mutation).
 *
 * Behaviour:
 *  - difficulty drifts easier on "good"/"easy", harder on "again"/"hard",
 *    clamped to [1, 10].
 *  - "again" resets stability low and increments lapses.
 *  - the first successful review seeds an initial stability by rating.
 *  - subsequent successful reviews grow stability multiplicatively. Harder
 *    cards grow a touch slower, easier cards a touch faster.
 *  - the next interval is derived from the new stability and used for dueAt.
 */
export function reviewCard(card: FsrsCard, rating: Rating, now = new Date()): FsrsCard {
  const difficulty = clamp(
    card.difficulty + difficultyDelta[rating],
    minDifficulty,
    maxDifficulty
  );

  let stability: number;
  let lapses = card.lapses;

  if (rating === "again") {
    // A lapse: forget most of the gained stability and record the lapse.
    stability = lapseStability;
    lapses += 1;
  } else if (card.stability <= 0) {
    // First successful review: seed an initial stability by rating.
    stability = initialStability[rating];
  } else {
    // Subsequent success: grow stability multiplicatively. Difficulty acts as
    // a gentle modifier so harder cards grow slightly slower (and vice versa).
    const difficultyModifier = 1 + (defaultDifficulty - difficulty) * 0.04;
    stability = card.stability * stabilityGrowth[rating] * difficultyModifier;
  }

  const next: FsrsCard = {
    stability,
    difficulty,
    reps: card.reps + 1,
    lapses,
    lastReviewedAt: now.toISOString()
  };

  next.dueAt = addDays(now, intervalDays(next));

  return next;
}

/**
 * True when a card is due: it has never been scheduled (no dueAt) or its
 * dueAt is at or before `now`.
 */
export function isDue(card: FsrsCard, now = new Date()): boolean {
  if (!card.dueAt) {
    return true;
  }

  return Date.parse(card.dueAt) <= now.getTime();
}

function dayKey(date: Date): string {
  // YYYY-MM-DD in UTC for stable, deterministic bucketing.
  return date.toISOString().slice(0, 10);
}

/**
 * Smooth a set of due dates so that no single day exceeds `maxPerDay` reviews.
 * Overflow on a day cascades forward to subsequent days ("no pile-up").
 *
 * Returns a Map of YYYY-MM-DD -> count. Deterministic: input dates are sorted
 * chronologically before distribution.
 */
export function smoothReviewLoad(
  dueDates: string[],
  maxPerDay: number,
  now = new Date()
): Map<string, number> {
  const counts = new Map<string, number>();

  if (maxPerDay <= 0 || dueDates.length === 0) {
    return counts;
  }

  const nowMs = now.getTime();
  // Never schedule before today; clamp past-due dates up to `now`.
  const sorted = dueDates
    .map((iso) => Math.max(Date.parse(iso), nowMs))
    .sort((left, right) => left - right);

  for (const ms of sorted) {
    let day = new Date(ms);
    let key = dayKey(day);

    // Push forward day-by-day until we find a day under the cap.
    while ((counts.get(key) ?? 0) >= maxPerDay) {
      day = new Date(addDays(day, 1));
      key = dayKey(day);
    }

    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return counts;
}
