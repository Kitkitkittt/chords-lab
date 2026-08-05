import type {
  PracticeAttempt,
  ProgressState,
  StoredReviewPrompt
} from "../types/course";
import { songLabTrackTypes } from "./instruments";
import { normalizeCapturedMelody } from "./songSketches";
import { generatePlacementPrompts } from "./placement";
import { skillTrackIds } from "./skills";
import { validateRoutine } from "./routines";

export const PROGRESS_STORAGE_KEY = "chordslab.progress.v1";

const KNOWN_TRACK_IDS: string[] = skillTrackIds;

export const defaultProgressState: ProgressState = {
  schemaVersion: 1,
  completedLessonSlugs: [],
  bookmarkedLessonSlugs: [],
  checkResults: {},
  practiceResults: {},
  placementResults: {},
  practiceMastery: {},
  reviewPromptState: {},
  reviewPrompts: {},
  skillMastery: {},
  generatedSessionHistory: [],
  practiceAttempts: [],
  savedSongSketches: [],
  sync: {
    enabled: false,
    provider: "none"
  },
  settings: {
    audioEnabled: true,
    reducedMotion: false,
    theme: "system",
    noteNaming: "english",
    colorBlindSafe: false,
    focusMode: false,
    routines: []
  }
};

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

const reviewPromptKinds: StoredReviewPrompt["kind"][] = [
  "single",
  "multi",
  "ordered",
  "grid",
  "note-builder",
  "chord-builder",
  "listening"
];

const reviewInputModes: NonNullable<StoredReviewPrompt["inputMode"]>[] = [
  "choice",
  "sequence",
  "staff-click",
  "rhythm-grid",
  "piano-roll",
  "listening",
  "harmony-board",
  "analysis-board",
  "instrument-board",
  "fretboard",
  "drum-pad",
  "voice-range",
  "song-arranger"
];

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
                : [],
              stability:
                typeof result.stability === "number" &&
                Number.isFinite(result.stability)
                  ? result.stability
                  : undefined,
              difficulty:
                typeof result.difficulty === "number" &&
                Number.isFinite(result.difficulty)
                  ? result.difficulty
                  : undefined,
              reps:
                typeof result.reps === "number" &&
                Number.isFinite(result.reps)
                  ? result.reps
                  : undefined
            }
          ])
      )
    : {};
}

function normalizePracticeAttempts(value: unknown): PracticeAttempt[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((attempt): attempt is PracticeAttempt => {
      const item = attempt as Partial<PracticeAttempt>;
      return (
        item &&
        typeof item === "object" &&
        typeof item.promptId === "string" &&
        typeof item.moduleId === "string" &&
        typeof item.isCorrect === "boolean" &&
        isStringArray(item.expected) &&
        isStringArray(item.selected) &&
        typeof item.question === "string" &&
        isStringArray(item.skillTargets) &&
        typeof item.attemptedAt === "string" &&
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
          item.attemptedAt
        ) &&
        !Number.isNaN(Date.parse(item.attemptedAt)) &&
        new Date(item.attemptedAt).toISOString() === item.attemptedAt
      );
    })
    .slice(-250);
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
          capturedMelody: normalizeCapturedMelody(sketch.capturedMelody),
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

function normalizeReviewPrompts(value: unknown): ProgressState["reviewPrompts"] {
  if (!value || typeof value !== "object") {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter((entry): entry is [string, StoredReviewPrompt] => {
        const [id, prompt] = entry;
        return Boolean(
          prompt &&
          typeof prompt === "object" &&
          typeof prompt.id === "string" &&
          prompt.id === id &&
          typeof prompt.moduleId === "string" &&
          reviewPromptKinds.includes(prompt.kind) &&
          typeof prompt.question === "string" &&
          isStringArray(prompt.choices) &&
          isStringArray(prompt.answer) &&
          typeof prompt.explanation === "string" &&
          (prompt.citationLabel === undefined || typeof prompt.citationLabel === "string") &&
          (prompt.inputMode === undefined || reviewInputModes.includes(prompt.inputMode)) &&
          (prompt.notation === undefined || typeof prompt.notation === "string") &&
          (prompt.clef === undefined || prompt.clef === "treble" || prompt.clef === "bass") &&
          (prompt.timeSignature === undefined || typeof prompt.timeSignature === "string") &&
          (prompt.visualLabel === undefined || typeof prompt.visualLabel === "string") &&
          (prompt.topicTags === undefined || isStringArray(prompt.topicTags)) &&
          (prompt.sourceLabels === undefined || isStringArray(prompt.sourceLabels)) &&
          (prompt.skillTargets === undefined || isStringArray(prompt.skillTargets)) &&
          (prompt.keyboardNotes === undefined || isStringArray(prompt.keyboardNotes)) &&
           (prompt.audioNotes === undefined || isStringArray(prompt.audioNotes)) &&
           (prompt.audioMode === undefined ||
             prompt.audioMode === "sequence" ||
             prompt.audioMode === "chord" ||
             prompt.audioMode === "rhythm") &&
           (prompt.rhythmTokens === undefined || isStringArray(prompt.rhythmTokens))
        );
      })
  );
}

function normalizeRoutines(
  value: unknown
): ProgressState["settings"]["routines"] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is NonNullable<ProgressState["settings"]["routines"]>[number] =>
    validateRoutine(item)
  );
}

export function normalizeProgressState(value: unknown): ProgressState {
  if (!value || typeof value !== "object") {
    return defaultProgressState;
  }

  const input = value as Partial<ProgressState>;

  if (input.schemaVersion !== 1) {
    return defaultProgressState;
  }

  const placementIds = new Set(generatePlacementPrompts().map((prompt) => prompt.id));
  const withoutPlacementIds = <T,>(entries: Record<string, T>) =>
    Object.fromEntries(
      Object.entries(entries).filter(([promptId]) => !placementIds.has(promptId))
    );
  const withoutPlacementQueue = <T extends { reviewQueue: string[] }>(
    entries: Record<string, T>
  ) =>
    Object.fromEntries(
      Object.entries(entries).map(([id, mastery]) => [
        id,
        {
          ...mastery,
          reviewQueue: mastery.reviewQueue.filter(
            (promptId) => !placementIds.has(promptId)
          )
        }
      ])
    );
  const normalizedPracticeResults = normalizeResultMap(input.practiceResults);
  const legacyPlacementResults = Object.fromEntries(
    Object.entries(normalizedPracticeResults).filter(([promptId]) =>
      placementIds.has(promptId)
    )
  );
  const storedPlacementResults = Object.fromEntries(
    Object.entries(normalizeResultMap(input.placementResults)).filter(([promptId]) =>
      placementIds.has(promptId)
    )
  );
  const placementResults = {
    ...legacyPlacementResults,
    ...storedPlacementResults
  };

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
    practiceResults: withoutPlacementIds(normalizedPracticeResults),
    placementResults,
    practiceMastery: withoutPlacementQueue(
      normalizeMasteryMap(input.practiceMastery)
    ),
    reviewPromptState: withoutPlacementIds(
      normalizeReviewPromptState(input.reviewPromptState)
    ),
    reviewPrompts: withoutPlacementIds(
      normalizeReviewPrompts(input.reviewPrompts)
    ),
    skillMastery: withoutPlacementQueue(
      normalizeSkillMasteryMap(input.skillMastery)
    ),
    generatedSessionHistory: normalizeSessionHistory(
      input.generatedSessionHistory
    ),
    practiceAttempts: normalizePracticeAttempts(input.practiceAttempts).filter(
      (attempt) => !placementIds.has(attempt.promptId)
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
          : false,
      activeTrackId: KNOWN_TRACK_IDS.includes(
        input.settings?.activeTrackId as string
      )
        ? input.settings?.activeTrackId
        : undefined,
      theme:
        input.settings?.theme === "light" ||
        input.settings?.theme === "dark" ||
        input.settings?.theme === "system"
          ? input.settings.theme
          : "system",
      noteNaming:
        input.settings?.noteNaming === "fixed-do" ||
        input.settings?.noteNaming === "german" ||
        input.settings?.noteNaming === "english"
          ? input.settings.noteNaming
          : "english",
      colorBlindSafe:
        typeof input.settings?.colorBlindSafe === "boolean"
          ? input.settings.colorBlindSafe
          : false,
      focusMode:
        typeof input.settings?.focusMode === "boolean"
          ? input.settings.focusMode
          : false,
      routines: normalizeRoutines(input.settings?.routines)
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
