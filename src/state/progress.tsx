import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import type { ReactNode } from "react";
import {
  applyConfidenceToSkillState,
  updateAdaptiveSkillState
} from "../lib/adaptiveReview";
import {
  fallbackProgress,
  localProgressRepository
} from "../lib/progressRepository";
import { updateReviewQueueForAttempt } from "../lib/reviewQueue";
import {
  SKILL_LEVEL_RANK,
  skillLevelMap
} from "../lib/learningPath";
import type {
  PracticeSessionHistory,
  ProgressState,
  SongSketch
} from "../types/course";

type ProgressContextValue = {
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
    skillTargets?: string[]
  ) => void;
  recordPracticeSession: (session: PracticeSessionHistory) => void;
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
  resetProgress: () => void;
};

const ProgressContext = createContext<ProgressContextValue | null>(null);

function createInitialProgress(): ProgressState {
  if (typeof window === "undefined") {
    return fallbackProgress();
  }

  const stored = localProgressRepository.read(window.localStorage);
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  return {
    ...stored,
    settings: {
      ...stored.settings,
      reducedMotion: stored.settings.reducedMotion || prefersReducedMotion
    }
  };
}

function uniqueAppend(items: string[], item: string): string[] {
  return items.includes(item) ? items : [...items, item];
}

function emitAppEvent(name: string, detail?: unknown): void {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent(name, { detail }));
}

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [progress, setProgress] = useState<ProgressState>(createInitialProgress);
  const hasWrittenInitialProgress = useRef(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localProgressRepository.write(window.localStorage, progress);
      if (hasWrittenInitialProgress.current) {
        emitAppEvent("chordslab:progress-saved");
      } else {
        hasWrittenInitialProgress.current = true;
      }
    }
  }, [progress]);

  useEffect(() => {
    document.documentElement.dataset.reducedMotion = progress.settings
      .reducedMotion
      ? "true"
      : "false";
  }, [progress.settings.reducedMotion]);

  const isLessonComplete = useCallback(
    (slug: string) => progress.completedLessonSlugs.includes(slug),
    [progress.completedLessonSlugs]
  );

  const isLessonBookmarked = useCallback(
    (slug: string) => progress.bookmarkedLessonSlugs.includes(slug),
    [progress.bookmarkedLessonSlugs]
  );

  const markLessonComplete = useCallback((slug: string) => {
    setProgress((current) => ({
      ...current,
      completedLessonSlugs: uniqueAppend(current.completedLessonSlugs, slug),
      lastLessonSlug: slug
    }));
  }, []);

  const toggleBookmark = useCallback((slug: string) => {
    setProgress((current) => ({
      ...current,
      bookmarkedLessonSlugs: current.bookmarkedLessonSlugs.includes(slug)
        ? current.bookmarkedLessonSlugs.filter((item) => item !== slug)
        : [...current.bookmarkedLessonSlugs, slug]
    }));
  }, []);

  const setLastLesson = useCallback((slug: string) => {
    setProgress((current) => ({
      ...current,
      lastLessonSlug: slug
    }));
  }, []);

  const recordCheckResult = useCallback(
    (checkId: string, isCorrect: boolean) => {
      setProgress((current) => {
        const previous = current.checkResults[checkId] ?? {
          correct: 0,
          attempted: 0
        };

        return {
          ...current,
          checkResults: {
            ...current.checkResults,
            [checkId]: {
              correct: previous.correct + (isCorrect ? 1 : 0),
              attempted: previous.attempted + 1
            }
          }
        };
      });
    },
    []
  );

  const recordPracticeResult = useCallback(
    (
      practiceId: string,
      moduleId: string,
      isCorrect: boolean,
      skillTargets: string[] = []
    ) => {
      setProgress((current) => {
        const previous = current.practiceResults[practiceId] ?? {
          correct: 0,
          attempted: 0
        };
        const previousMastery = current.practiceMastery[moduleId] ?? {
          correct: 0,
          attempted: 0,
          streak: 0,
          reviewQueue: []
        };
        const practicedAt = new Date();
        const practicedAtIso = practicedAt.toISOString();
        const reviewUpdate = updateReviewQueueForAttempt({
          queue: previousMastery.reviewQueue,
          previous: current.reviewPromptState[practiceId],
          promptId: practiceId,
          isCorrect,
          attemptedAt: practicedAtIso
        });
        const nextSkillMastery = skillTargets.reduce(
          (mastery, skill) => {
            return {
              ...mastery,
              [skill]: updateAdaptiveSkillState(
                mastery[skill],
                practiceId,
                isCorrect,
                practicedAt
              )
            };
          },
          current.skillMastery
        );
        emitAppEvent("chordslab:review-queue", {
          isCorrect,
          cleared: reviewUpdate.cleared,
          consecutiveCorrect: reviewUpdate.state.consecutiveCorrect
        });

        // Calm, opt-in acknowledgment: when a canonical skill crosses a level
        // boundary (new -> learning -> practiced -> strong), surface a gentle
        // toast. No streak pressure, no XP.
        const beforeLevels = skillLevelMap(current.skillMastery);
        const afterLevels = skillLevelMap(nextSkillMastery);
        for (const [skillId, afterLevel] of afterLevels) {
          const beforeRank = SKILL_LEVEL_RANK[beforeLevels.get(skillId) ?? "new"];
          const afterRank = SKILL_LEVEL_RANK[afterLevel];
          if (afterRank > beforeRank && afterRank >= SKILL_LEVEL_RANK.practiced) {
            emitAppEvent("chordslab:skill-levelup", {
              skillId,
              level: afterLevel
            });
          }
        }

        return {
          ...current,
          practiceResults: {
            ...current.practiceResults,
            [practiceId]: {
              correct: previous.correct + (isCorrect ? 1 : 0),
              attempted: previous.attempted + 1
            }
          },
          practiceMastery: {
            ...current.practiceMastery,
            [moduleId]: {
              correct: previousMastery.correct + (isCorrect ? 1 : 0),
              attempted: previousMastery.attempted + 1,
              streak: isCorrect ? previousMastery.streak + 1 : 0,
              lastPracticedAt: practicedAtIso,
              reviewQueue: reviewUpdate.queue
            }
          },
          reviewPromptState: {
            ...current.reviewPromptState,
            [practiceId]: reviewUpdate.state
          },
          skillMastery: nextSkillMastery
        };
      });
    },
    []
  );

  const recordSkillConfidence = useCallback(
    (skillTargets: string[], confidence: "easy" | "hard") => {
      if (skillTargets.length === 0) {
        return;
      }

      setProgress((current) => {
        const ratedAt = new Date();
        const nextSkillMastery = skillTargets.reduce((mastery, skill) => {
          const existing = mastery[skill];

          // Confidence only nudges ease/interval; it never changes attempt
          // counts. Skip skills with no prior attempt.
          if (!existing) {
            return mastery;
          }

          return {
            ...mastery,
            [skill]: applyConfidenceToSkillState(existing, confidence, ratedAt)
          };
        }, current.skillMastery);

        return { ...current, skillMastery: nextSkillMastery };
      });
    },
    []
  );

  const recordPracticeSession = useCallback((session: PracticeSessionHistory) => {
    setProgress((current) => ({
      ...current,
      generatedSessionHistory: [
        session,
        ...current.generatedSessionHistory.filter((item) => item.id !== session.id)
      ].slice(0, 30)
    }));
  }, []);

  const saveSongSketch = useCallback((sketch: SongSketch) => {
    setProgress((current) => ({
      ...current,
      savedSongSketches: [
        sketch,
        ...current.savedSongSketches.filter((item) => item.id !== sketch.id)
      ].sort((left, right) =>
        right.updatedAt.localeCompare(left.updatedAt)
      )
    }));
  }, []);

  const deleteSongSketch = useCallback((sketchId: string) => {
    setProgress((current) => ({
      ...current,
      savedSongSketches: current.savedSongSketches.filter(
        (sketch) => sketch.id !== sketchId
      )
    }));
  }, []);

  const importSongSketches = useCallback((sketches: SongSketch[]) => {
    setProgress((current) => {
      const incoming = new Map(
        [...current.savedSongSketches, ...sketches].map((sketch) => [
          sketch.id,
          sketch
        ])
      );

      return {
        ...current,
        savedSongSketches: Array.from(incoming.values()).sort((left, right) =>
          right.updatedAt.localeCompare(left.updatedAt)
        )
      };
    });
  }, []);

  const importProgress = useCallback((nextProgress: ProgressState) => {
    setProgress(nextProgress);
  }, []);

  const setAudioEnabled = useCallback((enabled: boolean) => {
    setProgress((current) => ({
      ...current,
      settings: { ...current.settings, audioEnabled: enabled }
    }));
  }, []);

  const setReducedMotion = useCallback((enabled: boolean) => {
    setProgress((current) => ({
      ...current,
      settings: { ...current.settings, reducedMotion: enabled }
    }));
  }, []);

  const setActiveTrack = useCallback((trackId: string | undefined) => {
    setProgress((current) => ({
      ...current,
      settings: { ...current.settings, activeTrackId: trackId }
    }));
  }, []);

  const resetProgress = useCallback(() => {
    setProgress(fallbackProgress());
  }, []);

  const value = useMemo<ProgressContextValue>(
    () => ({
      progress,
      completedCount: progress.completedLessonSlugs.length,
      isLessonComplete,
      isLessonBookmarked,
      markLessonComplete,
      toggleBookmark,
      setLastLesson,
      recordCheckResult,
      recordPracticeResult,
      recordPracticeSession,
      recordSkillConfidence,
      saveSongSketch,
      deleteSongSketch,
      importSongSketches,
      importProgress,
      setAudioEnabled,
      setReducedMotion,
      setActiveTrack,
      resetProgress
    }),
    [
      progress,
      isLessonComplete,
      isLessonBookmarked,
      markLessonComplete,
      toggleBookmark,
      setLastLesson,
      recordCheckResult,
      recordPracticeResult,
      recordPracticeSession,
      recordSkillConfidence,
      saveSongSketch,
      deleteSongSketch,
      importSongSketches,
      importProgress,
      setAudioEnabled,
      setReducedMotion,
      setActiveTrack,
      resetProgress
    ]
  );

  return (
    <ProgressContext.Provider value={value}>
      {children}
    </ProgressContext.Provider>
  );
}

export function useProgress(): ProgressContextValue {
  const value = useContext(ProgressContext);

  if (!value) {
    throw new Error("useProgress must be used within ProgressProvider");
  }

  return value;
}
