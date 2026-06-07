import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { liveVoiceForInstrument } from "../lib/audioEngine";

// Mock the live-voice engine functions so we can assert wiring without Tone.js.
const attack = vi.fn();
const release = vi.fn();
const oneShot = vi.fn();

vi.mock("../lib/audioEngine", async () => {
  const actual = await vi.importActual<typeof import("../lib/audioEngine")>(
    "../lib/audioEngine"
  );

  return {
    ...actual,
    triggerNoteAttack: (...args: unknown[]) => attack(...args),
    triggerNoteRelease: (...args: unknown[]) => release(...args),
    triggerNote: (...args: unknown[]) => oneShot(...args)
  };
});

import {
  DrumPadWorkbench,
  FretboardWorkbench,
  InteractivePianoWorkbench,
  VoiceRangeWorkbench
} from "./InstrumentWorkbenches";
import { standardTunings } from "../lib/instruments";

describe("liveVoiceForInstrument", () => {
  it("maps instruments to timbres", () => {
    expect(liveVoiceForInstrument("piano")).toBe("keys");
    expect(liveVoiceForInstrument("guitar")).toBe("pluck");
    expect(liveVoiceForInstrument("ukulele")).toBe("pluck");
    expect(liveVoiceForInstrument("bass")).toBe("bass");
    expect(liveVoiceForInstrument("voice")).toBe("voice");
    expect(liveVoiceForInstrument(undefined)).toBe("keys");
  });
});

describe("interactive workbenches play sound", () => {
  beforeEach(() => {
    attack.mockClear();
    release.mockClear();
    oneShot.mockClear();
  });

  it("piano keys attack on pointer down and release on pointer up", () => {
    render(
      <InteractivePianoWorkbench label="Piano" highlights={[]} selectedNotes={[]} />
    );

    const key = screen.getByRole("button", { name: "C4" });
    key.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));
    expect(attack).toHaveBeenCalledWith(
      "C4",
      expect.objectContaining({ voiceId: "keys" })
    );

    key.dispatchEvent(new MouseEvent("pointerup", { bubbles: true }));
    expect(release).toHaveBeenCalledWith(
      "C4",
      expect.objectContaining({ voiceId: "keys" })
    );
  });

  it("fretboard cells are buttons that play the fretted note", () => {
    render(
      <FretboardWorkbench
        instrumentId="guitar"
        title="Guitar fretboard"
        tuning={standardTunings.guitar}
        activeNotes={["C", "E", "G"]}
      />
    );

    // Every fret position is now an interactive button.
    const cells = screen.getAllByRole("button");
    expect(cells.length).toBeGreaterThan(10);

    cells[0].dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));
    expect(attack).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ voiceId: "pluck" })
    );
  });

  it("drum pads preview their voice on click", async () => {
    const onToggle = vi.fn();
    const pattern = [
      [false, false, false, false],
      [false, false, false, false],
      [false, false, false, false],
      [false, false, false, false]
    ];
    render(<DrumPadWorkbench pattern={pattern} onToggle={onToggle} />);

    const snarePad = screen.getByRole("button", { name: "snare beat 1" });
    snarePad.click();
    expect(oneShot).toHaveBeenCalledWith(
      "C2",
      expect.objectContaining({ voiceId: "snare" })
    );
    expect(onToggle).toHaveBeenCalledWith(1, 0);
  });

  it("voice ladder steps play the voice timbre", () => {
    render(<VoiceRangeWorkbench activeNotes={[]} onPlay={() => {}} />);

    // Degree 1 "do" is the first solfege step (C4).
    const doStep = screen.getByRole("button", { name: "do 1 C4" });
    doStep.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));
    expect(attack).toHaveBeenCalledWith(
      "C4",
      expect.objectContaining({ voiceId: "voice" })
    );
  });
});
