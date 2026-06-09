import { describe, expect, it } from "vitest";
import { lessons } from "./course";
import {
  lessonLinkFor,
  lessonLinks,
  reviewModulesForCompletedLessons
} from "./lessonLinks";
import { practiceModules } from "./practice";

const validModuleIds = new Set(practiceModules.map((module) => module.id));

describe("lesson links", () => {
  it("maps every lesson to a valid checkpoint module and practice route", () => {
    for (const lesson of lessons) {
      const link = lessonLinkFor(lesson.slug);
      expect(validModuleIds.has(link.checkpointModule)).toBe(true);
      expect(link.practiceRoute.startsWith("/")).toBe(true);

      for (const moduleId of link.reviewModules) {
        expect(validModuleIds.has(moduleId)).toBe(true);
      }
    }
  });

  it("has a link entry for every lesson (no drift)", () => {
    for (const lesson of lessons) {
      expect(lessonLinks[lesson.slug]).toBeDefined();
    }
  });

  it("derives review modules from completed lessons", () => {
    expect(reviewModulesForCompletedLessons(["triads"])).toEqual(
      expect.arrayContaining(["intervals", "chords"])
    );
    expect(reviewModulesForCompletedLessons([])).toEqual([]);
  });
});
