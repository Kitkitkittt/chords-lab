import { act, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const attack = vi.fn();
const release = vi.fn();
const releaseAll = vi.fn();

vi.mock("../lib/audioEngine", () => ({
  triggerNoteAttack: (...args: unknown[]) => attack(...args),
  triggerNoteRelease: (...args: unknown[]) => release(...args),
  releaseAllLiveNotes: () => releaseAll()
}));

import { usePianoInput } from "./usePianoInput";

let current: ReturnType<typeof usePianoInput>;

function Probe({ audioEnabled = true, child = false }: { audioEnabled?: boolean; child?: boolean }) {
  current = usePianoInput({ audioEnabled, initialOctave: 4 });
  return <div data-testid="piano" tabIndex={0} {...current.keyboardHandlers}>{child ? <button type="button">C4</button> : null}</div>;
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  Object.defineProperty(navigator, "requestMIDIAccess", {
    configurable: true,
    value: undefined
  });
});

describe("usePianoInput", () => {
  it("plays and releases mapped QWERTY notes", () => {
    const { getByTestId } = render(<Probe />);
    const piano = getByTestId("piano");

    fireEvent.keyDown(piano, { key: "a" });
    expect(attack).toHaveBeenCalledWith("C4", {
      voiceId: "keys",
      audioEnabled: true,
      velocity: 0.8
    });
    expect(current.activeNotes).toEqual(["C4"]);
    fireEvent.keyUp(piano, { key: "a" });
    expect(release).toHaveBeenCalledWith("C4", { voiceId: "keys" });
    expect(current.activeNotes).toEqual([]);
  });

  it("shifts octaves and releases active notes", () => {
    const { getByTestId } = render(<Probe />);
    const piano = getByTestId("piano");

    fireEvent.keyDown(piano, { key: "x" });
    expect(current.octave).toBe(5);
    fireEvent.keyDown(piano, { key: "a" });
    expect(attack).toHaveBeenCalledWith("C5", expect.any(Object));
    act(() => current.shiftOctave(-10));
    expect(current.octave).toBe(1);
    expect(releaseAll).toHaveBeenCalled();
  });

  it("defers release while sustain is held", () => {
    const { getByTestId } = render(<Probe />);
    const piano = getByTestId("piano");

    fireEvent.keyDown(piano, { key: "a" });
    fireEvent.keyDown(piano, { key: " " });
    fireEvent.keyUp(piano, { key: "a" });
    expect(release).not.toHaveBeenCalled();
    expect(current.activeNotes).toEqual(["C4"]);
    fireEvent.keyUp(piano, { key: " " });
    expect(release).toHaveBeenCalledWith("C4", { voiceId: "keys" });
    expect(current.activeNotes).toEqual([]);
  });

  it("leaves Space on a focused child button to native activation", () => {
    const { getByRole } = render(<Probe child />);
    const key = getByRole("button", { name: "C4" });

    fireEvent.keyDown(key, { key: " " });
    expect(current.sustain).toBe(false);
    fireEvent.keyUp(key, { key: " " });
    expect(current.sustain).toBe(false);
  });

  it("toggles mobile notes and ignores disabled keyboard input", () => {
    const { getByTestId } = render(<Probe />);
    const piano = getByTestId("piano");

    act(() => current.toggleNote("E4"));
    expect(current.activeNotes).toEqual(["E4"]);
    act(() => current.toggleNote("E4"));
    expect(current.activeNotes).toEqual([]);
    act(() => current.setKeyboardEnabled(false));
    fireEvent.keyDown(piano, { key: "a" });
    expect(attack).toHaveBeenCalledTimes(1);
  });

  it("keeps a note held until every input source releases it", () => {
    render(<Probe />);

    act(() => current.noteOn("C4", 0.8, "pointer:1"));
    act(() => current.noteOn("C4", 0.7, "midi"));
    expect(attack).toHaveBeenCalledTimes(1);
    expect(current.activeNotes).toEqual(["C4"]);

    act(() => current.noteOff("C4", "pointer:1"));
    expect(release).not.toHaveBeenCalled();
    expect(current.activeNotes).toEqual(["C4"]);

    act(() => current.noteOff("C4", "midi"));
    expect(release).toHaveBeenCalledWith("C4", { voiceId: "keys" });
    expect(current.activeNotes).toEqual([]);
  });

  it("toggles only the latch source when MIDI holds the same note", () => {
    render(<Probe />);

    act(() => current.noteOn("C4", 0.7, "midi:keyboard:1:ch:0"));
    act(() => current.toggleNote("C4", "pointer:latch"));
    expect(attack).toHaveBeenCalledTimes(1);
    expect(current.activeNotes).toEqual(["C4"]);

    act(() => current.toggleNote("C4", "pointer:latch"));
    expect(release).not.toHaveBeenCalled();
    expect(current.activeNotes).toEqual(["C4"]);

    act(() => current.noteOff("C4", "midi:keyboard:1:ch:0"));
    expect(release).toHaveBeenCalledWith("C4", { voiceId: "keys" });
    expect(current.activeNotes).toEqual([]);
  });

  it("forwards MIDI events through piano note paths", async () => {
    const input = { name: "Keyboard", onmidimessage: null as ((event: { data: Uint8Array }) => void) | null };
    const access = {
      inputs: { values: () => [input].values() },
      onstatechange: null as ((event: unknown) => void) | null
    };
    Object.defineProperty(navigator, "requestMIDIAccess", {
      configurable: true,
      value: vi.fn().mockResolvedValue(access)
    });
    render(<Probe />);

    await act(() => current.midi.connect());
    act(() => input.onmidimessage?.({ data: new Uint8Array([0x90, 60, 96]) }));
    expect(attack).toHaveBeenCalledWith("C4", expect.objectContaining({ velocity: 96 / 127 }));
    act(() => input.onmidimessage?.({ data: new Uint8Array([0x80, 60, 0]) }));
    expect(release).toHaveBeenCalledWith("C4", { voiceId: "keys" });
  });

  it("owns the same MIDI note independently by channel", async () => {
    const input = { name: "Keyboard", onmidimessage: null as ((event: { data: Uint8Array }) => void) | null };
    const access = {
      inputs: { values: () => [input].values() },
      onstatechange: null as ((event: unknown) => void) | null
    };
    Object.defineProperty(navigator, "requestMIDIAccess", {
      configurable: true,
      value: vi.fn().mockResolvedValue(access)
    });
    render(<Probe />);

    await act(() => current.midi.connect());
    act(() => input.onmidimessage?.({ data: new Uint8Array([0x90, 60, 96]) }));
    act(() => input.onmidimessage?.({ data: new Uint8Array([0x91, 60, 96]) }));
    act(() => input.onmidimessage?.({ data: new Uint8Array([0x80, 60, 0]) }));
    expect(release).not.toHaveBeenCalled();
    expect(current.activeNotes).toEqual(["C4"]);

    act(() => input.onmidimessage?.({ data: new Uint8Array([0x81, 60, 0]) }));
    expect(release).toHaveBeenCalledWith("C4", { voiceId: "keys" });
    expect(current.activeNotes).toEqual([]);
  });

  it("applies MIDI sustain only to its own channel", async () => {
    const input = { name: "Keyboard", onmidimessage: null as ((event: { data: Uint8Array }) => void) | null };
    const access = {
      inputs: { values: () => [input].values() },
      onstatechange: null as ((event: unknown) => void) | null
    };
    Object.defineProperty(navigator, "requestMIDIAccess", {
      configurable: true,
      value: vi.fn().mockResolvedValue(access)
    });
    render(<Probe />);

    await act(() => current.midi.connect());
    act(() => input.onmidimessage?.({ data: new Uint8Array([0x90, 60, 96]) }));
    act(() => input.onmidimessage?.({ data: new Uint8Array([0xb0, 64, 127]) }));
    act(() => input.onmidimessage?.({ data: new Uint8Array([0x80, 60, 0]) }));
    act(() => input.onmidimessage?.({ data: new Uint8Array([0x91, 64, 96]) }));
    act(() => input.onmidimessage?.({ data: new Uint8Array([0x81, 64, 0]) }));

    expect(release).toHaveBeenCalledWith("E4", { voiceId: "keys" });
    expect(release).not.toHaveBeenCalledWith("C4", { voiceId: "keys" });
    expect(current.activeNotes).toEqual(["C4"]);

    act(() => input.onmidimessage?.({ data: new Uint8Array([0xb0, 64, 0]) }));
    expect(release).toHaveBeenCalledWith("C4", { voiceId: "keys" });
    expect(current.activeNotes).toEqual([]);
  });

  it("owns MIDI notes per device and releases notes from a removed input", async () => {
    const first = { name: "First", onmidimessage: null as ((event: { data: Uint8Array }) => void) | null };
    const second = { name: "Second", onmidimessage: null as ((event: { data: Uint8Array }) => void) | null };
    let inputs = [first, second];
    const access = {
      inputs: { values: () => inputs.values() },
      onstatechange: null as ((event: unknown) => void) | null
    };
    Object.defineProperty(navigator, "requestMIDIAccess", {
      configurable: true,
      value: vi.fn().mockResolvedValue(access)
    });
    render(<Probe />);

    await act(() => current.midi.connect());
    act(() => first.onmidimessage?.({ data: new Uint8Array([0x90, 60, 96]) }));
    act(() => second.onmidimessage?.({ data: new Uint8Array([0x90, 60, 96]) }));
    act(() => first.onmidimessage?.({ data: new Uint8Array([0x90, 64, 96]) }));
    expect(attack).toHaveBeenCalledTimes(2);

    inputs = [second];
    act(() => access.onstatechange?.({}));

    expect(release).toHaveBeenCalledWith("E4", { voiceId: "keys" });
    expect(release).not.toHaveBeenCalledWith("C4", { voiceId: "keys" });
    expect(current.activeNotes).toEqual(["C4"]);

    act(() => second.onmidimessage?.({ data: new Uint8Array([0x80, 60, 0]) }));
    expect(release).toHaveBeenCalledWith("C4", { voiceId: "keys" });
    expect(current.activeNotes).toEqual([]);
  });

  it("clears a removed MIDI device's sustained notes", async () => {
    const input = { name: "Keyboard", onmidimessage: null as ((event: { data: Uint8Array }) => void) | null };
    let inputs = [input];
    const access = {
      inputs: { values: () => inputs.values() },
      onstatechange: null as ((event: unknown) => void) | null
    };
    Object.defineProperty(navigator, "requestMIDIAccess", {
      configurable: true,
      value: vi.fn().mockResolvedValue(access)
    });
    render(<Probe />);

    await act(() => current.midi.connect());
    act(() => input.onmidimessage?.({ data: new Uint8Array([0x90, 60, 96]) }));
    act(() => input.onmidimessage?.({ data: new Uint8Array([0xb0, 64, 127]) }));
    act(() => input.onmidimessage?.({ data: new Uint8Array([0x80, 60, 0]) }));
    expect(current.activeNotes).toEqual(["C4"]);

    inputs = [];
    act(() => access.onstatechange?.({}));

    expect(current.sustain).toBe(false);
    expect(release).toHaveBeenCalledWith("C4", { voiceId: "keys" });
    expect(current.activeNotes).toEqual([]);
  });

  it("releases all notes when the window loses focus", () => {
    render(<Probe />);
    act(() => current.noteOn("C4"));
    releaseAll.mockClear();

    fireEvent(window, new Event("blur"));

    expect(releaseAll).toHaveBeenCalledTimes(1);
    expect(current.activeNotes).toEqual([]);
  });

  it("releases all notes when the document becomes hidden", () => {
    render(<Probe />);
    act(() => current.noteOn("C4"));
    releaseAll.mockClear();
    Object.defineProperty(document, "hidden", { configurable: true, value: true });

    fireEvent(document, new Event("visibilitychange"));

    expect(releaseAll).toHaveBeenCalledTimes(1);
    expect(current.activeNotes).toEqual([]);
    Object.defineProperty(document, "hidden", { configurable: true, value: false });
  });

  it("releases all notes on unmount", () => {
    const view = render(<Probe />);
    act(() => current.noteOn("C4"));
    view.unmount();
    expect(releaseAll).toHaveBeenCalled();
  });
});
