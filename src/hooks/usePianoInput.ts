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

function matchesSourceScope(source: string, scope: string): boolean {
  return source === scope || source.startsWith(`${scope}:`);
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
  const noteSourcesRef = useRef(new Map<string, Set<string>>());
  const sustainedNoteSourcesRef = useRef(new Map<string, Set<string>>());
  const sustainSourcesRef = useRef(new Set<string>());
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
    (note: string, velocity = 0.8, source = "manual") => {
      const sources = noteSourcesRef.current.get(note) ?? new Set<string>();
      if (sources.has(source)) {
        return;
      }

      const alreadyHeld = sources.size > 0;
      sources.add(source);
      noteSourcesRef.current.set(note, sources);
      const sustainedSources = sustainedNoteSourcesRef.current.get(note);
      sustainedSources?.forEach((sustainSource) => {
        if (source === sustainSource || source.startsWith(`${sustainSource}:`)) {
          sustainedSources.delete(sustainSource);
        }
      });
      if (sustainedSources?.size === 0) {
        sustainedNoteSourcesRef.current.delete(note);
      }
      if (alreadyHeld) {
        return;
      }

      activeNotesRef.current.add(note);
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
    (note: string, source = "manual") => {
      const sources = noteSourcesRef.current.get(note);
      if (!sources?.delete(source)) {
        return;
      }

      const sustainedSources = sustainedNoteSourcesRef.current.get(note) ?? new Set<string>();
      sustainSourcesRef.current.forEach((sustainSource) => {
        if (matchesSourceScope(source, sustainSource)) {
          sustainedSources.add(sustainSource);
        }
      });
      if (sustainedSources.size > 0) {
        sustainedNoteSourcesRef.current.set(note, sustainedSources);
      }
      if (sources.size > 0) {
        return;
      }

      noteSourcesRef.current.delete(note);
      onNoteOffRef.current?.(note);
      if ((sustainedNoteSourcesRef.current.get(note)?.size ?? 0) > 0) {
        return;
      }

      activeNotesRef.current.delete(note);
      syncActiveNotes();
      triggerNoteRelease(note, { voiceId: "keys" });
    },
    [syncActiveNotes]
  );

  const sustainOn = useCallback((source = "manual") => {
    sustainSourcesRef.current.add(source);
    setSustain(true);
  }, []);

  const sustainOff = useCallback((source = "manual") => {
    sustainSourcesRef.current.delete(source);
    setSustain(sustainSourcesRef.current.size > 0);
    let changed = false;
    sustainedNoteSourcesRef.current.forEach((sources, note) => {
      sources.delete(source);
      if (sources.size > 0) {
        return;
      }

      sustainedNoteSourcesRef.current.delete(note);
      if ((noteSourcesRef.current.get(note)?.size ?? 0) > 0) {
        return;
      }

      activeNotesRef.current.delete(note);
      triggerNoteRelease(note, { voiceId: "keys" });
      changed = true;
    });
    if (changed) {
      syncActiveNotes();
    }
  }, [syncActiveNotes]);

  const releaseSource = useCallback(
    (source: string) => {
      let changed = false;
      let sustainChanged = false;

      sustainSourcesRef.current.forEach((candidate) => {
        if (matchesSourceScope(candidate, source)) {
          sustainSourcesRef.current.delete(candidate);
          sustainChanged = true;
        }
      });
      sustainedNoteSourcesRef.current.forEach((sources, note) => {
        sources.forEach((candidate) => {
          if (matchesSourceScope(candidate, source)) {
            sources.delete(candidate);
          }
        });
        if (sources.size === 0) {
          sustainedNoteSourcesRef.current.delete(note);
        }
      });
      noteSourcesRef.current.forEach((sources, note) => {
        let removed = false;
        sources.forEach((candidate) => {
          if (matchesSourceScope(candidate, source)) {
            sources.delete(candidate);
            removed = true;
          }
        });
        if (!removed || sources.size > 0) {
          return;
        }

        noteSourcesRef.current.delete(note);
        onNoteOffRef.current?.(note);
      });
      activeNotesRef.current.forEach((note) => {
        if (
          (noteSourcesRef.current.get(note)?.size ?? 0) > 0 ||
          (sustainedNoteSourcesRef.current.get(note)?.size ?? 0) > 0
        ) {
          return;
        }

        activeNotesRef.current.delete(note);
        triggerNoteRelease(note, { voiceId: "keys" });
        changed = true;
      });
      if (sustainChanged) {
        setSustain(sustainSourcesRef.current.size > 0);
      }
      if (changed) {
        syncActiveNotes();
      }
    },
    [syncActiveNotes]
  );

  const releaseAll = useCallback(() => {
    releaseAllLiveNotes();
    activeNotesRef.current.clear();
    noteSourcesRef.current.clear();
    sustainedNoteSourcesRef.current.clear();
    sustainSourcesRef.current.clear();
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
    (note: string, source = "manual") => {
      if (noteSourcesRef.current.get(note)?.has(source)) {
        noteOff(note, source);
      } else {
        noteOn(note, 0.8, source);
      }
    },
    [noteOff, noteOn]
  );

  const midi = useMidiInput({
    onNoteOn: (note, velocity, source) => noteOn(note, velocity, source),
    onNoteOff: (note, source) => noteOff(note, source),
    onDisconnect: releaseSource,
    onSustain: (enabled, source) => {
      if (enabled) {
        sustainOn(source);
      } else {
        sustainOff(source);
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
        noteOn(`${pitchClass}${octave}`, 0.8, `qwerty:${key}`);
      } else if (key === "z") {
        event.preventDefault();
        shiftOctave(-1);
      } else if (key === "x") {
        event.preventDefault();
        shiftOctave(1);
      } else if (event.key === " " && event.target === event.currentTarget) {
        event.preventDefault();
        sustainOn("qwerty");
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
        noteOff(`${pitchClass}${octave}`, `qwerty:${key}`);
      } else if (key === "z" || key === "x") {
        event.preventDefault();
      } else if (event.key === " " && event.target === event.currentTarget) {
        event.preventDefault();
        sustainOff("qwerty");
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
