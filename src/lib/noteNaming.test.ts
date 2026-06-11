/**
 * Tests for the alternate note-naming display module.
 */
import { describe, expect, it } from "vitest";
import {
  describePitchClasses,
  noteNamingLabel,
  NOTE_NAMING_SYSTEMS,
  toNamingSystem
} from "./noteNaming";

describe("toNamingSystem", () => {
  it("english is identity (octave preserved)", () => {
    expect(toNamingSystem("C4", "english")).toBe("C4");
  });

  it("fixed-do maps letters to solfège", () => {
    expect(toNamingSystem("C", "fixed-do")).toBe("Do");
    expect(toNamingSystem("G", "fixed-do")).toBe("Sol");
  });

  it("fixed-do preserves accidental and octave", () => {
    expect(toNamingSystem("C#4", "fixed-do")).toBe("Do#4");
  });

  it("german writes B natural as H and Bb as B", () => {
    expect(toNamingSystem("B", "german")).toBe("H");
    expect(toNamingSystem("Bb", "german")).toBe("B");
    expect(toNamingSystem("B4", "german")).toBe("H4");
  });

  it("german leaves other notes unchanged", () => {
    expect(toNamingSystem("C", "german")).toBe("C");
  });

  it("passes invalid input through unchanged", () => {
    expect(toNamingSystem("not-a-note", "fixed-do")).toBe("not-a-note");
  });
});

describe("naming-system metadata", () => {
  it("exposes three systems", () => {
    expect(NOTE_NAMING_SYSTEMS).toHaveLength(3);
  });

  it("provides a German label containing H", () => {
    const label = noteNamingLabel("german");
    expect(label.length).toBeGreaterThan(0);
    expect(label).toContain("H");
  });
});

describe("describePitchClasses", () => {
  it("joins converted pitch classes with spaces", () => {
    expect(describePitchClasses(["C", "E", "G"], "fixed-do")).toBe("Do Mi Sol");
  });
});
