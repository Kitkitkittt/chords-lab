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
  onNoteOn?: (note: string, velocity: number) => void;
  onNoteOff?: (note: string) => void;
  onSustain?: (enabled: boolean) => void;
  onDisconnect?: () => void;
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
    expect(onNoteOn).toHaveBeenCalledWith("C4", 64 / 127);
    act(() => input.onmidimessage?.({ data: new Uint8Array([0x80, 60, 0]) }));
    expect(onNoteOff).toHaveBeenCalledWith("C4");
    act(() => input.onmidimessage?.({ data: new Uint8Array([0xb0, 64, 127]) }));
    expect(onSustain).toHaveBeenCalledWith(true);
    expect(current.lastEvent).toMatchObject({ type: "sustain", sustainOn: true });
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

  it("reports denied access", async () => {
    installMidi(new Error("denied"));
    render(<Probe />);

    await act(() => current.connect());
    expect(current.status).toBe("denied");
  });
});
