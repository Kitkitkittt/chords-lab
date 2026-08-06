/**
 * Guards against a recurring defect: several pipelines rebuild a Song Sketch by
 * listing its fields one at a time instead of spreading the source. An optional
 * field nobody added to that list is silently dropped, and because the field is
 * optional the result still typechecks. `capturedMelody` — the take recorded in
 * the Jam Room — was lost this way and fixed four separate times.
 *
 * These checks read the fixture's own keys at runtime, so a newly added optional
 * field is covered the moment it appears in the fixture, with no test edit.
 *
 * Verified by adding a throwaway optional field and confirming it failed here:
 * share encode/decode and flattenArrangement both dropped it (they rebuild
 * field-by-field), while normalizeSongSketch, progress save/reload and
 * duplicateSection carried it (they spread the source).
 *
 * Known limit: nothing forces the fixture itself to stay complete. A new
 * optional field on SongSketch that nobody adds to `completeSketch` is invisible
 * here, because TypeScript cannot require an optional field. The fixture is the
 * one place that still needs a human to keep it honest.
 */
import { describe, expect, it } from "vitest";
import type { SongSketch } from "../types/course";
import {
  PROGRESS_STORAGE_KEY,
  defaultProgressState,
  readProgressState,
  writeProgressState
} from "./progressStorage";
import { decodeTokenToSketch, encodeSketchToToken } from "./sketchShare";
import type { Arrangement } from "./songArranger";
import {
  addSection,
  createArrangement,
  duplicateSection,
  flattenArrangement
} from "./songArranger";
import { normalizeSongSketch } from "./songSketches";

/**
 * A maximally-populated Song Sketch. Every field is set, including the optional
 * ones, so that a pipeline dropping an optional field is visible.
 *
 * This fixture is the source of truth for what "a complete sketch" means.
 */
function completeSketch(): SongSketch {
  return {
    id: "song-fixture-1",
    title: "Round trip fixture",
    bpm: 104,
    meter: "4/4",
    key: "G",
    mode: "minor",
    form: ["A", "A", "B", "B"],
    tracks: {
      drums: [
        [true, false, true, false],
        [true, true, false, false],
        [false, true, true, false],
        [true, false, false, true]
      ],
      bass: ["G2", "G2", "Eb2", "D2"],
      chords: ["i", "i", "VI", "V"],
      melody: ["G4", "Bb4", "D5", "C5"],
      voiceGuide: ["D4", "G4", "Bb4", "G4"]
    },
    mutedTracks: ["bass"],
    soloTracks: ["chords"],
    capturedMelody: [
      { note: "G4", startBeat: 0, durationBeats: 1 },
      { note: "Bb4", startBeat: 1.5, durationBeats: 0.5, velocity: 0.8 },
      { note: "D5", startBeat: 2.25, durationBeats: 0.75, velocity: 0.55 }
    ],
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-02T00:00:00.000Z"
  };
}

/**
 * Asserts every field of `before` survived into `after`, except the keys a
 * pipeline is explicitly allowed to change.
 *
 * Keys come from the fixture at runtime. That is deliberate: a hand-maintained
 * list of field names would reproduce the very failure mode this guards against,
 * where someone adds an optional field and forgets to register it.
 */
function expectFieldsPreserved(
  pipeline: string,
  before: SongSketch,
  after: SongSketch,
  allowedToChange: Array<keyof SongSketch> = []
): void {
  const exempt = new Set<string>(allowedToChange);

  for (const key of Object.keys(before) as Array<keyof SongSketch>) {
    if (exempt.has(key)) {
      continue;
    }

    expect(
      after[key],
      `${pipeline} did not preserve "${key}"`
    ).toEqual(before[key]);
  }
}

/**
 * Wraps a sketch in an arrangement whose own musical settings match it, so that
 * flatten's tempo/meter/key/mode pass-through is verified rather than exempted.
 */
function arrangementAround(sketch: SongSketch): Arrangement {
  const base = createArrangement();

  return {
    ...base,
    bpm: sketch.bpm,
    meter: sketch.meter,
    key: sketch.key ?? "C",
    mode: sketch.mode === "minor" ? "minor" : "major",
    sections: [{ ...base.sections[0], sketch }]
  };
}

describe("song sketch round trips", () => {
  it("survives a share encode and decode", () => {
    const before = completeSketch();
    const after = decodeTokenToSketch(encodeSketchToToken(before));

    expect(after).not.toBeNull();

    // An imported sketch is deliberately a new sketch: it gets a fresh id so it
    // cannot collide with a locally created one, and fresh timestamps.
    expectFieldsPreserved("share encode/decode", before, after as SongSketch, [
      "id",
      "createdAt",
      "updatedAt"
    ]);

    expect(after?.id).not.toBe(before.id);
  });

  it("survives normalization", () => {
    const before = completeSketch();
    const after = normalizeSongSketch(before);

    expectFieldsPreserved("normalizeSongSketch", before, after);
  });

  it("survives a save and reload through browser storage", () => {
    const before = completeSketch();

    localStorage.clear();
    writeProgressState(localStorage, {
      ...defaultProgressState,
      savedSongSketches: [before]
    });

    // Round trip through the real serialized form, not a simulated one.
    expect(localStorage.getItem(PROGRESS_STORAGE_KEY)).toBeTruthy();

    const reloaded = readProgressState(localStorage);

    expect(reloaded.savedSongSketches).toHaveLength(1);
    expectFieldsPreserved(
      "progress save/reload",
      before,
      reloaded.savedSongSketches[0]
    );
  });

  it("survives section duplication inside an arrangement", () => {
    const before = completeSketch();
    const arrangement = arrangementAround(before);

    const result = duplicateSection(arrangement, arrangement.sections[0].id);
    const copy = result.sections[1].sketch;

    expectFieldsPreserved("duplicateSection", before, copy);

    // Deep copy, not a shared reference: editing the copy must not touch the
    // original's take.
    expect(copy.capturedMelody?.[0]).not.toBe(before.capturedMelody?.[0]);
  });

  it("carries every field into a flattened arrangement", () => {
    const before = completeSketch();
    const arrangement = arrangementAround(before);

    const flat = flattenArrangement(arrangement);

    // Flatten builds a new sketch, so identity and naming legitimately come from
    // the arrangement. Tempo, meter, key and mode do too, but the arrangement
    // here is seeded from the sketch, so they are checked rather than exempted.
    //
    // mutedTracks/soloTracks are exempt because flatten resets them to empty:
    // a flattened sketch deliberately plays every track. That is a real
    // behaviour choice, asserted explicitly below rather than waved through.
    expectFieldsPreserved("flattenArrangement", before, flat, [
      "id",
      "title",
      "mutedTracks",
      "soloTracks",
      "createdAt",
      "updatedAt"
    ]);

    expect(flat.mutedTracks).toEqual([]);
    expect(flat.soloTracks).toEqual([]);
  });

  it("offsets each take note by its section's bar position when flattening", () => {
    const before = completeSketch();
    const base = addSection(arrangementAround(before), "Chorus");
    const arrangement = {
      ...base,
      sections: base.sections.map((section) => ({ ...section, sketch: before }))
    };

    const flat = flattenArrangement(arrangement);
    const barsPerSection = before.form.length;
    const beatsPerBar = Number(before.meter.split("/")[0]);
    const beatsPerSection = barsPerSection * beatsPerBar;
    const takeLength = before.capturedMelody?.length ?? 0;

    expect(flat.capturedMelody).toHaveLength(takeLength * 2);

    // The second section's notes are the first section's, shifted by one
    // section's worth of beats.
    for (let index = 0; index < takeLength; index += 1) {
      const original = before.capturedMelody?.[index];
      const shifted = flat.capturedMelody?.[takeLength + index];

      expect(shifted?.note).toBe(original?.note);
      expect(shifted?.durationBeats).toBe(original?.durationBeats);
      expect(shifted?.startBeat).toBe(
        (original?.startBeat ?? 0) + beatsPerSection
      );
      expect(shifted?.velocity).toBe(original?.velocity);
    }
  });

  it("chains record, save, reload, share, arrange and flatten", () => {
    // Each pipeline above is checked in isolation. A learner's sketch meets them
    // in sequence, so run the whole journey and require the take to arrive.
    const before = completeSketch();

    localStorage.clear();
    writeProgressState(localStorage, {
      ...defaultProgressState,
      savedSongSketches: [before]
    });

    const reloaded = readProgressState(localStorage).savedSongSketches[0];
    const shared = decodeTokenToSketch(encodeSketchToToken(reloaded));

    expect(shared).not.toBeNull();

    const flat = flattenArrangement(arrangementAround(shared as SongSketch));

    expectFieldsPreserved("full journey", before, flat, [
      "id",
      "title",
      "mutedTracks",
      "soloTracks",
      "createdAt",
      "updatedAt"
    ]);
  });
});
