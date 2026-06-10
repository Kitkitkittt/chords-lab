import { describe, expect, it } from "vitest";
import { courseModules, lessons, lessonsBySlug, modulesBySlug } from "./course";

describe("course metadata", () => {
  it("has valid module and lesson references", () => {
    expect(lessons.length).toBe(26);

    for (const module of courseModules) {
      expect(module.lessonSlugs.length).toBeGreaterThan(0);
      for (const slug of module.lessonSlugs) {
        const lesson = lessonsBySlug.get(slug);
        expect(lesson, `${slug} should exist`).toBeDefined();
        expect(lesson?.moduleSlug).toBe(module.slug);
      }
    }

    for (const lesson of lessons) {
      expect(modulesBySlug.has(lesson.moduleSlug)).toBe(true);
      expect(["beginner", "intermediate"]).toContain(lesson.level);
      expect(lesson.estimatedMinutes).toBeGreaterThan(0);
      expect(lesson.outcomes.length).toBeGreaterThan(0);
    }
  });

  it("keeps lesson citations visible and traceable", () => {
    for (const lesson of lessons) {
      expect(lesson.citations.length, lesson.slug).toBeGreaterThan(0);

      for (const citation of lesson.citations) {
        expect(citation.label).toBeTruthy();
        expect(citation.url).toMatch(/^https:\/\//);
        expect(citation.licenseNote).toBeTruthy();
      }
    }
  });

  it("only references existing prerequisites", () => {
    for (const lesson of lessons) {
      for (const prerequisite of lesson.prerequisites) {
        expect(
          lessonsBySlug.has(prerequisite),
          `${lesson.slug} references ${prerequisite}`
        ).toBe(true);
      }
    }
  });
});
