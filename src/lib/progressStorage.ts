import type { ProgressState } from "../types/course";
import { songLabTrackTypes } from "./instruments";

export const PROGRESS_STORAGE_KEY = "chordslab.progress.v1";

export const defaultProgressState: ProgressState = {
  schemaVersion: 1,
  completedLessonSlugs: [],
  bookmarkedLessonSlugs: [],
  checkResults: {},
  practiceResults: {},
  practiceMastery: {},
  reviewPromptState: {},
  skillMastery: {},
  generatedSessionHistory: [],
  savedSongSketches: [],
  sync: {
    enabled: false,
    provider: "none"
  },
  settings: {
    audioEnabled: true,
    reducedMotion: false
  }
};

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

function normalizeResultMap(
  value: ProgressState["checkResults"] | ProgressState["practiceResults"] | undefined
): Record<string, { correct: number; attempted: number }> {
  return value && typeof value === "object"
    ? Object.fromEntries(
        Object.entries(value).filter(([, result]) => {
          return (
            result &&
            typeof result.correct === "number" &&
            typeof result.attempted === "number"
          );
        })
      )
    : {};
}

function normalizeSkillMasteryMap(
  value: ProgressState["skillMastery"] | undefined
): ProgressState["skillMastery"] {
  return value && typeof value === "object"
    ? Object.fromEntries(
        Object.entries(value)
          .filter(([, result]) => {
            return (
              result &&
              typeof result.correct === "number" &&
              typeof result.attempted === "number"
            );
          })
          .map(([skill, result]) => [
            skill,
            {
              correct: result.correct,
              attempted: result.attempted,
              ease:
                typeof result.ease === "number" && Number.isFinite(result.ease)
                  ? result.ease
                  : 2.3,
              intervalDays:
                typeof result.intervalDays === "number" &&
                Number.isFinite(result.intervalDays)
                  ? result.intervalDays
                  : 1,
              dueAt:
                typeof result.dueAt === "string" ? result.dueAt : undefined,
              lapses:
                typeof result.lapses === "number" &&
                Number.isFinite(result.lapses)
                  ? result.lapses
                  : 0,
              lastResult:
                result.lastResult === "correct" ||
                result.lastResult === "incorrect"
                  ? result.lastResult
                  : undefined,
              lastPracticedAt:
                typeof result.lastPracticedAt === "string"
                  ? result.lastPracticedAt
                  : undefined,
              reviewQueue: isStringArray(result.reviewQueue)
                ? result.reviewQueue
                : []
            }
          ])
      )
    : {};
}

function normalizeSessionHistory(
  value: ProgressState["generatedSessionHistory"] | undefined
): ProgressState["generatedSessionHistory"] {
  return Array.isArray(value)
    ? value.filter((session) => {
        return (
          session &&
          typeof session.id === "string" &&
          typeof session.moduleId === "string" &&
          typeof session.configSummary === "string" &&
          typeof session.correct === "number" &&
          typeof session.attempted === "number" &&
          isStringArray(session.missedPromptIds) &&
          typeof session.completedAt === "string"
        );
      })
    : [];
}

function normalizeSongSketches(
  value: ProgressState["savedSongSketches"] | undefined
): ProgressState["savedSongSketches"] {
  return Array.isArray(value)
    ? value
        .filter((sketch) => {
          return (
            sketch &&
            typeof sketch.id === "string" &&
            typeof sketch.title === "string" &&
            typeof sketch.bpm === "number" &&
            typeof sketch.meter === "string" &&
            isStringArray(sketch.form) &&
            sketch.tracks &&
            Array.isArray(sketch.tracks.drums) &&
            isStringArray(sketch.tracks.bass) &&
            isStringArray(sketch.tracks.chords) &&
            isStringArray(sketch.tracks.melody) &&
            typeof sketch.createdAt === "string" &&
            typeof sketch.updatedAt === "string"
          );
        })
        .map((sketch) => ({
          ...sketch,
          tracks: {
            drums: sketch.tracks.drums,
            bass: sketch.tracks.bass,
            chords: sketch.tracks.chords,
            melody: sketch.tracks.melody,
            voiceGuide: isStringArray(sketch.tracks.voiceGuide)
              ? sketch.tracks.voiceGuide
              : Array.from({ length: sketch.form.length }, () => "rest")
          },
          mutedTracks: isStringArray(sketch.mutedTracks)
            ? sketch.mutedTracks.filter((track) =>
                songLabTrackTypes.includes(
                  track as ProgressState["savedSongSketches"][number]["mutedTracks"][number]
                )
              )
            : [],
          soloTracks: isStringArray(sketch.soloTracks)
            ? sketch.soloTracks.filter((track) =>
                songLabTrackTypes.includes(
                  track as ProgressState["savedSongSketches"][number]["soloTracks"][number]
                )
              )
            : []
        }))
    : [];
}

function normalizeMasteryMap(
  value: ProgressState["practiceMastery"] | undefined
): ProgressState["practiceMastery"] {
  return value && typeof value === "object"
    ? Object.fromEntries(
        Object.entries(value)
          .filter(([, result]) => {
            return (
              result &&
              typeof result.correct === "number" &&
              typeof result.attempted === "number" &&
              typeof result.streak === "number"
            );
          })
          .map(([moduleId, result]) => [
            moduleId,
            {
              correct: result.correct,
              attempted: result.attempted,
              streak: result.streak,
              lastPracticedAt:
                typeof result.lastPracticedAt === "string"
                  ? result.lastPracticedAt
                  : undefined,
              reviewQueue: isStringArray(result.reviewQueue)
                ? result.reviewQueue
                : []
            }
          ])
      )
    : {};
}

function normalizeReviewPromptState(
  value: ProgressState["reviewPromptState"] | undefined
): ProgressState["reviewPromptState"] {
  return value && typeof value === "object"
    ? Object.fromEntries(
        Object.entries(value)
          .filter(([, result]) => {
            return (
              result &&
              typeof result.consecutiveCorrect === "number" &&
              (result.lastResult === "correct" ||
                result.lastResult === "incorrect") &&
              typeof result.lastAttemptedAt === "string"
            );
          })
          .map(([promptId, result]) => [
            promptId,
            {
              consecutiveCorrect: Math.max(
                0,
                Math.floor(result.consecutiveCorrect)
              ),
              lastResult: result.lastResult,
              lastAttemptedAt: result.lastAttemptedAt
            }
          ])
      )
    : {};
}

export function normalizeProgressState(value: unknown): ProgressState {
  if (!value || typeof value !== "object") {
    return defaultProgressState;
  }

  const input = value as Partial<ProgressState>;

  if (input.schemaVersion !== 1) {
    return defaultProgressState;
  }

  return {
    schemaVersion: 1,
    completedLessonSlugs: isStringArray(input.completedLessonSlugs)
      ? input.completedLessonSlugs
      : [],
    bookmarkedLessonSlugs: isStringArray(input.bookmarkedLessonSlugs)
      ? input.bookmarkedLessonSlugs
      : [],
    lastLessonSlug:
      typeof input.lastLessonSlug === "string"
        ? input.lastLessonSlug
        : undefined,
    checkResults: normalizeResultMap(input.checkResults),
    practiceResults: normalizeResultMap(input.practiceResults),
    practiceMastery: normalizeMasteryMap(input.practiceMastery),
    reviewPromptState: normalizeReviewPromptState(input.reviewPromptState),
    skillMastery: normalizeSkillMasteryMap(input.skillMastery),
    generatedSessionHistory: normalizeSessionHistory(
      input.generatedSessionHistory
    ),
    savedSongSketches: normalizeSongSketches(input.savedSongSketches),
    sync: {
      enabled: typeof input.sync?.enabled === "boolean" ? input.sync.enabled : false,
      provider: input.sync?.provider === "cloud" ? "cloud" : "none",
      lastSyncAt:
        typeof input.sync?.lastSyncAt === "string"
          ? input.sync.lastSyncAt
          : undefined
    },
    settings: {
      audioEnabled:
        typeof input.settings?.audioEnabled === "boolean"
          ? input.settings.audioEnabled
          : true,
      reducedMotion:
        typeof input.settings?.reducedMotion === "boolean"
          ? input.settings.reducedMotion
          : false
    }
  };
}

export function readProgressState(storage: Storage): ProgressState {
  const raw = storage.getItem(PROGRESS_STORAGE_KEY);

  if (!raw) {
    return defaultProgressState;
  }

  try {
    return normalizeProgressState(JSON.parse(raw));
  } catch {
    return defaultProgressState;
  }
}

export function writeProgressState(
  storage: Storage,
  progress: ProgressState
): void {
  storage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
}
