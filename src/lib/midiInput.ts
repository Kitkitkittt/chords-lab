import { Note } from "tonal";

/**
 * MIDI input: the PURE core of a Web MIDI input adapter.
 *
 * This module parses raw MIDI message bytes into musical events and converts
 * MIDI note numbers into note names. It performs NO Web MIDI API access: there
 * is no `navigator.requestMIDIAccess` here. That wiring lives in a separate
 * React hook so this core stays pure and unit-testable by feeding byte arrays.
 */

/** A single parsed MIDI message, normalized into a musical event. */
export type MidiInputEvent = {
  type: "note-on" | "note-off" | "sustain" | "other";
  note?: string;
  midi?: number;
  /** Velocity normalized to 0..1 (raw / 127). Only set for note-on. */
  velocity?: number;
  channel?: number;
  sustainOn?: boolean;
};

/**
 * Convert a MIDI note number to a note name (e.g. 60 -> "C4"). Returns null for
 * out-of-range (< 0 or > 127) or non-integer input.
 */
export function midiToNoteName(midi: number): string | null {
  if (!Number.isInteger(midi) || midi < 0 || midi > 127) {
    return null;
  }
  return Note.fromMidi(midi);
}

/**
 * Parse a single MIDI message into a normalized musical event.
 *
 * - note-on (status 0x90-0x9F) with velocity > 0 -> "note-on".
 * - note-on with velocity 0 OR note-off (0x80-0x8F) -> "note-off".
 * - control change (0xB0-0xBF) controller 64 (sustain) -> "sustain".
 * - anything else (including short/empty arrays) -> "other".
 */
export function parseMidiMessage(data: number[] | Uint8Array): MidiInputEvent {
  if (!data || data.length < 1) {
    return { type: "other" };
  }

  const status = data[0];
  const messageType = status & 0xf0;
  const channel = status & 0x0f;

  // Note-on
  if (messageType === 0x90 && data.length >= 3) {
    const midi = data[1];
    const velocity = data[2];
    if (velocity > 0) {
      return {
        type: "note-on",
        note: midiToNoteName(midi) ?? undefined,
        midi,
        velocity: velocity / 127,
        channel
      };
    }
    // Velocity 0 is treated as a note-off.
    return {
      type: "note-off",
      note: midiToNoteName(midi) ?? undefined,
      midi,
      channel
    };
  }

  // Note-off
  if (messageType === 0x80 && data.length >= 3) {
    const midi = data[1];
    return {
      type: "note-off",
      note: midiToNoteName(midi) ?? undefined,
      midi,
      channel
    };
  }

  // Control change (sustain pedal is controller 64)
  if (messageType === 0xb0 && data.length >= 3) {
    const controller = data[1];
    const value = data[2];
    if (controller === 64) {
      return {
        type: "sustain",
        sustainOn: value >= 64,
        channel
      };
    }
  }

  return { type: "other" };
}

/** True for note-on and note-off events (the musical pitch events). */
export function isMusicalNoteEvent(event: MidiInputEvent): boolean {
  return event.type === "note-on" || event.type === "note-off";
}
