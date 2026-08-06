/**
 * Tests for the pure multi-section arranger model.
 */
import { describe, expect, it } from "vitest";
import {
  addSection,
  createArrangement,
  duplicateSection,
  flattenArrangement,
  moveSection,
  removeSection,
  totalBars
} from "./songArranger";

describe("songArranger", () => {
  it("createArrangement has exactly one Verse section", () => {
    const arr = createArrangement();

    expect(arr.sections).toHaveLength(1);
    expect(arr.sections[0].label).toBe("Verse");
  });

  it("addSection appends a section without mutating the original", () => {
    const arr = createArrangement();
    const next = addSection(arr, "Chorus");

    expect(next.sections).toHaveLength(2);
    expect(next.sections[1].label).toBe("Chorus");
    // Immutability: original untouched.
    expect(arr.sections).toHaveLength(1);
  });

  it("addSection inherits arrangement bpm/key/mode", () => {
    const arr = createArrangement();
    const next = addSection(arr, "Chorus");
    const added = next.sections[1].sketch;

    expect(added.bpm).toBe(arr.bpm);
    expect(added.key).toBe(arr.key);
    expect(added.mode).toBe(arr.mode);
  });

  it("removeSection keeps at least one section", () => {
    const arr = createArrangement();
    const onlyId = arr.sections[0].id;
    const result = removeSection(arr, onlyId);

    expect(result.sections).toHaveLength(1);
  });

  it("removeSection drops a section when more than one exists", () => {
    const arr = addSection(createArrangement(), "Chorus");
    const targetId = arr.sections[1].id;
    const result = removeSection(arr, targetId);

    expect(result.sections).toHaveLength(1);
    expect(result.sections[0].label).toBe("Verse");
  });

  it("moveSection swaps order and clamps at the ends", () => {
    const arr = addSection(createArrangement(), "Chorus");
    const secondId = arr.sections[1].id;
    const firstId = arr.sections[0].id;

    const movedUp = moveSection(arr, secondId, "up");
    expect(movedUp.sections[0].id).toBe(secondId);
    expect(movedUp.sections[1].id).toBe(firstId);

    // Moving the first "up" is a no-op.
    const noop = moveSection(arr, firstId, "up");
    expect(noop.sections[0].id).toBe(firstId);
    expect(noop.sections[1].id).toBe(secondId);
  });

  it("duplicateSection inserts a copy with a new id after the original", () => {
    const arr = createArrangement();
    const originalId = arr.sections[0].id;
    const result = duplicateSection(arr, originalId);

    expect(result.sections).toHaveLength(2);
    expect(result.sections[0].id).toBe(originalId);
    expect(result.sections[1].id).not.toBe(originalId);
    expect(result.sections[1].label).toBe(result.sections[0].label);
  });

  it("flattenArrangement concatenates section musical content in order", () => {
    const arr = addSection(createArrangement(), "Chorus");
    const flat = flattenArrangement(arr);

    expect(flat.form).toHaveLength(16);
    expect(flat.tracks.chords).toHaveLength(16);
    expect(flat.tracks.drums).toHaveLength(16);
    expect(flat.tracks.bass).toHaveLength(16);
    expect(flat.tracks.melody).toHaveLength(16);
    expect(flat.tracks.voiceGuide).toHaveLength(16);
    expect(flat.id).toBe(`flattened-${arr.id}`);
    expect(flat.title).toBe(arr.title);
    expect(flat.mutedTracks).toEqual([]);
    expect(flat.soloTracks).toEqual([]);
  });

  it("totalBars sums each section's form length", () => {
    const arr = addSection(createArrangement(), "Chorus");

    expect(totalBars(arr)).toBe(16);
  });

  it("duplicateSection deep-copies the take so edits stay independent", () => {
    const base = createArrangement();
    const arr = {
      ...base,
      sections: [
        {
          ...base.sections[0],
          sketch: {
            ...base.sections[0].sketch,
            capturedMelody: [{ note: "C4", startBeat: 0, durationBeats: 1 }]
          }
        }
      ]
    };

    const result = duplicateSection(arr, arr.sections[0].id);
    const original = result.sections[0].sketch.capturedMelody;
    const copy = result.sections[1].sketch.capturedMelody;

    expect(copy).toEqual(original);
    expect(copy?.[0]).not.toBe(original?.[0]);
  });

  it("flattenArrangement keeps section takes and offsets them by bar position", () => {
    const base = addSection(createArrangement(), "Chorus");
    const arr = {
      ...base,
      sections: base.sections.map((section, index) => ({
        ...section,
        sketch: {
          ...section.sketch,
          capturedMelody: [
            { note: index === 0 ? "C4" : "G4", startBeat: 1.5, durationBeats: 0.5 }
          ]
        }
      }))
    };

    const take = flattenArrangement(arr).capturedMelody;

    expect(take).toHaveLength(2);
    // Section 1 keeps its original offset.
    expect(take?.[0]).toMatchObject({ note: "C4", startBeat: 1.5 });
    // Section 2 starts 8 bars * 4 beats later, so 32 + 1.5.
    expect(take?.[1]).toMatchObject({ note: "G4", startBeat: 33.5 });
  });

  it("flattenArrangement omits the take when no section recorded one", () => {
    const flat = flattenArrangement(addSection(createArrangement(), "Chorus"));

    expect(flat.capturedMelody).toBeUndefined();
  });

  it("flattenArrangement offsets takes using the arrangement meter", () => {
    const base = createArrangement();
    const arr = {
      ...base,
      meter: "3/4",
      sections: [
        base.sections[0],
        {
          ...base.sections[0],
          id: "second",
          sketch: {
            ...base.sections[0].sketch,
            capturedMelody: [{ note: "E4", startBeat: 0, durationBeats: 1 }]
          }
        }
      ]
    };

    // 8 bars of 3/4 = 24 beats before the second section begins.
    expect(flattenArrangement(arr).capturedMelody?.[0].startBeat).toBe(24);
  });
});
