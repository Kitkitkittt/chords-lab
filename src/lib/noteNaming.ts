/**
 * Alternate note-naming display (Phase 7 i18n).
 *
 * Converts a standard English note name (pitch class, optionally with octave)
 * into other naming systems used around the world:
 *
 *  - `english`   identity (C D E F G A B)
 *  - `fixed-do`  fixed-do solfège (Do Re Mi Fa Sol La Si)
 *  - `german`    German convention where B natural is written `H` and the
 *                English `Bb` is written `B`.
 *
 * Parsing is delegated to tonal's `Note.get`, which returns `letter`, `acc`
 * ("#"/"b"), `pc`, and a numeric `oct` (undefined when no octave is present).
 * Invalid input is passed through unchanged so callers can render gracefully.
 */
import { Note } from "tonal";

export type NoteNamingSystem = "english" | "fixed-do" | "german";

/** All supported naming-system ids. */
export const NOTE_NAMING_SYSTEMS: NoteNamingSystem[] = [
  "english",
  "fixed-do",
  "german"
];

/** Human-readable label for a naming system. */
export function noteNamingLabel(system: NoteNamingSystem): string {
  switch (system) {
    case "english":
      return "English (C D E)";
    case "fixed-do":
      return "Solfège (Do Re Mi)";
    case "german":
      return "German (C D E… H)";
    default:
      return system;
  }
}

/** Fixed-do solfège syllable per base letter. */
const SOLFEGE_BY_LETTER: Record<string, string> = {
  C: "Do",
  D: "Re",
  E: "Mi",
  F: "Fa",
  G: "Sol",
  A: "La",
  B: "Si"
};

/** Normalize tonal's accidental to simple ASCII "#"/"b" (or ""). */
function asciiAccidental(acc: string): string {
  if (acc.includes("#") || acc.includes("♯")) return "#".repeat(acc.length);
  if (acc.includes("b") || acc.includes("♭")) return "b".repeat(acc.length);
  return "";
}

/** Octave suffix for a parsed note, or "" when no octave is present. */
function octaveSuffix(oct: number | undefined): string {
  return typeof oct === "number" ? String(oct) : "";
}

/**
 * Convert a note like "C4", "Eb", "F#5", or "Bb3" into the target naming
 * system. Accidentals and octave (when present) are preserved. Invalid input
 * is returned unchanged.
 */
export function toNamingSystem(note: string, system: NoteNamingSystem): string {
  const parsed = Note.get(note);
  if (parsed.empty) return note;

  const letter = parsed.letter;
  const acc = asciiAccidental(parsed.acc);
  const oct = octaveSuffix(parsed.oct);

  switch (system) {
    case "fixed-do": {
      const syllable = SOLFEGE_BY_LETTER[letter] ?? letter;
      return `${syllable}${acc}${oct}`;
    }
    case "german": {
      if (letter === "B" && acc === "") return `H${oct}`;
      if (letter === "B" && acc === "b") return `B${oct}`;
      return `${letter}${acc}${oct}`;
    }
    case "english":
    default:
      return `${letter}${acc}${oct}`;
  }
}

/**
 * Convert a list of pitch classes (octaves stripped) and join them with
 * spaces, e.g. `["C","E","G"]` in fixed-do -> "Do Mi Sol".
 */
export function describePitchClasses(
  pcs: string[],
  system: NoteNamingSystem
): string {
  return pcs
    .map((pc) => {
      const parsed = Note.get(pc);
      const bare = parsed.empty ? pc : parsed.pc;
      return toNamingSystem(bare, system);
    })
    .join(" ");
}
