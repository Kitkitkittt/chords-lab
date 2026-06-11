import { useCallback, useEffect, useRef, useState } from "react";
import {
  isMusicalNoteEvent,
  parseMidiMessage,
  type MidiInputEvent
} from "../lib/midiInput";

/**
 * Web MIDI input hook.
 *
 * The byte parsing lives in the pure, tested core `src/lib/midiInput.ts`. This
 * hook owns the impure `navigator.requestMIDIAccess` wiring: it is OFF by
 * default, only requests access when `connect()` is called, and fully detaches
 * its listeners on `disconnect()` / unmount. Note-on events are forwarded to
 * the caller so prompts and instruments can be played from a real keyboard.
 */

export type MidiConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "unsupported"
  | "denied";

type UseMidiInputOptions = {
  /** Called for every note-on (with a velocity > 0). */
  onNoteOn?: (note: string, velocity: number) => void;
  /** Called for every note-off. */
  onNoteOff?: (note: string) => void;
};

type MidiAccessLike = {
  inputs: { values: () => Iterable<MidiInputLike> };
  onstatechange: ((event: unknown) => void) | null;
};

type MidiInputLike = {
  name?: string;
  onmidimessage: ((event: { data: Uint8Array }) => void) | null;
};

function hasWebMidi(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof (
      navigator as unknown as {
        requestMIDIAccess?: () => Promise<MidiAccessLike>;
      }
    ).requestMIDIAccess === "function"
  );
}

export function useMidiInput({ onNoteOn, onNoteOff }: UseMidiInputOptions = {}) {
  const [status, setStatus] = useState<MidiConnectionStatus>("idle");
  const [deviceNames, setDeviceNames] = useState<string[]>([]);
  const [lastEvent, setLastEvent] = useState<MidiInputEvent | null>(null);
  const accessRef = useRef<MidiAccessLike | null>(null);
  const inputsRef = useRef<MidiInputLike[]>([]);

  // Keep the latest callbacks without re-binding listeners.
  const onNoteOnRef = useRef(onNoteOn);
  const onNoteOffRef = useRef(onNoteOff);
  onNoteOnRef.current = onNoteOn;
  onNoteOffRef.current = onNoteOff;

  const detach = useCallback(() => {
    inputsRef.current.forEach((input) => {
      input.onmidimessage = null;
    });
    inputsRef.current = [];

    if (accessRef.current) {
      accessRef.current.onstatechange = null;
      accessRef.current = null;
    }
  }, []);

  const handleMessage = useCallback((data: Uint8Array) => {
    const event = parseMidiMessage(data);

    if (!isMusicalNoteEvent(event) || !event.note) {
      return;
    }

    setLastEvent(event);

    if (event.type === "note-on") {
      onNoteOnRef.current?.(event.note, event.velocity ?? 0.7);
    } else if (event.type === "note-off") {
      onNoteOffRef.current?.(event.note);
    }
  }, []);

  const bindInputs = useCallback(
    (access: MidiAccessLike) => {
      const inputs = Array.from(access.inputs.values());
      inputsRef.current = inputs;
      setDeviceNames(inputs.map((input) => input.name ?? "MIDI device"));

      inputs.forEach((input) => {
        input.onmidimessage = (event) => handleMessage(event.data);
      });
    },
    [handleMessage]
  );

  const connect = useCallback(async () => {
    if (!hasWebMidi()) {
      setStatus("unsupported");
      return;
    }

    setStatus("connecting");

    try {
      const access = await (
        navigator as unknown as {
          requestMIDIAccess: () => Promise<MidiAccessLike>;
        }
      ).requestMIDIAccess();
      accessRef.current = access;
      bindInputs(access);
      access.onstatechange = () => bindInputs(access);
      setStatus("connected");
    } catch {
      setStatus("denied");
    }
  }, [bindInputs]);

  const disconnect = useCallback(() => {
    detach();
    setDeviceNames([]);
    setStatus("idle");
  }, [detach]);

  useEffect(() => detach, [detach]);

  return {
    status,
    deviceNames,
    lastEvent,
    isSupported: hasWebMidi(),
    connect,
    disconnect
  };
}
