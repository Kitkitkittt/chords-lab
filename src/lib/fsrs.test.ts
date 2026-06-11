import { describe, expect, it } from "vitest";

import {
  createCard,
  intervalDays,
  isDue,
  reviewCard,
  smoothReviewLoad,
  type Rating
} from "./fsrs";

const fixedNow = new Date("2026-01-01T12:00:00.000Z");

describe("reviewCard", () => {
  it("a single 'good' review yields stability, reps, future dueAt, no lapse", () => {
    const card = reviewCard(createCard(), "good", fixedNow);

    expect(card.stability).toBeGreaterThan(0);
    expect(card.reps).toBe(1);
    expect(card.lapses).toBe(0);
    expect(card.dueAt).toBeDefined();
    expect(Date.parse(card.dueAt as string)).toBeGreaterThan(fixedNow.getTime());
  });

  it("repeated 'good' reviews never shrink the interval over 3 reps", () => {
    let card = createCard();
    let previous = 0;

    for (let i = 0; i < 3; i += 1) {
      card = reviewCard(card, "good", fixedNow);
      const current = intervalDays(card);
      expect(current).toBeGreaterThanOrEqual(previous);
      previous = current;
    }

    // And strictly grows beyond the seeded first interval by the third rep.
    expect(intervalDays(card)).toBeGreaterThan(1);
  });

  it("'again' increments lapses and shortens interval vs a 'good' review", () => {
    const base = reviewCard(createCard(), "good", fixedNow);

    const lapsed = reviewCard(base, "again", fixedNow);
    const continued = reviewCard(base, "good", fixedNow);

    expect(lapsed.lapses).toBe(base.lapses + 1);
    expect(intervalDays(lapsed)).toBeLessThan(intervalDays(continued));
  });

  it("keeps difficulty within [1, 10] across many mixed reviews", () => {
    const ratings: Rating[] = ["easy", "easy", "good", "easy", "good", "easy"];
    let card = createCard();
    for (const rating of ratings) {
      card = reviewCard(card, rating, fixedNow);
      expect(card.difficulty).toBeGreaterThanOrEqual(1);
      expect(card.difficulty).toBeLessThanOrEqual(10);
    }

    const hardRatings: Rating[] = ["again", "hard", "again", "hard", "again", "hard"];
    card = createCard();
    for (const rating of hardRatings) {
      card = reviewCard(card, rating, fixedNow);
      expect(card.difficulty).toBeGreaterThanOrEqual(1);
      expect(card.difficulty).toBeLessThanOrEqual(10);
    }
  });
});

describe("isDue", () => {
  it("is true for a fresh card and false right after a 'good' review", () => {
    expect(isDue(createCard(), fixedNow)).toBe(true);

    const reviewed = reviewCard(createCard(), "good", fixedNow);
    expect(isDue(reviewed, fixedNow)).toBe(false);
  });
});

describe("smoothReviewLoad", () => {
  it("spreads 5 same-day reviews across 3 days with counts [2, 2, 1]", () => {
    const dates = Array.from({ length: 5 }, () => "2026-02-10T08:00:00.000Z");
    const result = smoothReviewLoad(dates, 2, fixedNow);

    expect(result.get("2026-02-10")).toBe(2);
    expect(result.get("2026-02-11")).toBe(2);
    expect(result.get("2026-02-12")).toBe(1);
    expect(result.size).toBe(3);
  });
});
