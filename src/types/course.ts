import type { ComponentType } from "react";

export type Citation = {
  label: string;
  url: string;
  licenseNote: string;
};

export type LessonMeta = {
  slug: string;
  title: string;
  moduleSlug: string;
  level: "beginner" | "intermediate";
  estimatedMinutes: number;
  outcomes: string[];
  prerequisites: string[];
  citations: Citation[];
  /** Canonical skill ids this lesson teaches (optional, additive). */
  skills?: string[];
};

export type Lesson = LessonMeta & {
  Component: ComponentType;
};

export type CourseModule = {
  slug: string;
  title: string;
  colorRole: "melody" | "rhythm" | "harmony";
  description: string;
  lessonSlugs: string[];
};

export type PracticeSessionHistory = {
  id: string;
  moduleId: string;
  configSummary: string;
  correct: number;
  attempted: number;
  missedPromptIds: string[];
  completedAt: string;
};

export type SkillMastery = {
  correct: number;
  attempted: number;
  ease: number;
  intervalDays: number;
  dueAt?: string;
  lapses: number;
  lastResult?: "correct" | "incorrect";
  lastPracticedAt?: string;
  reviewQueue: string[];
  /**
   * Optional FSRS-style scheduling fields (additive, V8 Wave 2). When present,
   * the adaptive scheduler uses a simplified FSRS model; when absent it falls
   * back to the legacy ease-based math so older saved progress keeps working.
   */
  stability?: number;
  difficulty?: number;
  reps?: number;
};

export type AdaptiveSkillState = SkillMastery;

export type ProgressExportBundle = {
  schemaVersion: 1;
  exportedAt: string;
  appVersion: string;
  progress: ProgressState;
};

export type ImportPreview = {
  valid: boolean;
  warnings: string[];
  lessonCount: number;
  sessionCount: number;
  sketchCount: number;
  skillCount: number;
};

export type InstrumentId =
  | "piano"
  | "guitar"
  | "bass"
  | "drums"
  | "voice"
  | "ukulele";

export type FretboardTuning = {
  instrumentId: Extract<InstrumentId, "guitar" | "bass" | "ukulele">;
  strings: string[];
  fretCount: number;
};

export type ChordShape = {
  id: string;
  instrumentId: InstrumentId;
  symbol: string;
  name: string;
  frets: Array<number | "x">;
  fingers: string[];
  root: string;
};

export type DegreeHighlight = {
  note: string;
  degree: string;
  role: "root" | "third" | "fifth" | "seventh" | "color" | "scale";
};

export type InstrumentProfile = {
  id: InstrumentId;
  title: string;
  family: "keys" | "strings" | "rhythm" | "voice";
  summary: string;
  defaultNotes: string[];
  practiceRoute: string;
  songLabRole: string;
  tuning?: FretboardTuning;
};

export type SongLabTrackType =
  | "drums"
  | "bass"
  | "chords"
  | "melody"
  | "voiceGuide";

export type MidiAdapterStatus = "planned" | "unavailable" | "connected";

export type ThemePreference = "system" | "light" | "dark";

export type NoteNamingPreference = "english" | "fixed-do" | "german";

export type RoutineStep = {
  kind: "review" | "module" | "play";
  moduleId?: string;
  label: string;
};

export type Routine = {
  id: string;
  name: string;
  steps: RoutineStep[];
  createdAt: string;
};

export type AppMode =
  | "idle"
  | "learning"
  | "drilling"
  | "reviewing"
  | "experimenting"
  | "instrumenting"
  | "playing";

export type ToastMessage = {
  id: string;
  tone: "info" | "success" | "warning" | "error";
  title: string;
  body?: string;
};

export type InteractionPulseState =
  | "idle"
  | "correct"
  | "incorrect"
  | "saved"
  | "playing"
  | "stopped"
  | "selected";

export type LessonCheckpointResult = {
  lessonSlug: string;
  correct: number;
  attempted: number;
  passed: boolean;
  missedPromptIds: string[];
};

export type ReviewPromptState = {
  consecutiveCorrect: number;
  lastResult: "correct" | "incorrect";
  lastAttemptedAt: string;
};

export type StoredReviewPrompt = {
  id: string;
  moduleId: string;
  kind:
    | "single"
    | "multi"
    | "ordered"
    | "grid"
    | "note-builder"
    | "chord-builder"
    | "listening";
  question: string;
  choices: string[];
  answer: string[];
  explanation: string;
  citationLabel?: string;
  topicTags?: string[];
  sourceLabels?: string[];
  skillTargets?: string[];
  inputMode?:
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
  notation?: string;
  clef?: "treble" | "bass";
  timeSignature?: string;
  keyboardNotes?: string[];
  audioNotes?: string[];
  audioMode?: "sequence" | "chord" | "rhythm";
  rhythmTokens?: string[];
  visualLabel?: string;
};

export type TheoryContext = {
  key: string;
  chord: string;
  scaleNotes: string[];
  chordTones: string[];
  safeMelodyNotes: string[];
};

export type SongSketch = {
  id: string;
  title: string;
  bpm: number;
  meter: string;
  /** Tonic for the sketch, e.g. "C". Defaults to "C" when absent. */
  key?: string;
  /** Major or minor key context. Defaults to "major" when absent. */
  mode?: "major" | "minor";
  form: string[];
  tracks: {
    drums: boolean[][];
    bass: string[];
    chords: string[];
    melody: string[];
    voiceGuide: string[];
  };
  mutedTracks: SongLabTrackType[];
  soloTracks: SongLabTrackType[];
  createdAt: string;
  updatedAt: string;
};

export type PracticeAttempt = Readonly<{
  promptId: string;
  moduleId: string;
  isCorrect: boolean;
  expected: string[];
  selected: string[];
  question: string;
  skillTargets: string[];
  attemptedAt: string;
}>;

export type ProgressState = {
  schemaVersion: 1;
  completedLessonSlugs: string[];
  bookmarkedLessonSlugs: string[];
  lastLessonSlug?: string;
  checkResults: Record<string, { correct: number; attempted: number }>;
  practiceResults: Record<string, { correct: number; attempted: number }>;
  placementResults: Record<string, { correct: number; attempted: number }>;
  practiceMastery: Record<
    string,
    {
      correct: number;
      attempted: number;
      streak: number;
      lastPracticedAt?: string;
      reviewQueue: string[];
    }
  >;
  reviewPromptState: Record<string, ReviewPromptState>;
  reviewPrompts: Record<string, StoredReviewPrompt>;
  skillMastery: Record<string, SkillMastery>;
  generatedSessionHistory: PracticeSessionHistory[];
  practiceAttempts?: PracticeAttempt[];
  savedSongSketches: SongSketch[];
  sync: {
    enabled: boolean;
    provider: "none" | "cloud";
    lastSyncAt?: string;
  };
  settings: {
    audioEnabled: boolean;
    reducedMotion: boolean;
    /** Optional active learning track id (additive). */
    activeTrackId?: string;
    /** Color theme. "system" follows the OS preference. Defaults to "system". */
    theme?: ThemePreference;
    /** Preferred note-naming system. Defaults to "english". */
    noteNaming?: NoteNamingPreference;
    /** Use the color-blind-safe palette for mnemonic colors. Defaults to false. */
    colorBlindSafe?: boolean;
    /** Focus mode dims app chrome for one-prompt-per-screen calm. Defaults to false. */
    focusMode?: boolean;
    /** Saved practice routines (Phase 5). */
    routines?: Routine[];
  };
};

export type SourceEntry = Citation & {
  owner: string;
  bestUse: string;
  riskLevel: "low" | "medium" | "high";
};

export type GlossaryTerm = {
  term: string;
  plainMeaning: string;
  topic: string;
  sourceUrls: string[];
};
