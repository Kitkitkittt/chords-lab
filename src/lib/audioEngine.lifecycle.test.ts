import { afterEach, describe, expect, it, vi } from "vitest";

const tone = vi.hoisted(() => {
  const makeVoice = () => {
    const voice = {
      triggerAttack: vi.fn(),
      triggerRelease: vi.fn(),
      triggerAttackRelease: vi.fn(),
      releaseAll: vi.fn(),
      dispose: vi.fn(),
      connectedTo: undefined as unknown,
      routedToDestination: false,
      connect: vi.fn(),
      toDestination: vi.fn()
    };
    voice.connect.mockImplementation((to: unknown) => {
      voice.connectedTo = to;
      return voice;
    });
    voice.toDestination.mockImplementation(() => {
      voice.routedToDestination = true;
      return voice;
    });
    return voice;
  };

  const voices: ReturnType<typeof makeVoice>[] = [];
  const nextVoice = () => {
    const voice = makeVoice();
    voices.push(voice);
    return voice;
  };

  const makeEffect = () => {
    const effect = {
      wet: { value: -1 },
      connect: vi.fn(),
      toDestination: vi.fn(),
      dispose: vi.fn()
    };
    effect.connect.mockReturnValue(effect);
    effect.toDestination.mockReturnValue(effect);
    return effect;
  };

  const reverbs: ReturnType<typeof makeEffect>[] = [];
  const delays: ReturnType<typeof makeEffect>[] = [];

  return {
    start: vi.fn(() => Promise.resolve()),
    voices,
    reverbs,
    delays,
    nextVoice,
    reverb: vi.fn(function () {
      const effect = makeEffect();
      reverbs.push(effect);
      return effect;
    }),
    delay: vi.fn(function () {
      const effect = makeEffect();
      delays.push(effect);
      return effect;
    }),
    polySynth: vi.fn(function () {
      return nextVoice();
    })
  };
});

vi.mock("tone", () => {
  return {
    start: tone.start,
    now: () => 0,
    Synth: vi.fn(),
    AMSynth: vi.fn(),
    PolySynth: tone.polySynth,
    PluckSynth: vi.fn(function () {
      return tone.nextVoice();
    }),
    MembraneSynth: vi.fn(function () {
      return tone.nextVoice();
    }),
    NoiseSynth: vi.fn(function () {
      return tone.nextVoice();
    }),
    Reverb: tone.reverb,
    FeedbackDelay: tone.delay
  };
});

import {
  chordPattern,
  disposeLiveVoices,
  playLoop,
  playPattern,
  releaseAllLiveNotes,
  setLiveEffects,
  triggerNoteAttack
} from "./audioEngine";

const pattern = chordPattern("C", ["C4", "E4", "G4"]);

afterEach(() => {
  disposeLiveVoices();
  setLiveEffects({ reverb: 0, delay: 0 });
  tone.voices.length = 0;
  tone.reverbs.length = 0;
  tone.delays.length = 0;
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

    expect(tone.voices.every((voice) => voice.triggerAttack.mock.calls.length === 0)).toBe(true);
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
    expect(tone.voices.every((voice) => voice.triggerAttack.mock.calls.length === 0)).toBe(true);
  });

  it("applies live effects settings set before any voice exists", async () => {
    setLiveEffects({ reverb: 0.5, delay: 0.3 });
    await triggerNoteAttack("C4");

    expect(tone.reverbs).toHaveLength(1);
    expect(tone.delays).toHaveLength(1);
    expect(tone.reverbs[0].wet.value).toBe(0.5);
    expect(tone.delays[0].wet.value).toBe(0.3);
  });

  it("routes a live voice through the reverb then delay to destination", async () => {
    await triggerNoteAttack("C4");

    const reverb = tone.reverbs[0];
    const delay = tone.delays[0];
    const voice = tone.voices[0];

    expect(voice.connectedTo).toBe(reverb);
    expect(voice.routedToDestination).toBe(false);
    expect(reverb.connect).toHaveBeenCalledWith(delay);
    expect(delay.toDestination).toHaveBeenCalled();
  });

  it("keeps loop voices routed straight to destination", async () => {
    await playLoop(pattern, { audioEnabled: true });

    expect(tone.reverbs).toHaveLength(0);
    expect(tone.delays).toHaveLength(0);
    expect(tone.voices.some((voice) => voice.routedToDestination)).toBe(true);
    expect(tone.voices.every((voice) => voice.connectedTo === undefined)).toBe(true);
  });

  it("clamps effect settings to the 0..1 range", async () => {
    setLiveEffects({ reverb: 2, delay: -1 });
    await triggerNoteAttack("C4");

    expect(tone.reverbs[0].wet.value).toBe(1);
    expect(tone.delays[0].wet.value).toBe(0);
  });

  it("reuses a single effects bus across multiple live voices", async () => {
    await triggerNoteAttack("C4", { voiceId: "keys" });
    await triggerNoteAttack("C4", { voiceId: "pad" });

    expect(tone.reverbs).toHaveLength(1);
    expect(tone.delays).toHaveLength(1);
  });

  it("disposes the shared effects bus on teardown and rebuilds with retained settings", async () => {
    setLiveEffects({ reverb: 0.4, delay: 0.6 });
    await triggerNoteAttack("C4");

    const firstReverb = tone.reverbs[0];
    const firstDelay = tone.delays[0];

    disposeLiveVoices();

    expect(firstReverb.dispose).toHaveBeenCalled();
    expect(firstDelay.dispose).toHaveBeenCalled();

    await triggerNoteAttack("C4");

    expect(tone.reverbs).toHaveLength(2);
    expect(tone.reverbs[1].wet.value).toBe(0.4);
    expect(tone.delays[1].wet.value).toBe(0.6);
  });
});
