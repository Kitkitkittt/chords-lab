import { useCallback, useEffect, useRef, useState, type FocusEvent, type KeyboardEvent } from "react";
import {
  releaseAllLiveNotes,
  triggerNoteAttack,
  triggerNoteRelease
} from "../lib/audioEngine";
import { useMidiInput } from "./useMidiInput";

type UsePianoInputOptions = {
  audioEnabled: boolean;
  onNoteOn?: (note: string, velocity: number) => void;
  onNoteOff?: (note: string) => void;
  initialOctave?: number;
};

const KEY_NOTES: Record<string, string> = {
  a: "C",
  w: "C#",
  s: "D",
  e: "D#",
  d: "E",
  f: "F",
  t: "F#",
  g: "G",
  y: "G#",
  h: "A",
  u: "A#",
  j: "B"
};

function clampOctave(octave: number): number {
  return Math.min(7, Math.max(1, octave));
}

export function usePianoInput({
  audioEnabled,
  onNoteOn,
  onNoteOff,
  initialOctave = 4
}: UsePianoInputOptions) {
  const [activeNotes, setActiveNotes] = useState<string[]>([]);
  const [octave, setOctave] = useState(() => clampOctave(initialOctave));
  const [sustain, setSustain] = useState(false);
  const [keyboardEnabled, setKeyboardEnabled] = useState(true);
  const activeNotesRef = useRef(new Set<string>());
  const sustainedNotesRef = useRef(new Set<string>());
  const sustainRef = useRef(false);
  const audioEnabledRef = useRef(audioEnabled);
  const onNoteOnRef = useRef(onNoteOn);
  const onNoteOffRef = useRef(onNoteOff);
  audioEnabledRef.current = audioEnabled;
  onNoteOnRef.current = onNoteOn;
  onNoteOffRef.current = onNoteOff;

  const syncActiveNotes = useCallback(() => {
    setActiveNotes([...activeNotesRef.current]);
  }, []);

  const noteOn = useCallback(
    (note: string, velocity = 0.8) => {
      if (activeNotesRef.current.has(note)) {
        return;
      }

      activeNotesRef.current.add(note);
      sustainedNotesRef.current.delete(note);
      syncActiveNotes();
      void triggerNoteAttack(note, {
        voiceId: "keys",
        audioEnabled: audioEnabledRef.current,
        velocity
      });
      onNoteOnRef.current?.(note, velocity);
    },
    [syncActiveNotes]
  );

  const noteOff = useCallback(
    (note: string) => {
      if (!activeNotesRef.current.has(note)) {
        return;
      }

      onNoteOffRef.current?.(note);
      if (sustainRef.current) {
        sustainedNotesRef.current.add(note);
        return;
      }

      activeNotesRef.current.delete(note);
      syncActiveNotes();
      triggerNoteRelease(note, { voiceId: "keys" });
    },
    [syncActiveNotes]
  );

  const sustainOn = useCallback(() => {
    sustainRef.current = true;
    setSustain(true);
  }, []);

  const sustainOff = useCallback(() => {
    sustainRef.current = false;
    setSustain(false);
    sustainedNotesRef.current.forEach((note) => {
      activeNotesRef.current.delete(note);
      triggerNoteRelease(note, { voiceId: "keys" });
    });
    sustainedNotesRef.current.clear();
    syncActiveNotes();
  }, [syncActiveNotes]);

  const releaseAll = useCallback(() => {
    releaseAllLiveNotes();
    activeNotesRef.current.clear();
    sustainedNotesRef.current.clear();
    sustainRef.current = false;
    setSustain(false);
    syncActiveNotes();
  }, [syncActiveNotes]);

  const shiftOctave = useCallback(
    (delta: number) => {
      releaseAll();
      setOctave((current) => clampOctave(current + delta));
    },
    [releaseAll]
  );

  const toggleNote = useCallback(
    (note: string) => {
      if (activeNotesRef.current.has(note)) {
        noteOff(note);
      } else {
        noteOn(note);
      }
    },
    [noteOff, noteOn]
  );

  const midi = useMidiInput({
    onNoteOn: noteOn,
    onNoteOff: noteOff,
    onDisconnect: releaseAll,
    onSustain: (enabled) => {
      if (enabled) {
        sustainOn();
      } else {
        sustainOff();
      }
    }
  });

  const keyboardHandlers = {
    onKeyDown(event: KeyboardEvent<HTMLElement>) {
      if (!keyboardEnabled || event.repeat) {
        return;
      }

      const key = event.key.toLowerCase();
      const pitchClass = KEY_NOTES[key];
      if (pitchClass) {
        event.preventDefault();
        noteOn(`${pitchClass}${octave}`);
      } else if (key === "z") {
        event.preventDefault();
        shiftOctave(-1);
      } else if (key === "x") {
        event.preventDefault();
        shiftOctave(1);
      } else if (event.key === " " && event.target === event.currentTarget) {
        event.preventDefault();
        sustainOn();
      }
    },
    onKeyUp(event: KeyboardEvent<HTMLElement>) {
      if (!keyboardEnabled) {
        return;
      }

      const key = event.key.toLowerCase();
      const pitchClass = KEY_NOTES[key];
      if (pitchClass) {
        event.preventDefault();
        noteOff(`${pitchClass}${octave}`);
      } else if (key === "z" || key === "x") {
        event.preventDefault();
      } else if (event.key === " " && event.target === event.currentTarget) {
        event.preventDefault();
        sustainOff();
      }
    },
    onBlur(event: FocusEvent<HTMLElement>) {
      if (typeof Node !== "undefined" && event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) {
        return;
      }
      releaseAll();
    }
  };

  useEffect(() => releaseAll, [releaseAll]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        releaseAll();
      }
    };
    window.addEventListener("blur", releaseAll);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("blur", releaseAll);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [releaseAll]);

  return {
    activeNotes,
    octave,
    sustain,
    keyboardEnabled,
    setKeyboardEnabled,
    shiftOctave,
    noteOn,
    noteOff,
    toggleNote,
    sustainOn,
    sustainOff,
    releaseAll,
    keyboardHandlers,
    midi
  };
}
