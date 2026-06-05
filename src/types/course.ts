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
  level: "beginner";
  estimatedMinutes: number;
  outcomes: string[];
  prerequisites: string[];
  citations: Citation[];
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

export type AppMode =
  | "idle"
  | "learning"
  | "drilling"
  | "reviewing"
  | "experimenting"
  | "instrumenting";

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

export type ProgressState = {
  schemaVersion: 1;
  completedLessonSlugs: string[];
  bookmarkedLessonSlugs: string[];
  lastLessonSlug?: string;
  checkResults: Record<string, { correct: number; attempted: number }>;
  practiceResults: Record<string, { correct: number; attempted: number }>;
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
  skillMastery: Record<string, SkillMastery>;
  generatedSessionHistory: PracticeSessionHistory[];
  savedSongSketches: SongSketch[];
  sync: {
    enabled: boolean;
    provider: "none" | "cloud";
    lastSyncAt?: string;
  };
  settings: {
    audioEnabled: boolean;
    reducedMotion: boolean;
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
