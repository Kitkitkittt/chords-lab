import type { ProgressState, SkillMastery } from "../types/course";
import { getDueSkillIds } from "./adaptiveReview";
import { skillIdForTargets, skillMetas, skillsById } from "./skills";
import type { SkillId } from "./skills";

export type SessionReason = "due" | "weak" | "new";

export type SessionSlot = {
  skillId: SkillId;
  moduleId: string;
  reason: SessionReason;
};

export type SmartSessionPlan = {
  slots: SessionSlot[];
  summary: string;
};

const DEFAULT_SIZE = 5;
const WEAK_MIN_ATTEMPTS = 3;

function canonicalSkillId(value: string): SkillId | undefined {
  return skillsById.has(value as SkillId)
    ? (value as SkillId)
    : skillIdForTargets([value]);
}

export function canonicalSkillMastery(
  skillMastery: ProgressState["skillMastery"]
): Record<SkillId, SkillMastery> {
  const result = {} as Record<SkillId, SkillMastery>;

  for (const [token, mastery] of Object.entries(skillMastery)) {
    const skillId = canonicalSkillId(token);

    if (!skillId) {
      continue;
    }

    const current = result[skillId];
    result[skillId] = current
      ? {
          ...current,
          correct: current.correct + mastery.correct,
          attempted: current.attempted + mastery.attempted,
          lapses: current.lapses + mastery.lapses,
          reviewQueue: Array.from(new Set([...current.reviewQueue, ...mastery.reviewQueue])),
          dueAt:
            !current.dueAt || (mastery.dueAt && mastery.dueAt < current.dueAt)
              ? mastery.dueAt
              : current.dueAt,
          lastPracticedAt:
            !current.lastPracticedAt ||
            (mastery.lastPracticedAt && mastery.lastPracticedAt > current.lastPracticedAt)
              ? mastery.lastPracticedAt
              : current.lastPracticedAt
        }
      : { ...mastery, reviewQueue: [...mastery.reviewQueue] };
  }

  return result;
}

export function smartSessionSnapshot(progress: ProgressState): string {
  return JSON.stringify(
    Object.entries(canonicalSkillMastery(progress.skillMastery))
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([skillId, mastery]) => [
        skillId,
        mastery.correct,
        mastery.attempted,
        mastery.dueAt ?? "",
        mastery.lastPracticedAt ?? "",
        mastery.reviewQueue.slice().sort()
      ])
  );
}

function toSlot(skillId: SkillId, reason: SessionReason): SessionSlot {
  return { skillId, moduleId: skillsById.get(skillId)?.moduleId ?? "", reason };
}

function accuracy(mastery: SkillMastery): number {
  return mastery.attempted > 0 ? mastery.correct / mastery.attempted : 0;
}

function newCandidates(skillMastery: Record<SkillId, SkillMastery>): SkillId[] {
  return skillMetas
    .filter((skill) => !skillMastery[skill.id] || skillMastery[skill.id].attempted === 0)
    .slice()
    .sort((left, right) => left.prerequisites.length - right.prerequisites.length)
    .map((skill) => skill.id);
}

function weakCandidates(skillMastery: Record<SkillId, SkillMastery>): SkillId[] {
  const order = new Map(skillMetas.map((skill, index) => [skill.id, index]));

  return Object.entries(skillMastery)
    .filter(([, mastery]) => mastery.attempted >= WEAK_MIN_ATTEMPTS)
    .sort(([leftId, left], [rightId, right]) =>
      accuracy(left) - accuracy(right) ||
      right.attempted - left.attempted ||
      (order.get(leftId as SkillId) ?? 0) - (order.get(rightId as SkillId) ?? 0)
    )
    .map(([id]) => id as SkillId);
}

export function describePlan(plan: SmartSessionPlan): string {
  const counts = { due: 0, weak: 0, new: 0 };
  plan.slots.forEach((slot) => {
    counts[slot.reason] += 1;
  });
  const total = plan.slots.length;

  return `${total} ${total === 1 ? "prompt" : "prompts"}: ${counts.due} review, ${counts.weak} focus, ${counts.new} new.`;
}

export function planSmartSession(
  progress: ProgressState,
  size = DEFAULT_SIZE,
  now = new Date()
): SmartSessionPlan {
  const slots: SessionSlot[] = [];
  const targetSize = Math.min(5, Math.max(0, Math.floor(size) || 0));

  if (targetSize === 0) {
    return { slots, summary: describePlan({ slots, summary: "" }) };
  }

  const mastery = canonicalSkillMastery(progress.skillMastery);
  const queues: Array<[SessionReason, SkillId[]]> = [
    ["due", getDueSkillIds(mastery, now).filter((id): id is SkillId => skillsById.has(id as SkillId))],
    ["weak", weakCandidates(mastery)],
    ["new", newCandidates(mastery)]
  ];
  const chosen = new Set<SkillId>();

  while (slots.length < targetSize) {
    let added = false;
    for (const [reason, queue] of queues) {
      const skillId = queue.find((id) => !chosen.has(id));
      if (!skillId || slots.length >= targetSize) {
        continue;
      }
      chosen.add(skillId);
      slots.push(toSlot(skillId, reason));
      added = true;
    }
    if (!added) {
      break;
    }
  }

  return { slots, summary: describePlan({ slots, summary: "" }) };
}
