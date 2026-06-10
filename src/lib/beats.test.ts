import { describe, expect, it } from "vitest";
import {
  BEATS,
  BEAT_STEPS,
  DRUM_ROWS,
  beatById,
  cloneDrumGrid,
  drumGridEvents,
  emptyDrumGrid
} from "./beats";

describe("beats lib", () => {
  it("exposes distinct named beats including an empty one", () => {
    const ids = BEATS.map((beat) => beat.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain("none");
    expect(BEATS.length).toBeGreaterThanOrEqual(4);
  });

  it("every beat grid has one row per drum and the right step count", () => {
    for (const beat of BEATS) {
      expect(beat.grid).toHaveLength(DRUM_ROWS.length);
      for (const cells of beat.grid) {
        expect(cells).toHaveLength(BEAT_STEPS);
      }
    }
  });

  it("resolves beats by id", () => {
    expect(beatById("backbeat")?.label).toBe("Backbeat");
    expect(beatById("missing")).toBeUndefined();
  });

  it("builds empty and cloned grids without shared references", () => {
    const empty = emptyDrumGrid();
    expect(empty).toHaveLength(DRUM_ROWS.length);
    expect(empty.every((row) => row.every((cell) => cell === false))).toBe(true);

    const clone = cloneDrumGrid(BEATS[1].grid);
    clone[0][0] = !clone[0][0];
    expect(clone[0][0]).not.toBe(BEATS[1].grid[0][0]);
  });

  it("converts a grid to per-bar drum events routed to percussion voices", () => {
    const beat = beatById("backbeat")!;
    const events = drumGridEvents(beat.grid, 4);
    expect(events.length).toBeGreaterThan(0);
    expect(events.every((event) => event.track === "drums")).toBe(true);
    expect(events.every((event) => event.voice !== undefined)).toBe(true);

    // The first kick lands on beat 0 of bar 0.
    const firstKick = events.find((event) => event.voice === "kick");
    expect(firstKick?.startBeat).toBe(0);
  });

  it("repeats the grid for each bar", () => {
    const beat = beatById("four-floor")!;
    const oneBar = drumGridEvents(beat.grid, 1).length;
    const twoBars = drumGridEvents(beat.grid, 2).length;
    expect(twoBars).toBe(oneBar * 2);
  });

  it("produces no events for an empty grid", () => {
    expect(drumGridEvents(emptyDrumGrid(), 4)).toHaveLength(0);
  });
});
