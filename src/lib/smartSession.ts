/**
 * Smart Session planner for Chords Lab.
 *
 * Composes a balanced practice plan from local progress by blending three kinds
 * of work: due-review skills (spaced repetition), weak skills (low accuracy),
 * and new material (never attempted). The planner is pure: it reads only the
 * skill graph, the adaptive-review helper, and the progress snapshot. No React,
 * no storage, no DOM.
 *
 * Target mix is ~60% due, ~25% weak, ~15% new, but the planner gracefully fills
 * from whatever is available so the plan always reaches `min(size, universe)`
 * slots when any skill exists. Ordering is deterministic (stable sorts, no
 * randomness) so the same progress always yields the same plan.
 */

import type { ProgressState, SkillMastery } from "../types/course";
import { getDueSkillIds } from "./adaptiveReview";
import { skillMetas, skillsById } from "./skills";
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

const DEFAULT_SIZE = 10;
const DUE_RATIO = 0.6;
const WEAK_RATIO = 0.25;
const NEW_RATIO = 0.15;
const WEAK_MIN_ATTEMPTS = 3;

function isSkillId(value: string): value is SkillId {
  return skillsById.has(value as SkillId);
}

function toSlot(skillId: SkillId, reason: SessionReason): SessionSlot {
  const meta = skillsById.get(skillId);

  return {
    skillId,
    moduleId: meta ? meta.moduleId : "",
    reason
  };
}

function accuracy(mastery: SkillMastery): number {
  return mastery.attempted > 0 ? mastery.correct / mastery.attempted : 0;
}

/**
 * Skills with no mastery entry or zero attempts, ordered so foundational skills
 * (no prerequisites) come first, then by their stable position in the graph.
 */
function newCandidates(
  skillMastery: ProgressState["skillMastery"]
): SkillId[] {
  return skillMetas
    .filter((skill) => {
      const mastery = skillMastery[skill.id];

      return !mastery || mastery.attempted === 0;
    })
    .slice()
    .sort((left, right) => left.prerequisites.length - right.prerequisites.length)
    .map((skill) => skill.id);
}

/**
 * Skills practiced at least `WEAK_MIN_ATTEMPTS` times, ordered by ascending
 * accuracy (weakest first), tie-broken by more attempts then stable id order.
 */
function weakCandidates(
  skillMastery: ProgressState["skillMastery"]
): SkillId[] {
  const order = new Map(skillMetas.map((skill, index) => [skill.id, index]));

  return Object.entries(skillMastery)
    .filter(([id, mastery]) => isSkillId(id) && mastery.attempted >= WEAK_MIN_ATTEMPTS)
    .sort(([leftId, left], [rightId, right]) => {
      const byAccuracy = accuracy(left) - accuracy(right);

      if (byAccuracy !== 0) {
        return byAccuracy;
      }

      const byAttempts = right.attempted - left.attempted;

      if (byAttempts !== 0) {
        return byAttempts;
      }

      return (order.get(leftId as SkillId) ?? 0) - (order.get(rightId as SkillId) ?? 0);
    })
    .map(([id]) => id as SkillId);
}

/** Due skills from the adaptive scheduler that exist in the skill graph. */
function dueCandidates(
  skillMastery: ProgressState["skillMastery"],
  now: Date
): SkillId[] {
  return getDueSkillIds(skillMastery, now).filter(isSkillId);
}

/**
 * Human-readable one-line summary of a plan, counting slots by reason.
 * Example: "10 prompts: 6 review, 2 focus, 2 new."
 */
export function describePlan(plan: SmartSessionPlan): string {
  let due = 0;
  let weak = 0;
  let fresh = 0;

  for (const slot of plan.slots) {
    if (slot.reason === "due") {
      due += 1;
    } else if (slot.reason === "weak") {
      weak += 1;
    } else {
      fresh += 1;
    }
  }

  const total = plan.slots.length;
  const noun = total === 1 ? "prompt" : "prompts";

  return `${total} ${noun}: ${due} review, ${weak} focus, ${fresh} new.`;
}

/**
 * Compose a balanced practice plan from local progress.
 *
 * @param progress current progress snapshot
 * @param size     target number of slots (default 10)
 * @param now      reference time for due calculation (default current time)
 */
export function planSmartSession(
  progress: ProgressState,
  size: number = DEFAULT_SIZE,
  now: Date = new Date()
): SmartSessionPlan {
  const slots: SessionSlot[] = [];

  if (size <= 0) {
    return { slots, summary: describePlan({ slots, summary: "" }) };
  }

  const skillMastery = progress.skillMastery ?? {};
  const chosen = new Set<SkillId>();

  const due = dueCandidates(skillMastery, now);
  const weak = weakCandidates(skillMastery).filter((id) => !chosen.has(id));

  const dueQueue = due.filter((id) => {
    if (chosen.has(id)) {
      return false;
    }

    chosen.add(id);

    return true;
  });

  const weakQueue = weak.filter((id) => {
    if (chosen.has(id)) {
      return false;
    }

    chosen.add(id);

    return true;
  });

  const newQueue = newCandidates(skillMastery).filter((id) => {
    if (chosen.has(id)) {
      return false;
    }

    chosen.add(id);

    return true;
  });

  // Reset selection so target-ratio fill controls how many of each reason land
  // in the plan; the queues above are already deduplicated and ordered.
  chosen.clear();

  const targets: Array<{ reason: SessionReason; queue: SkillId[]; cap: number }> = [
    { reason: "due", queue: dueQueue, cap: Math.round(size * DUE_RATIO) },
    { reason: "weak", queue: weakQueue, cap: Math.round(size * WEAK_RATIO) },
    { reason: "new", queue: newQueue, cap: Math.round(size * NEW_RATIO) }
  ];

  // First pass: take up to each reason's fair-share cap.
  for (const target of targets) {
    let taken = 0;

    for (const id of target.queue) {
      if (slots.length >= size || taken >= target.cap) {
        break;
      }

      if (chosen.has(id)) {
        continue;
      }

      chosen.add(id);
      slots.push(toSlot(id, target.reason));
      taken += 1;
    }
  }

  // Second pass: round-robin fill from leftover candidates of any reason so the
  // plan reaches `size` when material exists.
  let progressed = true;

  while (slots.length < size && progressed) {
    progressed = false;

    for (const target of targets) {
      if (slots.length >= size) {
        break;
      }

      const next = target.queue.find((id) => !chosen.has(id));

      if (next) {
        chosen.add(next);
        slots.push(toSlot(next, target.reason));
        progressed = true;
      }
    }
  }

  return { slots, summary: describePlan({ slots, summary: "" }) };
}
