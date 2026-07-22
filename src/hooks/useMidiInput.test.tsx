import { act, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useMidiInput } from "./useMidiInput";

type MidiInputMock = {
  name?: string;
  onmidimessage: ((event: { data: Uint8Array }) => void) | null;
};

type MidiAccessMock = {
  inputs: { values: () => Iterable<MidiInputMock> };
  onstatechange: ((event: unknown) => void) | null;
};

let current: ReturnType<typeof useMidiInput>;

function Probe({
  onNoteOn,
  onNoteOff,
  onSustain,
  onDisconnect
}: {
  onNoteOn?: (note: string, velocity: number, source: string) => void;
  onNoteOff?: (note: string, source: string) => void;
  onSustain?: (enabled: boolean, source: string) => void;
  onDisconnect?: (source: string) => void;
}) {
  current = useMidiInput({ onNoteOn, onNoteOff, onSustain, onDisconnect });
  return null;
}

function installMidi(access: MidiAccessMock | Error) {
  Object.defineProperty(navigator, "requestMIDIAccess", {
    configurable: true,
    value: vi.fn().mockImplementation(() =>
      access instanceof Error ? Promise.reject(access) : Promise.resolve(access)
    )
  });
}

afterEach(() => {
  Object.defineProperty(navigator, "requestMIDIAccess", {
    configurable: true,
    value: undefined
  });
});

describe("useMidiInput", () => {
  it("connects and routes note and sustain events", async () => {
    const input: MidiInputMock = { name: "Studio", onmidimessage: null };
    const access: MidiAccessMock = {
      inputs: { values: () => [input].values() },
      onstatechange: null
    };
    const onNoteOn = vi.fn();
    const onNoteOff = vi.fn();
    const onSustain = vi.fn();
    installMidi(access);
    render(<Probe onNoteOn={onNoteOn} onNoteOff={onNoteOff} onSustain={onSustain} />);

    await act(() => current.connect());
    expect(current.status).toBe("connected");
    expect(current.deviceNames).toEqual(["Studio"]);

    act(() => input.onmidimessage?.({ data: new Uint8Array([0x90, 60, 64]) }));
    expect(onNoteOn).toHaveBeenCalledWith("C4", 64 / 127, expect.stringMatching(/^midi:Studio:.+:ch:0$/));
    act(() => input.onmidimessage?.({ data: new Uint8Array([0x80, 60, 0]) }));
    expect(onNoteOff).toHaveBeenCalledWith("C4", expect.stringMatching(/^midi:Studio:.+:ch:0$/));
    act(() => input.onmidimessage?.({ data: new Uint8Array([0xb3, 64, 127]) }));
    expect(onSustain).toHaveBeenCalledWith(true, expect.stringMatching(/^midi:Studio:.+:ch:3$/));
    expect(current.lastEvent).toMatchObject({ type: "sustain", sustainOn: true, channel: 3 });
  });

  it("owns notes independently by MIDI channel", async () => {
    const input: MidiInputMock = { name: "Studio", onmidimessage: null };
    const access: MidiAccessMock = {
      inputs: { values: () => [input].values() },
      onstatechange: null
    };
    const onNoteOn = vi.fn();
    installMidi(access);
    render(<Probe onNoteOn={onNoteOn} />);

    await act(() => current.connect());
    act(() => input.onmidimessage?.({ data: new Uint8Array([0x90, 60, 64]) }));
    act(() => input.onmidimessage?.({ data: new Uint8Array([0x91, 60, 64]) }));

    expect(onNoteOn.mock.calls[0][2]).toMatch(/:ch:0$/);
    expect(onNoteOn.mock.calls[1][2]).toMatch(/:ch:1$/);
    expect(onNoteOn.mock.calls[0][2]).not.toBe(onNoteOn.mock.calls[1][2]);
  });

  it("disconnects and detaches listeners on unmount", async () => {
    const input: MidiInputMock = { onmidimessage: null };
    const access: MidiAccessMock = {
      inputs: { values: () => [input].values() },
      onstatechange: null
    };
    installMidi(access);
    const view = render(<Probe />);

    await act(() => current.connect());
    act(() => current.disconnect());
    expect(input.onmidimessage).toBeNull();
    expect(access.onstatechange).toBeNull();
    expect(current.status).toBe("idle");

    await act(() => current.connect());
    view.unmount();
    expect(input.onmidimessage).toBeNull();
    expect(access.onstatechange).toBeNull();
  });

  it("reports disconnects and device removal", async () => {
    let inputs: MidiInputMock[] = [{ name: "Studio", onmidimessage: null }];
    const access: MidiAccessMock = {
      inputs: { values: () => inputs.values() },
      onstatechange: null
    };
    const onDisconnect = vi.fn();
    installMidi(access);
    render(<Probe onDisconnect={onDisconnect} />);

    await act(() => current.connect());
    act(() => current.disconnect());
    expect(onDisconnect).toHaveBeenCalledTimes(1);

    await act(() => current.connect());
    inputs = [];
    act(() => access.onstatechange?.({}));
    expect(onDisconnect).toHaveBeenCalledTimes(2);
  });

  it("detaches removed inputs and reports only that device source", async () => {
    const removed: MidiInputMock = { name: "Removed", onmidimessage: null };
    const retained: MidiInputMock = { name: "Retained", onmidimessage: null };
    let inputs = [removed, retained];
    const access: MidiAccessMock = {
      inputs: { values: () => inputs.values() },
      onstatechange: null
    };
    const onNoteOn = vi.fn();
    const onDisconnect = vi.fn();
    installMidi(access);
    render(<Probe onNoteOn={onNoteOn} onDisconnect={onDisconnect} />);

    await act(() => current.connect());
    act(() => removed.onmidimessage?.({ data: new Uint8Array([0x90, 60, 64]) }));
    act(() => retained.onmidimessage?.({ data: new Uint8Array([0x90, 60, 64]) }));
    const removedSource = onNoteOn.mock.calls[0][2];
    const retainedSource = onNoteOn.mock.calls[1][2];
    const removedDeviceSource = removedSource.replace(/:ch:\d+$/, "");
    const retainedDeviceSource = retainedSource.replace(/:ch:\d+$/, "");
    expect(removedSource).not.toBe(retainedSource);

    inputs = [retained];
    act(() => access.onstatechange?.({}));

    expect(removed.onmidimessage).toBeNull();
    expect(retained.onmidimessage).not.toBeNull();
    expect(onDisconnect).toHaveBeenCalledWith(removedDeviceSource);
    expect(onDisconnect).not.toHaveBeenCalledWith(retainedDeviceSource);
    expect(current.deviceNames).toEqual(["Retained"]);
  });

  it("ignores a connection that resolves after disconnect", async () => {
    const input: MidiInputMock = { name: "Late", onmidimessage: null };
    const access: MidiAccessMock = {
      inputs: { values: () => [input].values() },
      onstatechange: null
    };
    let resolveAccess: (value: MidiAccessMock) => void = () => undefined;
    Object.defineProperty(navigator, "requestMIDIAccess", {
      configurable: true,
      value: vi.fn(() => new Promise<MidiAccessMock>((resolve) => {
        resolveAccess = resolve;
      }))
    });
    render(<Probe />);

    const connection = current.connect();
    act(() => current.disconnect());
    await act(async () => {
      resolveAccess(access);
      await connection;
    });

    expect(current.status).toBe("idle");
    expect(input.onmidimessage).toBeNull();
    expect(access.onstatechange).toBeNull();
  });

  it("deduplicates connection requests while permission is pending", async () => {
    const input: MidiInputMock = { name: "Studio", onmidimessage: null };
    const access: MidiAccessMock = {
      inputs: { values: () => [input].values() },
      onstatechange: null
    };
    let resolveAccess: (value: MidiAccessMock) => void = () => undefined;
    const requestMIDIAccess = vi.fn(() => new Promise<MidiAccessMock>((resolve) => {
      resolveAccess = resolve;
    }));
    Object.defineProperty(navigator, "requestMIDIAccess", {
      configurable: true,
      value: requestMIDIAccess
    });
    render(<Probe />);

    const first = current.connect();
    const second = current.connect();
    expect(requestMIDIAccess).toHaveBeenCalledTimes(1);
    await act(async () => {
      resolveAccess(access);
      await Promise.all([first, second]);
    });

    expect(current.status).toBe("connected");
  });

  it("reports denied access", async () => {
    installMidi(new Error("denied"));
    render(<Probe />);

    await act(() => current.connect());
    expect(current.status).toBe("denied");
  });
});
