import { describe, expect, it } from "vitest";
import {
  PROGRESS_STORAGE_KEY,
  defaultProgressState,
  normalizeProgressState,
  readProgressState,
  writeProgressState
} from "./progressStorage";

describe("progress storage", () => {
  it("normalizes invalid data to defaults", () => {
    expect(normalizeProgressState(null)).toEqual(defaultProgressState);
    expect(normalizeProgressState({ schemaVersion: 2 })).toEqual(
      defaultProgressState
    );
  });

  it("preserves valid local progress fields", () => {
    const normalized = normalizeProgressState({
      schemaVersion: 1,
      completedLessonSlugs: ["sound-pitch"],
      bookmarkedLessonSlugs: ["triads"],
      lastLessonSlug: "triads",
      checkResults: { "triad-check": { correct: 1, attempted: 2 } },
      practiceResults: { "pitch-note-c4": { correct: 2, attempted: 3 } },
      practiceMastery: {
        pitch: {
          correct: 2,
          attempted: 3,
          streak: 1,
          lastPracticedAt: "2026-05-31T00:00:00.000Z",
          reviewQueue: ["pitch-note-e4"]
        }
      },
      reviewPromptState: {
        "pitch-note-e4": {
          consecutiveCorrect: 1,
          lastResult: "correct",
          lastAttemptedAt: "2026-05-31T00:00:00.000Z"
        }
      },
      skillMastery: {
        "note-reading": {
          correct: 2,
          attempted: 3,
          lastPracticedAt: "2026-05-31T00:00:00.000Z",
          reviewQueue: ["pitch-note-e4"]
        }
      },
      generatedSessionHistory: [
        {
          id: "session-1",
          moduleId: "pitch",
          configSummary: "beginner",
          correct: 2,
          attempted: 3,
          missedPromptIds: ["pitch-note-e4"],
          completedAt: "2026-05-31T00:00:00.000Z"
        }
      ],
      savedSongSketches: [
        {
          id: "song-1",
          title: "Loop",
          bpm: 92,
          meter: "4/4",
          form: ["A"],
          tracks: {
            drums: [[true, false, true, true]],
            bass: ["C2"],
            chords: ["I"],
            melody: ["E4"]
          },
          createdAt: "2026-05-31T00:00:00.000Z",
          updatedAt: "2026-05-31T00:00:00.000Z"
        }
      ],
      sync: { enabled: false, provider: "none" },
      settings: { audioEnabled: false, reducedMotion: true, activeTrackId: "harmony-songwriting" }
    });

    expect(normalized.completedLessonSlugs).toEqual(["sound-pitch"]);
    expect(normalized.bookmarkedLessonSlugs).toEqual(["triads"]);
    expect(normalized.lastLessonSlug).toBe("triads");
    expect(normalized.checkResults["triad-check"]).toEqual({
      correct: 1,
      attempted: 2
    });
    expect(normalized.practiceResults["pitch-note-c4"]).toEqual({
      correct: 2,
      attempted: 3
    });
    expect(normalized.practiceMastery.pitch).toEqual({
      correct: 2,
      attempted: 3,
      streak: 1,
      lastPracticedAt: "2026-05-31T00:00:00.000Z",
      reviewQueue: ["pitch-note-e4"]
    });
    expect(normalized.reviewPromptState["pitch-note-e4"]).toEqual({
      consecutiveCorrect: 1,
      lastResult: "correct",
      lastAttemptedAt: "2026-05-31T00:00:00.000Z"
    });
    expect(normalized.skillMastery["note-reading"].attempted).toBe(3);
    expect(normalized.generatedSessionHistory[0].id).toBe("session-1");
    expect(normalized.savedSongSketches[0].title).toBe("Loop");
    expect(normalized.savedSongSketches[0].tracks.voiceGuide).toEqual(["rest"]);
    expect(normalized.savedSongSketches[0].mutedTracks).toEqual([]);
    expect(normalized.sync).toEqual({ enabled: false, provider: "none" });
    expect(normalized.settings).toEqual({
      audioEnabled: false,
      reducedMotion: true,
      activeTrackId: "harmony-songwriting"
    });
  });

  it("writes and reads from browser storage", () => {
    localStorage.clear();
    writeProgressState(localStorage, {
      ...defaultProgressState,
      completedLessonSlugs: ["sound-pitch"]
    });

    expect(localStorage.getItem(PROGRESS_STORAGE_KEY)).toContain("sound-pitch");
    expect(readProgressState(localStorage).completedLessonSlugs).toEqual([
      "sound-pitch"
    ]);
  });

  it("drops an unknown active learning track id", () => {
    const normalized = normalizeProgressState({
      schemaVersion: 1,
      settings: {
        audioEnabled: true,
        reducedMotion: false,
        activeTrackId: "not-a-track"
      }
    });

    expect(normalized.settings.activeTrackId).toBeUndefined();
  });
});
