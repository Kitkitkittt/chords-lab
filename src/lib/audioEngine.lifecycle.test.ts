import { afterEach, describe, expect, it, vi } from "vitest";

const tone = vi.hoisted(() => {
  const voice = {
    triggerAttack: vi.fn(),
    triggerRelease: vi.fn(),
    triggerAttackRelease: vi.fn(),
    releaseAll: vi.fn(),
    dispose: vi.fn()
  };

  return {
    start: vi.fn(() => Promise.resolve()),
    voice,
    polySynth: vi.fn(() => ({ toDestination: () => voice }))
  };
});

vi.mock("tone", () => {
  const destination = () => ({ toDestination: () => tone.voice });

  return {
    start: tone.start,
    now: () => 0,
    Synth: vi.fn(),
    AMSynth: vi.fn(),
    PolySynth: tone.polySynth,
    PluckSynth: vi.fn(destination),
    MembraneSynth: vi.fn(destination),
    NoiseSynth: vi.fn(destination)
  };
});

import {
  chordPattern,
  disposeLiveVoices,
  playLoop,
  playPattern,
  releaseAllLiveNotes,
  triggerNoteAttack
} from "./audioEngine";

const pattern = chordPattern("C", ["C4", "E4", "G4"]);

afterEach(() => {
  disposeLiveVoices();
  tone.start.mockReset();
  tone.start.mockResolvedValue(undefined);
  vi.clearAllMocks();
});

describe("audioEngine lifecycle", () => {
  it("invalidates an in-flight pattern when a newer disabled request wins", async () => {
    const first = playPattern(pattern, { audioEnabled: true });
    const latest = await playPattern(pattern, { audioEnabled: false });

    expect(latest).toBe("disabled");
    await expect(first).resolves.toBe("stopped");
  });

  it("invalidates an in-flight loop when a newer disabled request wins", async () => {
    const first = playLoop(pattern, { audioEnabled: true });
    const latest = await playLoop(pattern, { audioEnabled: false });

    expect(latest.stop).toBeTypeOf("function");
    await expect(first).resolves.toEqual({ stop: expect.any(Function) });
  });

  it("invalidates a pending live attack when all notes are released", async () => {
    let unlock: () => void = () => undefined;
    tone.start.mockImplementationOnce(
      () => new Promise<void>((resolve) => {
        unlock = resolve;
      })
    );

    const pending = triggerNoteAttack("C4");
    await vi.waitFor(() => expect(tone.start).toHaveBeenCalled());
    releaseAllLiveNotes();
    unlock();
    await pending;

    expect(tone.voice.triggerAttack).not.toHaveBeenCalled();
  });

  it("does not recreate a live voice after disposal", async () => {
    let unlock: () => void = () => undefined;
    tone.start.mockImplementationOnce(
      () => new Promise<void>((resolve) => {
        unlock = resolve;
      })
    );

    const pending = triggerNoteAttack("C4");
    await vi.waitFor(() => expect(tone.start).toHaveBeenCalled());
    disposeLiveVoices();
    unlock();
    await pending;

    expect(tone.polySynth).not.toHaveBeenCalled();
    expect(tone.voice.triggerAttack).not.toHaveBeenCalled();
  });
});
