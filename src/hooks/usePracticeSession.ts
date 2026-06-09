import { useEffect, useMemo, useState } from "react";
import {
  idlePracticeFeedback,
  scorePracticeAnswer
} from "../lib/practiceEngine";
import type { PracticeFeedback, PracticePrompt } from "../lib/practiceEngine";

type UsePracticeSessionOptions = {
  prompts: PracticePrompt[];
  onAttempt: (
    promptId: string,
    moduleId: string,
    isCorrect: boolean,
    skillTargets?: string[]
  ) => void;
};

export function usePracticeSession({
  prompts,
  onAttempt
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

  const prompt = prompts[promptIndex] ?? prompts[0];

  useEffect(() => {
    setPromptIndex(0);
    setSelected([]);
    setFeedback(idlePracticeFeedback);
    setAttempts({});
    setStreak(0);
    setBestStreak(0);
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
      prompt.skillTargets
    );
  }

  function next() {
    if (prompts.length === 0) {
      return;
    }

    setPromptIndex((current) => (current + 1) % prompts.length);
    setSelected([]);
    setFeedback(idlePracticeFeedback);
  }

  function retry() {
    setSelected([]);
    setFeedback(idlePracticeFeedback);
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
      prompts.length > 0 &&
      Object.keys(attempts).length >= prompts.length &&
      isAnswered,
    sessionResult: {
      correct: Object.values(attempts).filter((attempt) => attempt.correct)
        .length,
      attempted: Object.keys(attempts).length,
      missedPromptIds: Object.entries(attempts)
        .filter(([, attempt]) => !attempt.correct)
        .map(([promptId]) => promptId),
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
    retry
  };
}
