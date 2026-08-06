import { createContext } from "react";
import type { PracticePrompt } from "../lib/practiceEngine";
import type {
  NoteNamingPreference,
  PracticeAttempt,
  PracticeSessionHistory,
  ProgressState,
  Routine,
  SongSketch,
  ThemePreference
} from "../types/course";

export type ProgressContextValue = {
  progress: ProgressState;
  completedCount: number;
  isLessonComplete: (slug: string) => boolean;
  isLessonBookmarked: (slug: string) => boolean;
  markLessonComplete: (slug: string) => void;
  toggleBookmark: (slug: string) => void;
  setLastLesson: (slug: string) => void;
  recordCheckResult: (checkId: string, isCorrect: boolean) => void;
  recordPracticeResult: (
    practiceId: string,
    moduleId: string,
    isCorrect: boolean,
    skillTargets?: string[],
    detail?: Pick<PracticeAttempt, "expected" | "selected" | "question">,
    prompt?: PracticePrompt
  ) => void;
  recordPracticeSession: (session: PracticeSessionHistory) => void;
  queuePracticeReview: (
    practiceId: string,
    moduleId: string,
    prompt?: PracticePrompt
  ) => void;
  recordPlacementResult: (practiceId: string, isCorrect: boolean) => void;
  resetPlacementResults: () => void;
  recordSkillConfidence: (
    skillTargets: string[],
    confidence: "easy" | "hard"
  ) => void;
  saveSongSketch: (sketch: SongSketch) => void;
  deleteSongSketch: (sketchId: string) => void;
  importSongSketches: (sketches: SongSketch[]) => void;
  importProgress: (nextProgress: ProgressState) => void;
  setAudioEnabled: (enabled: boolean) => void;
  setReducedMotion: (enabled: boolean) => void;
  setActiveTrack: (trackId: string | undefined) => void;
  setTheme: (theme: ThemePreference) => void;
  setNoteNaming: (system: NoteNamingPreference) => void;
  setColorBlindSafe: (enabled: boolean) => void;
  setFocusMode: (enabled: boolean) => void;
  saveRoutine: (routine: Routine) => void;
  deleteRoutine: (routineId: string) => void;
  resetProgress: () => void;
};

export const ProgressContext = createContext<ProgressContextValue | null>(null);
