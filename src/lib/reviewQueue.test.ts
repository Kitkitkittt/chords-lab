import { describe, expect, it } from "vitest";
import { updateReviewQueueForAttempt } from "./reviewQueue";

const attemptedAt = "2026-06-01T00:00:00.000Z";

describe("review queue two-correct rule", () => {
  it("keeps a missed prompt queued after the first correct answer", () => {
    const result = updateReviewQueueForAttempt({
      queue: ["staff-click-1"],
      previous: {
        consecutiveCorrect: 0,
        lastResult: "incorrect",
        lastAttemptedAt: attemptedAt
      },
      promptId: "staff-click-1",
      isCorrect: true,
      attemptedAt
    });

    expect(result.queue).toEqual(["staff-click-1"]);
    expect(result.state.consecutiveCorrect).toBe(1);
    expect(result.cleared).toBe(false);
  });

  it("clears a missed prompt after two consecutive correct answers", () => {
    const result = updateReviewQueueForAttempt({
      queue: ["staff-click-1"],
      previous: {
        consecutiveCorrect: 1,
        lastResult: "correct",
        lastAttemptedAt: attemptedAt
      },
      promptId: "staff-click-1",
      isCorrect: true,
      attemptedAt
    });

    expect(result.queue).toEqual([]);
    expect(result.state.consecutiveCorrect).toBe(2);
    expect(result.cleared).toBe(true);
  });

  it("resets consecutive correct count on an incorrect answer", () => {
    const result = updateReviewQueueForAttempt({
      queue: [],
      previous: {
        consecutiveCorrect: 1,
        lastResult: "correct",
        lastAttemptedAt: attemptedAt
      },
      promptId: "scale-build-1",
      isCorrect: false,
      attemptedAt
    });

    expect(result.queue).toEqual(["scale-build-1"]);
    expect(result.state.consecutiveCorrect).toBe(0);
    expect(result.state.lastResult).toBe("incorrect");
  });
});
