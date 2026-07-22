/**
 * Calm, user-defined practice routines (Phase 5: calm motivation).
 *
 * A routine is an ordered list of gentle steps (review, a module, or free play).
 * There are no streaks, no loss states, and no penalties — routines are simply
 * a way to sequence a short practice. This module is pure: no React, no storage,
 * no DOM. It models routines and maps their steps to app routes.
 */

const STEP_KINDS = ["review", "module", "play"] as const;
export const MAX_ROUTINE_STEPS = 3;

export type RoutineStepKind = (typeof STEP_KINDS)[number];

export type RoutineStep = {
  kind: RoutineStepKind;
  moduleId?: string;
  label: string;
};

export type Routine = {
  id: string;
  name: string;
  steps: RoutineStep[];
  createdAt: string;
};

/** Create a routine with a generated id and ISO timestamp. */
export function createRoutine(name: string, steps: RoutineStep[]): Routine {
  const ts = Date.now();
  const cleanSteps = steps.slice(0, MAX_ROUTINE_STEPS);
  const rand = Math.random().toString(36).slice(2, 8);

  return {
    id: `routine-${ts}-${rand}`,
    name: name.trim().slice(0, 60) || "Routine",
    steps: cleanSteps,
    createdAt: new Date(ts).toISOString()
  };
}

/** Two or three sensible preset routines with deterministic step content. */
export function defaultRoutines(): Routine[] {
  return [
    createRoutine("Morning warm-up", [
      { kind: "review", label: "Quick review" },
      { kind: "module", moduleId: "chords", label: "Chords" },
      { kind: "play", label: "Free play" }
    ]),
    createRoutine("Ear focus", [
      { kind: "module", moduleId: "ear", label: "Ear training" },
      { kind: "module", moduleId: "ear", label: "Ear training" },
      { kind: "play", label: "Free play" }
    ]),
    createRoutine("Reading reset", [
      { kind: "review", label: "Quick review" },
      { kind: "module", moduleId: "pitch", label: "Note reading" }
    ])
  ];
}

/** A short, plain description, e.g. "3 steps: review, chords, play.". */
export function describeRoutine(routine: Routine): string {
  const count = routine.steps.length;
  const stepWord = count === 1 ? "step" : "steps";
  const parts = routine.steps.map((step) =>
    step.kind === "module" ? step.moduleId ?? "module" : step.kind
  );

  return `${count} ${stepWord}: ${parts.join(", ")}.`;
}

/** Map a routine step to an app route. */
export function routeForStep(step: RoutineStep): string {
  switch (step.kind) {
    case "review":
      return "/review";
    case "play":
      return "/play";
    case "module":
      return step.moduleId ? `/practice/${step.moduleId}` : "/practice";
    default:
      return "/practice";
  }
}

function isRoutineStep(value: unknown): value is RoutineStep {
  if (!value || typeof value !== "object") {
    return false;
  }

  const step = value as Record<string, unknown>;

  if (typeof step.label !== "string") {
    return false;
  }

  if (!STEP_KINDS.includes(step.kind as RoutineStepKind)) {
    return false;
  }

  if (step.moduleId !== undefined && typeof step.moduleId !== "string") {
    return false;
  }

  return true;
}

/** Runtime shape guard for an unknown value. */
export function validateRoutine(routine: unknown): routine is Routine {
  if (!routine || typeof routine !== "object") {
    return false;
  }

  const candidate = routine as Record<string, unknown>;

  return (
    typeof candidate.id === "string" &&
    typeof candidate.name === "string" &&
    typeof candidate.createdAt === "string" &&
    Array.isArray(candidate.steps) &&
    candidate.steps.length > 0 &&
    candidate.steps.length <= MAX_ROUTINE_STEPS &&
    candidate.steps.every(isRoutineStep)
  );
}
