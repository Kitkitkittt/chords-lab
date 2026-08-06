import { describe, expect, it } from "vitest";
import {
  CURRENT_SCHEMA_VERSION,
  migrateProgressState
} from "./progressMigrations";
import { defaultProgressState, normalizeProgressState } from "./progressStorage";

describe("progress schema migrations", () => {
  it("treats a missing schemaVersion as the pre-versioning shape and keeps the data", () => {
    const legacy = {
      completedLessonSlugs: ["intervals", "major-scale"],
      bookmarkedLessonSlugs: ["circle-of-fifths"],
      lastLessonSlug: "intervals"
    };

    const migrated = migrateProgressState(legacy);

    expect(migrated.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(migrated.completedLessonSlugs).toEqual([
      "intervals",
      "major-scale"
    ]);
    expect(migrated.bookmarkedLessonSlugs).toEqual(["circle-of-fifths"]);
  });

  it("does not discard hard-won progress when it lacks a version stamp", () => {
    const legacy = { completedLessonSlugs: ["intervals"] };

    // The old equality gate wiped this to defaults.
    expect(normalizeProgressState(legacy).completedLessonSlugs).toEqual([
      "intervals"
    ]);
  });

  it("passes current-version state through untouched", () => {
    const current = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      completedLessonSlugs: ["intervals"]
    };

    const migrated = migrateProgressState(current);

    expect(migrated.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(migrated.completedLessonSlugs).toEqual(["intervals"]);
  });

  it("refuses to downgrade state written by a newer build", () => {
    const fromFuture = {
      schemaVersion: CURRENT_SCHEMA_VERSION + 5,
      completedLessonSlugs: ["intervals"]
    };

    // Unknown future fields cannot be safely reasoned about, so fall back
    // rather than silently corrupting them.
    expect(migrateProgressState(fromFuture).schemaVersion).toBe(
      CURRENT_SCHEMA_VERSION
    );
    expect(normalizeProgressState(fromFuture)).toEqual(defaultProgressState);
  });

  it("still rejects values that are not objects at all", () => {
    expect(normalizeProgressState(null)).toEqual(defaultProgressState);
    expect(normalizeProgressState("nope")).toEqual(defaultProgressState);
    expect(normalizeProgressState(42)).toEqual(defaultProgressState);
  });

  it("runs every migration step in order when several versions behind", () => {
    const migrated = migrateProgressState({ schemaVersion: 1 });

    expect(migrated.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  });
});
