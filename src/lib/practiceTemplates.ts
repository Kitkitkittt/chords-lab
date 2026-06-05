import type {
  PracticeDifficulty,
  PracticeInputMode,
  PracticePrompt,
  PracticeRenderSpec,
  PracticeSessionConfig
} from "./practiceEngine";
import type { GeneratedPracticeModuleId } from "./practiceGenerators";

export type ValidationRule = {
  id: string;
  summary: string;
  validate: (prompt: PracticePrompt, selected: string[]) => boolean;
};

export type PromptTemplate = {
  id: string;
  moduleId: GeneratedPracticeModuleId;
  difficulty: PracticeDifficulty;
  topicTags: string[];
  inputMode: PracticeInputMode;
  skillTargets: string[];
  buildPrompt: (config: PracticeSessionConfig, index: number) => PracticePrompt;
  validateAnswer: ValidationRule["validate"];
  buildExplanation: (prompt: PracticePrompt) => string;
  renderSpec: (prompt: PracticePrompt) => PracticeRenderSpec | undefined;
};

export type GeneratorFamily = {
  id: string;
  moduleId: GeneratedPracticeModuleId;
  templates: PromptTemplate[];
};

const moduleTemplateIds: Record<GeneratedPracticeModuleId, string[]> = {
  pitch: [
    "letter-from-staff",
    "octave-match",
    "keyboard-letter",
    "enharmonic-name",
    "pitch-direction",
    "middle-c-anchor",
    "register-label",
    "natural-note-sort",
    "repeat-letter",
    "sound-to-symbol"
  ],
  staff: [
    "treble-position",
    "bass-position",
    "ledger-line",
    "grand-staff-match",
    "keyboard-to-staff",
    "staff-to-keyboard",
    "line-or-space",
    "clef-anchor",
    "mixed-clef",
    "octave-transfer"
  ],
  scales: [
    "major-build",
    "natural-minor-build",
    "harmonic-minor-build",
    "melodic-minor-build",
    "mode-build",
    "pentatonic-build",
    "whole-tone-build",
    "chromatic-build",
    "key-signature",
    "scale-degree"
  ],
  intervals: [
    "generic-size",
    "specific-quality",
    "staff-interval",
    "keyboard-interval",
    "inversion",
    "melodic-ear",
    "harmonic-ear",
    "compound-interval",
    "enharmonic-interval",
    "interval-spelling"
  ],
  chords: [
    "major-triad",
    "minor-triad",
    "diminished-triad",
    "augmented-triad",
    "first-inversion",
    "second-inversion",
    "dominant-seventh",
    "minor-seventh",
    "major-seventh",
    "voicing"
  ],
  harmony: [
    "roman-numeral",
    "authentic-cadence",
    "plagal-cadence",
    "half-cadence",
    "deceptive-cadence",
    "circle-progression",
    "pop-loop",
    "predominant-dominant-tonic",
    "phrase-analysis",
    "form-label"
  ],
  rhythm: [
    "quarter-grid",
    "eighth-grid",
    "rest-placement",
    "dot-duration",
    "tie-duration",
    "triplet-grid",
    "compound-meter",
    "odd-meter",
    "syncopation",
    "rhythm-dictation"
  ],
  ear: [
    "interval-up",
    "interval-down",
    "triad-quality",
    "seventh-quality",
    "scale-color",
    "cadence-type",
    "rhythm-pattern",
    "melodic-memory",
    "bass-motion",
    "chord-progression"
  ],
  instruments: [
    "piano-chord-tones",
    "piano-scale-degrees",
    "guitar-open-shape",
    "guitar-fret-note",
    "bass-root-fifth",
    "bass-arpeggio",
    "drum-backbeat",
    "drum-groove-repair",
    "voice-solfege",
    "ukulele-shape"
  ]
};

const templateValidator: ValidationRule = {
  id: "exact-or-ordered-match",
  summary: "Compares selected answers to the prompt answer, respecting order when needed.",
  validate(prompt, selected) {
    const ordered =
      prompt.kind === "ordered" ||
      prompt.kind === "grid" ||
      prompt.inputMode === "harmony-board" ||
      prompt.inputMode === "analysis-board";
    const left = ordered ? prompt.answer : [...prompt.answer].sort();
    const right = ordered ? selected : [...selected].sort();

    return left.length === right.length && left.every((item, index) => item === right[index]);
  }
};

function createTemplate(
  moduleId: GeneratedPracticeModuleId,
  id: string,
  index: number
): PromptTemplate {
  return {
    id,
    moduleId,
    difficulty: index > 6 ? "early-intermediate" : "beginner",
    topicTags: [id],
    inputMode:
      moduleId === "staff"
        ? "staff-click"
        : moduleId === "instruments"
          ? index < 2
            ? "instrument-board"
            : index < 4
              ? "fretboard"
              : index < 6
                ? "song-arranger"
                : index < 8
                  ? "drum-pad"
                  : "voice-range"
        : moduleId === "rhythm"
          ? "rhythm-grid"
          : moduleId === "harmony"
            ? index > 7
              ? "analysis-board"
              : "harmony-board"
            : moduleId === "ear"
              ? "listening"
              : moduleId === "chords"
                ? "piano-roll"
                : moduleId === "scales"
                  ? "sequence"
                  : "choice",
    skillTargets: [id],
    buildPrompt() {
      throw new Error("Prompt templates are metadata; generated prompts use module factories.");
    },
    validateAnswer: templateValidator.validate,
    buildExplanation: (prompt) => prompt.explanation,
    renderSpec: (prompt) => prompt.renderSpec
  };
}

export const generatorFamilies: GeneratorFamily[] = Object.entries(
  moduleTemplateIds
).map(([moduleId, templateIds]) => ({
  id: `${moduleId}-family-v4`,
  moduleId: moduleId as GeneratedPracticeModuleId,
  templates: templateIds.map((id, index) =>
    createTemplate(moduleId as GeneratedPracticeModuleId, id, index)
  )
}));

export function getPromptTemplatesForModule(
  moduleId: GeneratedPracticeModuleId
): PromptTemplate[] {
  return (
    generatorFamilies.find((family) => family.moduleId === moduleId)
      ?.templates ?? []
  );
}

export function countTemplatesForModule(
  moduleId: GeneratedPracticeModuleId
): number {
  return getPromptTemplatesForModule(moduleId).length;
}

export function validatePromptWithTemplate(
  prompt: PracticePrompt,
  selected: string[]
): boolean {
  return templateValidator.validate(prompt, selected);
}

export function validateRhythmMeasure(
  tokens: string[],
  beatsPerMeasure = 4
): { valid: boolean; totalBeats: number } {
  const values: Record<string, number> = {
    whole: 4,
    half: 2,
    "dotted-half": 3,
    quarter: 1,
    "dotted-quarter": 1.5,
    eighth: 0.5,
    "eighth-rest": 0.5,
    "quarter-rest": 1,
    triplet: 1 / 3,
    tie: 0,
    hit: 1,
    rest: 1
  };
  const totalBeats = tokens.reduce(
    (total, token) => total + (values[token] ?? 0),
    0
  );

  return {
    valid: Math.abs(totalBeats - beatsPerMeasure) < 0.001,
    totalBeats
  };
}
