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
  onNoteOn?: (note: string, velocity: number, source: string) => void;
  onNoteOff?: (note: string, source: string) => void;
  onSustain?: (enabled: boolean, source: string) => void;
  onDisconnect?: (source: string) => void;
};

type MidiAccessLike = {
  inputs: { values: () => Iterable<MidiInputLike> };
  onstatechange: ((event: unknown) => void) | null;
};

type MidiInputLike = {
  id?: string;
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

export function useMidiInput({ onNoteOn, onNoteOff, onSustain, onDisconnect }: UseMidiInputOptions = {}) {
  const [status, setStatus] = useState<MidiConnectionStatus>("idle");
  const [deviceNames, setDeviceNames] = useState<string[]>([]);
  const [lastEvent, setLastEvent] = useState<MidiInputEvent | null>(null);
  const accessRef = useRef<MidiAccessLike | null>(null);
  const inputsRef = useRef<MidiInputLike[]>([]);
  const inputSourcesRef = useRef(new Map<MidiInputLike, string>());
  const nextInputSourceRef = useRef(0);
  const connectionRef = useRef(0);
  const connectingRef = useRef(false);

  // Keep the latest callbacks without re-binding listeners.
  const onNoteOnRef = useRef(onNoteOn);
  const onNoteOffRef = useRef(onNoteOff);
  const onSustainRef = useRef(onSustain);
  const onDisconnectRef = useRef(onDisconnect);
  onNoteOnRef.current = onNoteOn;
  onNoteOffRef.current = onNoteOff;
  onSustainRef.current = onSustain;
  onDisconnectRef.current = onDisconnect;

  const sourceForInput = useCallback((input: MidiInputLike) => {
    const existing = inputSourcesRef.current.get(input);
    if (existing) {
      return existing;
    }

    nextInputSourceRef.current += 1;
    const source = `midi:${input.id ?? input.name ?? "device"}:${nextInputSourceRef.current}`;
    inputSourcesRef.current.set(input, source);
    return source;
  }, []);

  const detach = useCallback(() => {
    inputsRef.current.forEach((input) => {
      input.onmidimessage = null;
    });
    inputsRef.current = [];
    inputSourcesRef.current.clear();

    if (accessRef.current) {
      accessRef.current.onstatechange = null;
      accessRef.current = null;
    }
  }, []);

  const handleMessage = useCallback((data: Uint8Array, source: string) => {
    const event = parseMidiMessage(data);
    const channelSource = `${source}:ch:${event.channel ?? 0}`;

    if (event.type === "sustain") {
      setLastEvent(event);
      onSustainRef.current?.(event.sustainOn ?? false, channelSource);
      return;
    }

    if (!isMusicalNoteEvent(event) || !event.note) {
      return;
    }

    setLastEvent(event);

    if (event.type === "note-on") {
      onNoteOnRef.current?.(event.note, event.velocity ?? 0.7, channelSource);
    } else if (event.type === "note-off") {
      onNoteOffRef.current?.(event.note, channelSource);
    }
  }, []);

  const bindInputs = useCallback(
    (access: MidiAccessLike) => {
      const inputs = Array.from(access.inputs.values());
      const previousInputs = inputsRef.current;
      previousInputs.forEach((input) => {
        if (!inputs.includes(input)) {
          input.onmidimessage = null;
          const source = inputSourcesRef.current.get(input);
          if (source) {
            onDisconnectRef.current?.(source);
            inputSourcesRef.current.delete(input);
          }
        }
      });
      inputsRef.current = inputs;
      setDeviceNames(inputs.map((input) => input.name ?? "MIDI device"));

      inputs.forEach((input) => {
        const source = sourceForInput(input);
        input.onmidimessage = (event) => handleMessage(event.data, source);
      });
    },
    [handleMessage, sourceForInput]
  );

  const connect = useCallback(async () => {
    if (connectingRef.current) {
      return;
    }
    if (!hasWebMidi()) {
      setStatus("unsupported");
      return;
    }

    const connection = connectionRef.current + 1;
    connectionRef.current = connection;
    connectingRef.current = true;
    setStatus("connecting");

    try {
      const access = await (
        navigator as unknown as {
          requestMIDIAccess: () => Promise<MidiAccessLike>;
        }
      ).requestMIDIAccess();
      if (connection !== connectionRef.current) {
        access.onstatechange = null;
        Array.from(access.inputs.values()).forEach((input) => {
          input.onmidimessage = null;
        });
        return;
      }
      accessRef.current = access;
      bindInputs(access);
      access.onstatechange = () => bindInputs(access);
      setStatus("connected");
    } catch {
      if (connection === connectionRef.current) {
        setStatus("denied");
      }
    } finally {
      if (connection === connectionRef.current) {
        connectingRef.current = false;
      }
    }
  }, [bindInputs]);

  const disconnect = useCallback(() => {
    connectionRef.current += 1;
    connectingRef.current = false;
    inputsRef.current.forEach((input) => {
      const source = inputSourcesRef.current.get(input);
      if (source) {
        onDisconnectRef.current?.(source);
      }
    });
    detach();
    setDeviceNames([]);
    setStatus("idle");
  }, [detach]);

  useEffect(() => () => {
    connectionRef.current += 1;
    connectingRef.current = false;
    detach();
  }, [detach]);

  return {
    status,
    deviceNames,
    lastEvent,
    isSupported: hasWebMidi(),
    connect,
    disconnect
  };
}
