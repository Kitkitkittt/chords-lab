import { describe, expect, it } from "vitest";
import {
  createRoutine,
  defaultRoutines,
  describeRoutine,
  routeForStep,
  validateRoutine
} from "./routines";

describe("defaultRoutines", () => {
  it("returns at least two routines, each with at least one step", () => {
    const routines = defaultRoutines();

    expect(routines.length).toBeGreaterThanOrEqual(2);

    for (const routine of routines) {
      expect(routine.steps.length).toBeGreaterThanOrEqual(1);
    }
  });
});

describe("describeRoutine", () => {
  it("includes the step count", () => {
    const routine = createRoutine("Test", [
      { kind: "review", label: "Review" },
      { kind: "module", moduleId: "chords", label: "Chords" },
      { kind: "play", label: "Play" }
    ]);

    expect(describeRoutine(routine)).toContain("3 steps");
  });
});

describe("routeForStep", () => {
  it("maps a module step to its practice route", () => {
    expect(
      routeForStep({ kind: "module", moduleId: "chords", label: "x" })
    ).toBe("/practice/chords");
  });

  it("maps a review step to the review route", () => {
    expect(routeForStep({ kind: "review", label: "x" })).toBe("/review");
  });

  it("maps play to the play route", () => {
    expect(routeForStep({ kind: "play", label: "x" })).toBe("/play");
  });

  it("falls back to /practice when a module step lacks a moduleId", () => {
    expect(routeForStep({ kind: "module", label: "x" })).toBe("/practice");
  });
});

describe("validateRoutine", () => {
  it("accepts a created routine", () => {
    const routine = createRoutine("Test", [
      { kind: "review", label: "Review" }
    ]);

    expect(validateRoutine(routine)).toBe(true);
  });

  it("rejects an empty object", () => {
    expect(validateRoutine({})).toBe(false);
  });

  it("rejects a routine with a bad step kind", () => {
    const bad = {
      id: "routine-1",
      name: "Bad",
      createdAt: "2026-06-11T00:00:00.000Z",
      steps: [{ kind: "sprint", label: "Nope" }]
    };

    expect(validateRoutine(bad)).toBe(false);
  });
});
