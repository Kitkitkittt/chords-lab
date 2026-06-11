import { describe, expect, it } from "vitest";
import {
  isMusicalNoteEvent,
  midiToNoteName,
  parseMidiMessage
} from "./midiInput";

describe("midiInput lib", () => {
  describe("midiToNoteName", () => {
    it("converts middle C", () => {
      expect(midiToNoteName(60)).toBe("C4");
    });

    it("returns null for out-of-range values", () => {
      expect(midiToNoteName(-1)).toBe(null);
      expect(midiToNoteName(200)).toBe(null);
    });

    it("returns null for non-integers", () => {
      expect(midiToNoteName(60.5)).toBe(null);
    });
  });

  describe("parseMidiMessage", () => {
    it("parses note-on with velocity", () => {
      const event = parseMidiMessage([0x90, 60, 100]);
      expect(event.type).toBe("note-on");
      expect(event.note).toBe("C4");
      expect(event.midi).toBe(60);
      expect(event.channel).toBe(0);
      expect(event.velocity).toBeCloseTo(100 / 127);
    });

    it("treats note-on with velocity 0 as note-off", () => {
      const event = parseMidiMessage([0x90, 60, 0]);
      expect(event.type).toBe("note-off");
    });

    it("parses note-off", () => {
      const event = parseMidiMessage([0x80, 60, 0]);
      expect(event.type).toBe("note-off");
    });

    it("reads channel and note from status byte", () => {
      const event = parseMidiMessage([0x92, 64, 80]);
      expect(event.channel).toBe(2);
      expect(event.note).toBe("E4");
    });

    it("parses sustain pedal on and off", () => {
      const on = parseMidiMessage([0xb0, 64, 127]);
      expect(on.type).toBe("sustain");
      expect(on.sustainOn).toBe(true);

      const off = parseMidiMessage([0xb0, 64, 0]);
      expect(off.type).toBe("sustain");
      expect(off.sustainOn).toBe(false);
    });

    it("returns other for empty or unhandled messages", () => {
      expect(parseMidiMessage([]).type).toBe("other");
      expect(parseMidiMessage([0xf0]).type).toBe("other");
    });

    it("accepts a Uint8Array", () => {
      const event = parseMidiMessage(new Uint8Array([0x90, 60, 100]));
      expect(event.type).toBe("note-on");
      expect(event.note).toBe("C4");
      expect(event.midi).toBe(60);
    });
  });

  describe("isMusicalNoteEvent", () => {
    it("is true for a note-on event", () => {
      expect(isMusicalNoteEvent(parseMidiMessage([0x90, 60, 100]))).toBe(true);
    });

    it("is false for a sustain event", () => {
      expect(isMusicalNoteEvent(parseMidiMessage([0xb0, 64, 127]))).toBe(false);
    });
  });
});
