import {
  useCallback,
  useContext,
  useEffect,
  useMemo
} from "react";
import type { ReactNode } from "react";
import {
  applyConfidenceToSkillState,
  updateAdaptiveSkillState
} from "../lib/adaptiveReview";
import { fallbackProgress } from "../lib/progressRepository";
import { useProgressPersistence } from "../hooks/useProgressPersistence";
import { clearPlacementProgress } from "../lib/placementResults";
import type { PracticePrompt } from "../lib/practiceEngine";
import { updateReviewQueueForAttempt } from "../lib/reviewQueue";
import {
  SKILL_LEVEL_RANK,
  skillLevelMap
} from "../lib/learningPath";
import type {
  PracticeAttempt,
  PracticeSessionHistory,
  ProgressState,
  Routine,
  SongSketch,
  StoredReviewPrompt,
  ThemePreference
} from "../types/course";
import type { NoteNamingPreference } from "../types/course";

import { ProgressContext } from "./progressContext";
import type { ProgressContextValue } from "./progressContext";

export { ProgressContext } from "./progressContext";
export type { ProgressContextValue } from "./progressContext";

function uniqueAppend(items: string[], item: string): string[] {
  return items.includes(item) ? items : [...items, item];
}

function storedReviewPrompt(prompt: PracticePrompt, id: string): StoredReviewPrompt {
  const {
    moduleId,
    kind,
    question,
    choices,
    answer,
    explanation,
    citationLabel,
    topicTags,
    sourceLabels,
    skillTargets,
    inputMode,
    notation,
    clef,
    timeSignature,
    keyboardNotes,
    audioNotes,
    visualLabel
  } = prompt;
  const audioMode = prompt.playbackPattern?.mode;
  const rhythmTokens = prompt.renderSpec?.type === "rhythm"
    ? prompt.renderSpec.beats
    : prompt.renderSpec?.type === "instrument"
      ? prompt.renderSpec.rhythmPattern
      : audioMode === "rhythm"
        ? prompt.answer
        : undefined;

  return {
    id,
    moduleId,
    kind,
    question,
    choices,
    answer,
    explanation,
    citationLabel,
    topicTags,
    sourceLabels,
    skillTargets,
    inputMode,
    notation,
    clef,
    timeSignature,
    keyboardNotes,
    audioNotes,
    audioMode: audioMode === "song" ? undefined : audioMode,
    rhythmTokens,
    visualLabel
  };
}

function reviewPromptKey(prompt: PracticePrompt, id: string): string {
  if (prompt.reviewPromptId) {
    return prompt.reviewPromptId;
  }

  const value = JSON.stringify(storedReviewPrompt(prompt, id));
  let hash = 14695981039346656037n;
  for (const character of value) {
    hash ^= BigInt(character.codePointAt(0) ?? 0);
    hash = BigInt.asUintN(64, hash * 1099511628211n);
  }

  return `${id}-${hash.toString(36)}`;
}

function emitAppEvent(name: string, detail?: unknown): void {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent(name, { detail }));
}

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [progress, setProgress, isHydrated] = useProgressPersistence();

  useEffect(() => {
    document.documentElement.dataset.reducedMotion = progress.settings
      .reducedMotion
      ? "true"
      : "false";
  }, [progress.settings.reducedMotion]);

  useEffect(() => {
    const root = document.documentElement;
    const preference = progress.settings.theme ?? "system";

    const apply = () => {
      const prefersDark =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches;
      const resolved =
        preference === "system"
          ? prefersDark
            ? "dark"
            : "light"
          : preference;
      root.dataset.theme = resolved;
    };

    apply();

    if (preference !== "system" || typeof window === "undefined") {
      return;
    }

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", apply);

    return () => media.removeEventListener("change", apply);
  }, [progress.settings.theme]);

  useEffect(() => {
    document.documentElement.dataset.colorBlind = progress.settings
      .colorBlindSafe
      ? "true"
      : "false";
  }, [progress.settings.colorBlindSafe]);

  useEffect(() => {
    document.documentElement.dataset.focusMode = progress.settings.focusMode
      ? "true"
      : "false";
  }, [progress.settings.focusMode]);

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
  }, [setProgress]);

  const toggleBookmark = useCallback((slug: string) => {
    setProgress((current) => ({
      ...current,
      bookmarkedLessonSlugs: current.bookmarkedLessonSlugs.includes(slug)
        ? current.bookmarkedLessonSlugs.filter((item) => item !== slug)
        : [...current.bookmarkedLessonSlugs, slug]
    }));
  }, [setProgress]);

  const setLastLesson = useCallback((slug: string) => {
    setProgress((current) => ({
      ...current,
      lastLessonSlug: slug
    }));
  }, [setProgress]);

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
    [setProgress]
  );

  const recordPracticeResult = useCallback(
    (
      practiceId: string,
      moduleId: string,
       isCorrect: boolean,
       skillTargets: string[] = [],
       detail?: Pick<PracticeAttempt, "expected" | "selected" | "question">,
       prompt?: PracticePrompt
     ) => {
       setProgress((current) => {
         const promptKey = prompt ? reviewPromptKey(prompt, practiceId) : practiceId;
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
           previous: current.reviewPromptState[promptKey],
           promptId: promptKey,
           isCorrect,
           attemptedAt: practicedAtIso
         });
         const nextReviewPrompts = { ...current.reviewPrompts };
         if (!isCorrect && prompt && !nextReviewPrompts[promptKey]) {
           nextReviewPrompts[promptKey] = storedReviewPrompt(prompt, promptKey);
         } else if (reviewUpdate.cleared) {
           delete nextReviewPrompts[promptKey];
         }
         const nextSkillMastery = skillTargets.reduce(
          (mastery, skill) => {
            return {
              ...mastery,
              [skill]: updateAdaptiveSkillState(
                mastery[skill],
                 promptKey,
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
             [promptKey]: reviewUpdate.state
           },
           reviewPrompts: nextReviewPrompts,
           skillMastery: nextSkillMastery,
          practiceAttempts: detail
            ? [
                ...(current.practiceAttempts ?? []),
                {
                  promptId: practiceId,
                  moduleId,
                  isCorrect,
                  expected: detail.expected,
                  selected: detail.selected,
                  question: detail.question,
                  skillTargets,
                  attemptedAt: practicedAtIso
                }
              ].slice(-250)
            : current.practiceAttempts
        };
      });
    },
    [setProgress]
  );

  const queuePracticeReview = useCallback(
    (practiceId: string, moduleId: string, prompt?: PracticePrompt) => {
      setProgress((current) => {
        const promptKey = prompt ? reviewPromptKey(prompt, practiceId) : practiceId;
        const previousMastery = current.practiceMastery[moduleId] ?? {
          correct: 0,
          attempted: 0,
          streak: 0,
          reviewQueue: []
        };

        return {
          ...current,
          practiceMastery: {
            ...current.practiceMastery,
            [moduleId]: {
              ...previousMastery,
              reviewQueue: uniqueAppend(previousMastery.reviewQueue, promptKey)
            }
          },
          reviewPrompts: prompt && !current.reviewPrompts[promptKey]
            ? {
                ...current.reviewPrompts,
                [promptKey]: storedReviewPrompt(prompt, promptKey)
              }
            : current.reviewPrompts
        };
      });
    },
    [setProgress]
  );

  const recordPlacementResult = useCallback(
    (practiceId: string, isCorrect: boolean) => {
      setProgress((current) => {
        const previous = current.placementResults[practiceId] ?? {
          correct: 0,
          attempted: 0
        };

        return {
          ...current,
          placementResults: {
            ...current.placementResults,
            [practiceId]: {
              correct: previous.correct + (isCorrect ? 1 : 0),
              attempted: previous.attempted + 1
            }
          }
        };
      });
    },
    [setProgress]
  );

  const resetPlacementResults = useCallback(() => {
    setProgress(clearPlacementProgress);
  }, [setProgress]);

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
    [setProgress]
  );

  const recordPracticeSession = useCallback((session: PracticeSessionHistory) => {
    setProgress((current) => ({
      ...current,
      generatedSessionHistory: [
        session,
        ...current.generatedSessionHistory.filter((item) => item.id !== session.id)
      ].slice(0, 30)
    }));
  }, [setProgress]);

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
  }, [setProgress]);

  const deleteSongSketch = useCallback((sketchId: string) => {
    setProgress((current) => ({
      ...current,
      savedSongSketches: current.savedSongSketches.filter(
        (sketch) => sketch.id !== sketchId
      )
    }));
  }, [setProgress]);

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
  }, [setProgress]);

  const importProgress = useCallback((nextProgress: ProgressState) => {
    setProgress(nextProgress);
  }, [setProgress]);

  const setAudioEnabled = useCallback((enabled: boolean) => {
    setProgress((current) => ({
      ...current,
      settings: { ...current.settings, audioEnabled: enabled }
    }));
  }, [setProgress]);

  const setReducedMotion = useCallback((enabled: boolean) => {
    setProgress((current) => ({
      ...current,
      settings: { ...current.settings, reducedMotion: enabled }
    }));
  }, [setProgress]);

  const setActiveTrack = useCallback((trackId: string | undefined) => {
    setProgress((current) => ({
      ...current,
      settings: { ...current.settings, activeTrackId: trackId }
    }));
  }, [setProgress]);

  const setTheme = useCallback((theme: ThemePreference) => {
    setProgress((current) => ({
      ...current,
      settings: { ...current.settings, theme }
    }));
  }, [setProgress]);

  const setNoteNaming = useCallback((system: NoteNamingPreference) => {
    setProgress((current) => ({
      ...current,
      settings: { ...current.settings, noteNaming: system }
    }));
  }, [setProgress]);

  const setColorBlindSafe = useCallback((enabled: boolean) => {
    setProgress((current) => ({
      ...current,
      settings: { ...current.settings, colorBlindSafe: enabled }
    }));
  }, [setProgress]);

  const setFocusMode = useCallback((enabled: boolean) => {
    setProgress((current) => ({
      ...current,
      settings: { ...current.settings, focusMode: enabled }
    }));
  }, [setProgress]);

  const saveRoutine = useCallback((routine: Routine) => {
    setProgress((current) => ({
      ...current,
      settings: {
        ...current.settings,
        routines: [
          routine,
          ...(current.settings.routines ?? []).filter(
            (item) => item.id !== routine.id
          )
        ]
      }
    }));
  }, [setProgress]);

  const deleteRoutine = useCallback((routineId: string) => {
    setProgress((current) => ({
      ...current,
      settings: {
        ...current.settings,
        routines: (current.settings.routines ?? []).filter(
          (item) => item.id !== routineId
        )
      }
    }));
  }, [setProgress]);

  const resetProgress = useCallback(() => {
    setProgress(fallbackProgress());
  }, [setProgress]);

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
       queuePracticeReview,
       recordPlacementResult,
       resetPlacementResults,
       recordSkillConfidence,
      saveSongSketch,
      deleteSongSketch,
      importSongSketches,
      importProgress,
      setAudioEnabled,
      setReducedMotion,
      setActiveTrack,
      setTheme,
      setNoteNaming,
      setColorBlindSafe,
      setFocusMode,
      saveRoutine,
      deleteRoutine,
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
       queuePracticeReview,
       recordPlacementResult,
       resetPlacementResults,
       recordSkillConfidence,
      saveSongSketch,
      deleteSongSketch,
      importSongSketches,
      importProgress,
      setAudioEnabled,
      setReducedMotion,
      setActiveTrack,
      setTheme,
      setNoteNaming,
      setColorBlindSafe,
      setFocusMode,
      saveRoutine,
      deleteRoutine,
      resetProgress
    ]
  );

  if (!isHydrated) {
    return <p role="status">Loading local progress…</p>;
  }

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
