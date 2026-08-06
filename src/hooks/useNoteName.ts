import { useContext, useMemo } from "react";
import type { NoteNamingSystem } from "../lib/noteNaming";
import { describePitchClasses, toNamingSystem } from "../lib/noteNaming";
import { ProgressContext } from "../state/progressContext";

const SYSTEMS: NoteNamingSystem[] = ["english", "fixed-do", "german"];

function activeSystem(value: unknown): NoteNamingSystem {
  return SYSTEMS.includes(value as NoteNamingSystem)
    ? (value as NoteNamingSystem)
    : "english";
}

export type NoteNameHelpers = {
  /** Active naming system, for callers that want to label or branch on it. */
  system: NoteNamingSystem;
  /** Render one note ("C4", "Bb") in the learner's chosen naming system. */
  noteName: (note: string) => string;
  /** Render a list of pitch classes as a space-joined string. */
  pitchList: (pitches: string[]) => string;
};

/**
 * Display-only bridge between the learner's `noteNaming` setting and the pure
 * converters in `lib/noteNaming`. Audio, storage, and answer checking keep using
 * English names — only what the learner reads changes.
 *
 * This reads the context directly rather than via `useProgress` so that a
 * keyboard rendered outside a ProgressProvider (isolated component tests,
 * future embeds) falls back to English instead of throwing.
 */
export function useNoteName(): NoteNameHelpers {
  const context = useContext(ProgressContext);
  const system = activeSystem(context?.progress.settings.noteNaming);

  return useMemo(
    () => ({
      system,
      noteName: (note: string) => toNamingSystem(note, system),
      pitchList: (pitches: string[]) => describePitchClasses(pitches, system)
    }),
    [system]
  );
}

