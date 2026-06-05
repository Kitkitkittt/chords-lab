import { describe, expect, it } from "vitest";
import {
  calculateTapTempo,
  detectChordStack,
  quantizeBeatPosition
} from "./interactionTools";

describe("tap-first interaction tools", () => {
  it("detects common chord stacks", () => {
    expect(detectChordStack(["C", "E", "G"])).toContain("CM");
    expect(detectChordStack(["A", "C", "E"])).toContain("Am");
    expect(detectChordStack(["B", "D", "F"])).toContain("Bdim");
    expect(detectChordStack(["C", "E", "G#"])).toContain("Caug");
    expect(detectChordStack(["G", "B", "D", "F"])).toContain("G7");
  });

  it("calculates stable BPM from tap intervals", () => {
    expect(calculateTapTempo([0, 500, 1000, 1500])).toBe(120);
  });

  it("quantizes rhythm positions to the nearest subdivision", () => {
    expect(quantizeBeatPosition(1.26, 0.5)).toBe(1.5);
  });
});
