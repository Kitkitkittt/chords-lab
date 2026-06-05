import type { PlaybackPattern } from "./audioEngine";
import type {
  ChordShape,
  DegreeHighlight,
  InstrumentId,
  InteractionPulseState
} from "../types/course";

export type PracticeAnswerKind =
  | "single"
  | "multi"
  | "ordered"
  | "grid"
  | "note-builder"
  | "chord-builder"
  | "listening";

export type PracticeDifficulty = "beginner" | "early-intermediate";

export type PracticeInputMode =
  | "choice"
  | "sequence"
  | "staff-click"
  | "rhythm-grid"
  | "piano-roll"
  | "listening"
  | "harmony-board"
  | "analysis-board"
  | "instrument-board"
  | "fretboard"
  | "drum-pad"
  | "voice-range"
  | "song-arranger";

export type StaffClickPosition = {
  note: string;
  label: string;
  step: number;
  clef: "treble" | "bass";
};

export type RhythmToken = {
  value: string;
  label: string;
  beats: number;
};

export type PracticeRenderSpec =
  | {
      type: "staff";
      clef?: "treble" | "bass";
      notation?: string;
      positions?: StaffClickPosition[];
    }
  | {
      type: "keyboard";
      notes: string[];
      mode?: "scale" | "chord" | "free";
      enharmonicWarnings?: string[];
    }
  | {
      type: "rhythm";
      beats: string[];
      subdivision?: "quarter" | "eighth" | "triplet";
      meter?: string;
      tokens?: RhythmToken[];
      targetBeats?: number;
    }
  | {
      type: "audio";
      notes: string[];
      mode?: "sequence" | "chord" | "rhythm";
    }
  | {
      type: "harmony";
      numerals: string[];
      key: string;
      slots?: string[];
    }
  | {
      type: "analysis";
      labels: string[];
      key?: string;
      meter?: string;
      cadence?: string;
      form?: string;
    }
  | {
      type: "instrument";
      instrumentId: InstrumentId;
      highlightedNotes: string[];
      chordShape?: ChordShape;
      scalePattern?: DegreeHighlight[];
      rhythmPattern?: string[];
      degreeLabels?: DegreeHighlight[];
      playbackPattern?: PlaybackPattern;
    };

export type PracticeSessionConfig = {
  moduleId: string;
  difficulty: PracticeDifficulty;
  promptCount: number;
  clef: "treble" | "bass" | "mixed";
  key: string;
  topic: string;
  audioEnabled: boolean;
  seed: string;
};

export type PracticeSessionResult = {
  correct: number;
  attempted: number;
  missedPromptIds: string[];
  skillDeltas: Record<string, number>;
};

export type InteractionHint = {
  shortHint: string;
  selectedExplanation: string;
  retryTarget: string;
  linkedPracticeRoute: string;
  linkedInstrumentRoute?: string;
};

export type PracticePrompt = {
  id: string;
  moduleId: string;
  kind: PracticeAnswerKind;
  question: string;
  choices: string[];
  answer: string[];
  explanation: string;
  citationLabel?: string;
  generatorId?: string;
  difficulty?: PracticeDifficulty;
  topicTags?: string[];
  sourceLabels?: string[];
  skillTargets?: string[];
  inputMode?: PracticeInputMode;
  renderSpec?: PracticeRenderSpec;
  notation?: string;
  clef?: "treble" | "bass";
  timeSignature?: string;
  keyboardNotes?: string[];
  audioNotes?: string[];
  playbackPattern?: PlaybackPattern;
  visualLabel?: string;
  interactionHint?: InteractionHint;
};

export type PracticeFeedback = {
  status: "idle" | "correct" | "incorrect";
  message: string;
  expected: string[];
  selected: string[];
  pulseState: InteractionPulseState;
  feedbackTone?: "success" | "correction";
};

export const idlePracticeFeedback: PracticeFeedback = {
  status: "idle",
  message: "",
  expected: [],
  selected: [],
  pulseState: "idle"
};

function normalizeAnswer(items: string[]): string[] {
  return Array.from(new Set(items)).sort((a, b) => a.localeCompare(b));
}

function isOrderedKind(kind: PracticeAnswerKind): boolean {
  return kind === "ordered" || kind === "grid";
}

function exactMatch(expected: string[], selected: string[]): boolean {
  return (
    expected.length === selected.length &&
    expected.every((item, index) => item === selected[index])
  );
}

export function scorePracticeAnswer(
  prompt: PracticePrompt,
  selected: string[]
): PracticeFeedback {
  const isCorrect = isOrderedKind(prompt.kind)
    ? exactMatch(prompt.answer, selected)
    : exactMatch(normalizeAnswer(prompt.answer), normalizeAnswer(selected));

  return {
    status: isCorrect ? "correct" : "incorrect",
    message: isCorrect
      ? prompt.explanation
      : `Expected ${prompt.answer.join(" ")}. ${prompt.explanation}`,
    expected: prompt.answer,
    selected,
    pulseState: isCorrect ? "correct" : "incorrect",
    feedbackTone: isCorrect ? "success" : "correction"
  };
}

export function getNextPracticePrompt(
  prompts: PracticePrompt[],
  currentId?: string
): PracticePrompt | undefined {
  if (prompts.length === 0) {
    return undefined;
  }

  const currentIndex = prompts.findIndex((prompt) => prompt.id === currentId);
  const nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % prompts.length;
  return prompts[nextIndex];
}

export function formatPracticeScore(result?: {
  correct: number;
  attempted: number;
}): string {
  if (!result || result.attempted === 0) {
    return "No attempts yet";
  }

  return `${result.correct}/${result.attempted} correct`;
}
