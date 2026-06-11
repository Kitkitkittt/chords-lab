/**
 * First-species counterpoint checker (Phase 6).
 *
 * Pure, framework-free module that evaluates two voices against the basic
 * rules of first-species (note-against-note) counterpoint. Each voice is an
 * array of note names, one note per measure, and both arrays must share the
 * same length. The `counterLine` is conventionally the upper voice and the
 * `cantusFirmus` the lower, though the vertical-interval checks use absolute
 * semitone distance so ordering does not affect dissonance detection.
 *
 * Interval reasoning leans on tonal's `Note.midi`, matching the rest of the
 * theory layer (see src/lib/theory.ts which also derives motion from MIDI).
 */
import { Note } from "tonal";

export type CounterpointIssue = {
  measure: number;
  rule: string;
  detail: string;
  severity: "error" | "warning";
};

export type CounterpointReport = {
  issues: CounterpointIssue[];
  consonantCount: number;
  measures: number;
  isValid: boolean;
};

/**
 * Absolute semitone distance between two notes (abs of the midi difference).
 * Returns null when either note name is invalid.
 */
export function verticalIntervalSemitones(
  lower: string,
  upper: string
): number | null {
  const lowerMidi = Note.midi(lower);
  const upperMidi = Note.midi(upper);

  if (typeof lowerMidi !== "number" || typeof upperMidi !== "number") {
    return null;
  }

  return Math.abs(upperMidi - lowerMidi);
}

/**
 * Whether a vertical interval is consonant in two-voice first species.
 * Consonant pitch-class intervals (mod 12): unison/octave (0), minor third (3),
 * major third (4), perfect fifth (7), minor sixth (8), major sixth (9).
 * The perfect fourth (5) is treated as dissonant, per standard practice.
 */
export function isConsonant(semitones: number): boolean {
  const pitchClass = ((semitones % 12) + 12) % 12;
  return (
    pitchClass === 0 ||
    pitchClass === 3 ||
    pitchClass === 4 ||
    pitchClass === 7 ||
    pitchClass === 8 ||
    pitchClass === 9
  );
}

/** Perfect consonances usable at structural boundaries: unison/octave or P5. */
function isPerfectConsonance(semitones: number): boolean {
  const pitchClass = ((semitones % 12) + 12) % 12;
  return pitchClass === 0 || pitchClass === 7;
}

/** Melodic motion in semitones between two successive notes (null if invalid). */
function melodicMotion(from: string, to: string): number | null {
  const fromMidi = Note.midi(from);
  const toMidi = Note.midi(to);

  if (typeof fromMidi !== "number" || typeof toMidi !== "number") {
    return null;
  }

  return toMidi - fromMidi;
}

/**
 * Evaluate a first-species counterpoint exercise and return a report of
 * findings. Both voices must be the same length (= number of measures).
 */
export function checkFirstSpecies(
  cantusFirmus: string[],
  counterLine: string[]
): CounterpointReport {
  const issues: CounterpointIssue[] = [];

  // Rule 1: length mismatch is a fatal error; report and return early.
  if (cantusFirmus.length !== counterLine.length) {
    issues.push({
      measure: 0,
      rule: "length",
      detail: `Voices differ in length: cantus firmus has ${cantusFirmus.length} measures, counter line has ${counterLine.length}.`,
      severity: "error"
    });

    return {
      issues,
      consonantCount: 0,
      measures: Math.max(cantusFirmus.length, counterLine.length),
      isValid: false
    };
  }

  const measures = cantusFirmus.length;
  const verticals: Array<number | null> = [];
  let consonantCount = 0;

  // Rule 2: per-measure consonance / dissonance.
  for (let i = 0; i < measures; i += 1) {
    const semitones = verticalIntervalSemitones(cantusFirmus[i], counterLine[i]);
    verticals.push(semitones);

    if (semitones === null) {
      issues.push({
        measure: i + 1,
        rule: "invalid-note",
        detail: `Could not parse one or both notes in measure ${i + 1}.`,
        severity: "error"
      });
      continue;
    }

    if (isConsonant(semitones)) {
      consonantCount += 1;
    } else {
      issues.push({
        measure: i + 1,
        rule: "dissonance",
        detail: `Dissonant vertical interval of ${semitones} semitones in measure ${i + 1}.`,
        severity: "error"
      });
    }
  }

  // Rule 3: first and last measures should be perfect consonances.
  if (measures > 0) {
    const first = verticals[0];
    if (first !== null && !isPerfectConsonance(first)) {
      issues.push({
        measure: 1,
        rule: "boundary",
        detail: "First measure should be a perfect consonance (unison, fifth, or octave).",
        severity: "warning"
      });
    }

    const last = verticals[measures - 1];
    if (last !== null && !isPerfectConsonance(last)) {
      issues.push({
        measure: measures,
        rule: "boundary",
        detail: "Last measure should be a perfect consonance (unison, fifth, or octave).",
        severity: "warning"
      });
    }
  }

  // Rule 4: parallel perfect fifths or octaves between consecutive measures.
  for (let i = 0; i < measures - 1; i += 1) {
    const current = verticals[i];
    const next = verticals[i + 1];

    if (current === null || next === null) {
      continue;
    }

    const currentPc = ((current % 12) + 12) % 12;
    const nextPc = ((next % 12) + 12) % 12;
    const bothFifths = currentPc === 7 && nextPc === 7;
    const bothOctaves = currentPc === 0 && nextPc === 0;

    if (!bothFifths && !bothOctaves) {
      continue;
    }

    const cantusMotion = melodicMotion(cantusFirmus[i], cantusFirmus[i + 1]);
    const counterMotion = melodicMotion(counterLine[i], counterLine[i + 1]);

    if (
      cantusMotion !== null &&
      counterMotion !== null &&
      cantusMotion !== 0 &&
      counterMotion !== 0
    ) {
      issues.push({
        measure: i + 2,
        rule: "parallel-perfect",
        detail: `Parallel ${bothFifths ? "fifths" : "octaves"} between measures ${i + 1} and ${i + 2}.`,
        severity: "error"
      });
    }
  }

  const isValid = !issues.some((issue) => issue.severity === "error");

  return { issues, consonantCount, measures, isValid };
}
