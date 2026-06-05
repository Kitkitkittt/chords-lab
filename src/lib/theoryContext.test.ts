import { describe, expect, it } from "vitest";
import { theoryContextForChord } from "./theoryContext";

describe("theory context", () => {
  it("returns safe melody notes for common tonic harmony", () => {
    const context = theoryContextForChord({ key: "C", chord: "I" });

    expect(context.chord).toBe("C");
    expect(context.chordTones).toEqual(["C", "E", "G"]);
    expect(context.safeMelodyNotes).toEqual(["C", "E", "G", "D", "F", "A", "B"]);
  });

  it("maps dominant seventh in C to chord tones inside the key context", () => {
    const context = theoryContextForChord({ key: "C", chord: "V7" });

    expect(context.chord).toBe("G7");
    expect(context.chordTones).toEqual(["G", "B", "D", "F"]);
    expect(context.scaleNotes).toContain("C");
  });
});
