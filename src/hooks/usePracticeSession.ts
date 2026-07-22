import { useEffect, useMemo, useState } from "react";
import {
  idlePracticeFeedback,
  scorePracticeAnswer
} from "../lib/practiceEngine";
import type { PracticeFeedback, PracticePrompt } from "../lib/practiceEngine";
import type { PracticeAttempt } from "../types/course";

type UsePracticeSessionOptions = {
  prompts: PracticePrompt[];
  onAttempt: (
    promptId: string,
    moduleId: string,
    isCorrect: boolean,
    skillTargets?: string[],
    detail?: Pick<PracticeAttempt, "expected" | "selected" | "question">,
    prompt?: PracticePrompt
  ) => void;
  onSkip?: (promptId: string, moduleId: string, prompt?: PracticePrompt) => void;
};

export function usePracticeSession({
  prompts,
  onAttempt,
  onSkip
}: UsePracticeSessionOptions) {
  const [promptIndex, setPromptIndex] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [feedback, setFeedback] =
    useState<PracticeFeedback>(idlePracticeFeedback);
  const [attempts, setAttempts] = useState<
    Record<string, { correct: boolean; selected: string[] }>
  >({});
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [skippedPromptIds, setSkippedPromptIds] = useState<string[]>([]);
  const [ended, setEnded] = useState(false);

  const prompt = prompts[promptIndex] ?? prompts[0];

  useEffect(() => {
    setPromptIndex(0);
    setSelected([]);
    setFeedback(idlePracticeFeedback);
    setAttempts({});
    setStreak(0);
    setBestStreak(0);
    setSkippedPromptIds([]);
    setEnded(false);
  }, [prompts]);

  const isAnswered = feedback.status !== "idle";

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  function choose(value: string) {
    if (!prompt || isAnswered) {
      return;
    }

    if (prompt.kind === "single" || prompt.kind === "listening") {
      setSelected([value]);
      return;
    }

    if (prompt.kind === "ordered" || prompt.kind === "grid") {
      setSelected((current) => {
        if (prompt.answer.length > 0 && current.length >= prompt.answer.length) {
          return [value];
        }

        return [...current, value];
      });
      return;
    }

    setSelected((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value]
    );
  }

  function replaceSelected(index: number, value: string) {
    if (!prompt || isAnswered) {
      return;
    }

    setSelected((current) => {
      const next = [...current];
      next[index] = value;
      return next.slice(0, prompt.answer.length || next.length);
    });
  }

  function removeSelectedAt(index: number) {
    if (isAnswered) {
      return;
    }

    setSelected((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  function undoSelected() {
    if (isAnswered) {
      return;
    }

    setSelected((current) => current.slice(0, -1));
  }

  function clearSelected() {
    if (isAnswered) {
      return;
    }

    setSelected([]);
  }

  function submit() {
    if (!prompt || selected.length === 0 || isAnswered) {
      return;
    }

    const result = scorePracticeAnswer(prompt, selected);
    const isCorrect = result.status === "correct";
    setFeedback(result);
    setAttempts((current) => ({
      ...current,
      [prompt.id]: {
        correct: isCorrect,
        selected
      }
    }));
    setStreak((current) => {
      const next = isCorrect ? current + 1 : 0;
      setBestStreak((best) => Math.max(best, next));
      return next;
    });
    onAttempt(
      prompt.id,
      prompt.moduleId,
      result.status === "correct",
      prompt.skillTargets,
      {
        expected: result.expected,
        selected: result.selected,
        question: prompt.question
      },
      prompt
    );
  }

  function next() {
    if (prompts.length === 0) {
      return;
    }

    const handled = new Set([...Object.keys(attempts), ...skippedPromptIds]);
    setPromptIndex((current) => {
      for (let offset = 1; offset <= prompts.length; offset += 1) {
        const index = (current + offset) % prompts.length;
        if (!handled.has(prompts[index].id)) {
          return index;
        }
      }
      return current;
    });
    setSelected([]);
    setFeedback(idlePracticeFeedback);
  }

  function retry() {
    setSelected([]);
    setFeedback(idlePracticeFeedback);
  }

  function skip() {
    if (!prompt || isAnswered) {
      return;
    }

    const skipped = skippedPromptIds.includes(prompt.id)
      ? skippedPromptIds
      : [...skippedPromptIds, prompt.id];
    if (!skippedPromptIds.includes(prompt.id)) {
      onSkip?.(prompt.id, prompt.moduleId, prompt);
    }
    const handled = new Set([...Object.keys(attempts), ...skipped]);
    setSkippedPromptIds(skipped);
    setPromptIndex((current) => {
      for (let offset = 1; offset <= prompts.length; offset += 1) {
        const index = (current + offset) % prompts.length;
        if (!handled.has(prompts[index].id)) {
          return index;
        }
      }
      return current;
    });
    setSelected([]);
    setFeedback(idlePracticeFeedback);
  }

  function end() {
    setEnded(true);
  }

  return {
    prompt,
    selected,
    selectedSet,
    feedback,
    attempts,
    isAnswered,
    liveStats: {
      promptNumber: Math.min(promptIndex + 1, prompts.length),
      total: prompts.length,
      answered: Object.keys(attempts).length,
      correct: Object.values(attempts).filter((attempt) => attempt.correct)
        .length,
      streak,
      bestStreak
    },
    isSessionComplete:
      ended ||
      (prompts.length > 0 &&
        Object.keys(attempts).length + skippedPromptIds.length >= prompts.length),
    sessionResult: {
      correct: Object.values(attempts).filter((attempt) => attempt.correct)
        .length,
      attempted: Object.keys(attempts).length,
      skippedPromptIds,
      missedPromptIds: [
        ...Object.entries(attempts)
          .filter(([, attempt]) => !attempt.correct)
          .map(([promptId]) => promptId),
        ...skippedPromptIds
      ],
      skillDeltas: prompts.reduce<Record<string, number>>((deltas, item) => {
        const attempt = attempts[item.id];

        if (!attempt) {
          return deltas;
        }

        return (item.skillTargets ?? []).reduce(
          (current, skill) => ({
            ...current,
            [skill]: (current[skill] ?? 0) + (attempt.correct ? 1 : -1)
          }),
          deltas
        );
      }, {})
    },
    canSubmit: Boolean(prompt && selected.length > 0 && !isAnswered),
    choose,
    replaceSelected,
    removeSelectedAt,
    undoSelected,
    clearSelected,
    submit,
    next,
    retry,
    skip,
    end
  };
}
