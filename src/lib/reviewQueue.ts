import type { ReviewPromptState } from "../types/course";

export type ReviewQueueUpdate = {
  queue: string[];
  state: ReviewPromptState;
  cleared: boolean;
};

function uniqueAppend(items: string[], item: string): string[] {
  return items.includes(item) ? items : [...items, item];
}

function removeItem(items: string[], item: string): string[] {
  return items.filter((current) => current !== item);
}

export function updateReviewQueueForAttempt({
  queue,
  previous,
  promptId,
  isCorrect,
  attemptedAt
}: {
  queue: string[];
  previous?: ReviewPromptState;
  promptId: string;
  isCorrect: boolean;
  attemptedAt: string;
}): ReviewQueueUpdate {
  const consecutiveCorrect = isCorrect
    ? (previous?.consecutiveCorrect ?? 0) + 1
    : 0;
  const shouldClear = isCorrect && consecutiveCorrect >= 2;
  const wasQueued = queue.includes(promptId);
  const nextQueue = isCorrect
    ? shouldClear
      ? removeItem(queue, promptId)
      : wasQueued
        ? queue
        : queue
    : uniqueAppend(queue, promptId);

  return {
    queue: nextQueue,
    cleared: wasQueued && shouldClear,
    state: {
      consecutiveCorrect,
      lastResult: isCorrect ? "correct" : "incorrect",
      lastAttemptedAt: attemptedAt
    }
  };
}
