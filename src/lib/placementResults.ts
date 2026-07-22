import { skillIdForTargets } from "./skills";
import type { SkillId } from "./skills";
import { generatePlacementPrompts } from "./placement";
import type { PracticePrompt } from "./practiceEngine";
import type { ProgressState } from "../types/course";

export type PlacementResult = { startHere: SkillId; keepWarm: SkillId };

export function clearPlacementProgress(progress: ProgressState): ProgressState {
  const placementIds = new Set(generatePlacementPrompts().map((prompt) => prompt.id));
  const withoutPlacementIds = <T,>(entries: Record<string, T>) =>
    Object.fromEntries(
      Object.entries(entries).filter(([promptId]) => !placementIds.has(promptId))
    );
  const withoutPlacementQueue = <T extends { reviewQueue: string[] }>(entries: Record<string, T>) =>
    Object.fromEntries(
      Object.entries(entries).map(([id, mastery]) => [
        id,
        {
          ...mastery,
          reviewQueue: mastery.reviewQueue.filter((promptId) => !placementIds.has(promptId))
        }
      ])
    );

  return {
    ...progress,
    placementResults: {},
    practiceResults: withoutPlacementIds(progress.practiceResults),
    reviewPromptState: withoutPlacementIds(progress.reviewPromptState),
    reviewPrompts: withoutPlacementIds(progress.reviewPrompts),
    practiceAttempts: progress.practiceAttempts?.filter(
      (attempt) => !placementIds.has(attempt.promptId)
    ),
    practiceMastery: withoutPlacementQueue(progress.practiceMastery),
    skillMastery: withoutPlacementQueue(progress.skillMastery)
  };
}

export function placementResult(
  prompts: PracticePrompt[],
  attempts: Record<string, { correct: number; attempted: number }>
): PlacementResult | undefined {
  if (prompts.length !== 8 || prompts.some((prompt) => !attempts[prompt.id]?.attempted)) {
    return undefined;
  }

  const ordered = prompts
    .map((prompt, index) => ({
      skillId: skillIdForTargets(prompt.skillTargets) ?? "note-reading",
      correct: attempts[prompt.id].correct / attempts[prompt.id].attempted,
      index
    }))
    .sort((left, right) => left.correct - right.correct || left.index - right.index);

  return { startHere: ordered[0].skillId, keepWarm: ordered[ordered.length - 1].skillId };
}

export function placementResultFromProgress(
  attempts: Record<string, { correct: number; attempted: number }>
): PlacementResult | undefined {
  return placementResult(generatePlacementPrompts(), attempts);
}
