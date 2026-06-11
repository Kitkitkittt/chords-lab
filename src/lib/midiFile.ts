/**
 * Standard MIDI File (SMF) encoder for Song Lab sketches.
 *
 * Converts a {@link SongSketch} into a valid SMF format 1 byte stream
 * (`Uint8Array`) that can be downloaded as a `.mid` file. Everything here is
 * pure: no React, no DOM access, no storage. The single exception is
 * {@link downloadMidiBlob}, which wraps the encoded bytes in a `Blob` but never
 * touches the DOM.
 *
 * Layout produced:
 *   - "MThd" header chunk: format 1, ntracks = emitted tracks, division = 480.
 *   - Track 0: tempo / time-signature / end-of-track meta events.
 *   - One track per musical part: melody (ch 0), bass (ch 1), chords (ch 2),
 *     drums (ch 9 = General MIDI percussion).
 *
 * Timing model: each array index is one beat = {@link TICKS_PER_QUARTER} ticks
 * for melody / bass / chords. Each drum step is likewise treated as one quarter
 * note, iterating by each row's own length. "rest" entries advance time with no
 * sounding note.
 */

import { Note } from "tonal";
import type { SongSketch } from "../types/course";
import { romanChordNotes } from "./audioEngine";

/** Ticks per quarter note (SMF division). */
export const TICKS_PER_QUARTER = 480;

/** Note-on velocity used for every sounding note. */
const NOTE_VELOCITY = 80;

/** General MIDI drum note numbers per Song Lab drum row (kick/snare/hat/clap). */
const DRUM_NOTE_NUMBERS = [36, 38, 42, 39];

/**
 * Convert a note name like "C4" to its MIDI note number (C4 = 60).
 *
 * Returns `null` for "rest" or any value `tonal` cannot parse.
 */
export function midiNoteNumber(noteName: string): number | null {
  if (!noteName || noteName.toLowerCase() === "rest") {
    return null;
  }

  const value = Note.midi(noteName);
  return typeof value === "number" ? value : null;
}

/**
 * Encode an unsigned integer as a MIDI variable-length quantity (VLQ).
 *
 * Examples: `0 -> [0x00]`, `128 -> [0x81, 0x00]`. Exported for testability.
 */
export function writeVarLen(value: number): number[] {
  let n = Math.max(0, Math.floor(value));

  // Collect 7-bit groups, least significant first.
  const bytes = [n & 0x7f];
  n >>>= 7;
  while (n > 0) {
    bytes.push((n & 0x7f) | 0x80);
    n >>>= 7;
  }

  // Stored most significant first.
  return bytes.reverse();
}

/** Big-endian 32-bit unsigned integer as 4 bytes. */
export function writeUint32(value: number): number[] {
  return [
    (value >>> 24) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 8) & 0xff,
    value & 0xff
  ];
}

/** Big-endian 16-bit unsigned integer as 2 bytes. */
export function writeUint16(value: number): number[] {
  return [(value >>> 8) & 0xff, value & 0xff];
}

/** ASCII bytes for a chunk type identifier such as "MThd" or "MTrk". */
function asciiBytes(text: string): number[] {
  const out: number[] = [];
  for (let i = 0; i < text.length; i += 1) {
    out.push(text.charCodeAt(i) & 0xff);
  }
  return out;
}

/** Wrap a chunk body in `type` + big-endian length prefix. */
function chunk(type: string, body: number[]): number[] {
  return [...asciiBytes(type), ...writeUint32(body.length), ...body];
}

/** One event with its delta time, ready to be flattened into a track. */
type TrackEvent = {
  /** Absolute tick position when the event fires. */
  tick: number;
  /** Stable secondary sort so note-offs precede note-ons at the same tick. */
  order: number;
  /** Raw status + data bytes (no delta time). */
  bytes: number[];
};

/** Append a note-on / note-off pair spanning `[startTick, startTick+duration)`. */
function pushNote(
  events: TrackEvent[],
  channel: number,
  noteNumber: number,
  startTick: number,
  durationTicks: number
): void {
  const ch = channel & 0x0f;
  events.push({
    tick: startTick,
    order: 1,
    bytes: [0x90 | ch, noteNumber & 0x7f, NOTE_VELOCITY]
  });
  events.push({
    tick: startTick + durationTicks,
    order: 0,
    bytes: [0x80 | ch, noteNumber & 0x7f, 0]
  });
}

/** Convert absolute-timed events into a delta-timed "MTrk" chunk. */
function eventsToTrackChunk(events: TrackEvent[]): number[] {
  const sorted = [...events].sort((a, b) =>
    a.tick === b.tick ? a.order - b.order : a.tick - b.tick
  );

  const body: number[] = [];
  let previousTick = 0;
  for (const event of sorted) {
    const delta = event.tick - previousTick;
    body.push(...writeVarLen(delta));
    body.push(...event.bytes);
    previousTick = event.tick;
  }

  // End-of-track meta event.
  body.push(...writeVarLen(0), 0xff, 0x2f, 0x00);
  return chunk("MTrk", body);
}

/** Parse a meter string like "4/4" into numerator/denominator, default 4/4. */
function parseMeter(meter: string): { numerator: number; denominator: number } {
  const match = /^\s*(\d+)\s*\/\s*(\d+)\s*$/.exec(meter ?? "");
  if (!match) {
    return { numerator: 4, denominator: 4 };
  }

  const numerator = Number.parseInt(match[1], 10);
  const denominator = Number.parseInt(match[2], 10);
  if (numerator <= 0 || denominator <= 0) {
    return { numerator: 4, denominator: 4 };
  }

  return { numerator, denominator };
}

/** Build the tempo / time-signature / end-of-track meta track (track 0). */
function buildMetaTrack(sketch: SongSketch): number[] {
  const body: number[] = [];

  // Tempo meta: FF 51 03 tttttt (microseconds per quarter note).
  const bpm = sketch.bpm > 0 ? sketch.bpm : 120;
  const microsPerQuarter = Math.round(60000000 / bpm);
  body.push(...writeVarLen(0), 0xff, 0x51, 0x03);
  body.push(
    (microsPerQuarter >>> 16) & 0xff,
    (microsPerQuarter >>> 8) & 0xff,
    microsPerQuarter & 0xff
  );

  // Time signature meta: FF 58 04 nn dd cc bb.
  // dd is the power-of-two denominator exponent (e.g. 4 -> 2 because 2^2 = 4).
  const { numerator, denominator } = parseMeter(sketch.meter);
  const denominatorPower = Math.max(0, Math.round(Math.log2(denominator)));
  body.push(...writeVarLen(0), 0xff, 0x58, 0x04);
  body.push(numerator & 0xff, denominatorPower & 0xff, 24, 8);

  // End-of-track meta.
  body.push(...writeVarLen(0), 0xff, 0x2f, 0x00);
  return chunk("MTrk", body);
}

/** Build a monophonic note track (melody / bass) on the given channel. */
function buildNoteTrack(notes: string[], channel: number): number[] {
  const events: TrackEvent[] = [];
  notes.forEach((noteName, index) => {
    const startTick = index * TICKS_PER_QUARTER;
    const noteNumber = midiNoteNumber(noteName);
    if (noteNumber !== null) {
      pushNote(events, channel, noteNumber, startTick, TICKS_PER_QUARTER);
    }
  });
  return eventsToTrackChunk(events);
}

/** Build the chord track: all chord tones sound simultaneously per beat. */
function buildChordTrack(chords: string[], channel: number): number[] {
  const events: TrackEvent[] = [];
  chords.forEach((roman, index) => {
    const startTick = index * TICKS_PER_QUARTER;
    const tones = romanChordNotes[roman];
    if (!tones) {
      // Unknown numeral: emit a rest (advance time, no notes).
      return;
    }

    for (const tone of tones) {
      const noteNumber = midiNoteNumber(tone);
      if (noteNumber !== null) {
        pushNote(events, channel, noteNumber, startTick, TICKS_PER_QUARTER);
      }
    }
  });
  return eventsToTrackChunk(events);
}

/** Build the percussion track from the 4-row drum grid on channel 9. */
function buildDrumTrack(rows: boolean[][], channel: number): number[] {
  const events: TrackEvent[] = [];
  rows.forEach((row, rowIndex) => {
    const noteNumber = DRUM_NOTE_NUMBERS[rowIndex];
    if (noteNumber === undefined) {
      return;
    }

    row.forEach((hit, stepIndex) => {
      if (!hit) {
        return;
      }
      const startTick = stepIndex * TICKS_PER_QUARTER;
      pushNote(events, channel, noteNumber, startTick, TICKS_PER_QUARTER);
    });
  });
  return eventsToTrackChunk(events);
}

/**
 * Encode a {@link SongSketch} into a valid SMF format 1 byte stream.
 *
 * Emits the meta track plus one track each for melody, bass, chords, and drums.
 */
export function sketchToMidi(sketch: SongSketch): Uint8Array {
  const trackChunks: number[][] = [];

  trackChunks.push(buildMetaTrack(sketch));
  trackChunks.push(buildNoteTrack(sketch.tracks.melody, 0));
  trackChunks.push(buildNoteTrack(sketch.tracks.bass, 1));
  trackChunks.push(buildChordTrack(sketch.tracks.chords, 2));
  trackChunks.push(buildDrumTrack(sketch.tracks.drums, 9));

  // Header chunk: format 1, ntracks, division (ticks per quarter note).
  const headerBody = [
    ...writeUint16(1),
    ...writeUint16(trackChunks.length),
    ...writeUint16(TICKS_PER_QUARTER)
  ];

  const bytes: number[] = [...chunk("MThd", headerBody)];
  for (const trackChunk of trackChunks) {
    bytes.push(...trackChunk);
  }

  return new Uint8Array(bytes);
}

/**
 * Wrap the encoded MIDI bytes in a `Blob` of type "audio/midi".
 *
 * Constructs the Blob only; it performs no DOM access and is safe in any
 * environment that provides the `Blob` global.
 */
export function downloadMidiBlob(sketch: SongSketch): Blob {
  const bytes = sketchToMidi(sketch);
  return new Blob([bytes], { type: "audio/midi" });
}
