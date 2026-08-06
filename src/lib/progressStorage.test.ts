import { describe, expect, it } from "vitest";
import { generatePlacementPrompts } from "./placement";
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
    // A version this build knows nothing about; refuse it rather than guess.
    expect(normalizeProgressState({ schemaVersion: 999 })).toEqual(
      defaultProgressState
    );
  });

  it("migrates and strictly normalizes practice attempts", () => {
    const attempts = Array.from({ length: 251 }, (_, index) => ({
      promptId: `prompt-${index}`,
      moduleId: "pitch",
      isCorrect: index % 2 === 0,
      expected: ["C"],
      selected: ["D"],
      question: "Name this note.",
      skillTargets: ["note-reading"],
      attemptedAt: new Date(Date.UTC(2026, 4, 31, 0, 0, index)).toISOString()
    }));
    const normalized = normalizeProgressState({
      schemaVersion: 1,
      practiceAttempts: [
        ...attempts,
        { ...attempts[0], selected: "D" },
        { ...attempts[0], attemptedAt: 1 }
      ]
    });

    expect(normalizeProgressState({ schemaVersion: 1 }).practiceAttempts).toEqual([]);
    expect(normalized.practiceAttempts).toHaveLength(250);
    expect(normalized.practiceAttempts?.[0].promptId).toBe("prompt-1");
    expect(normalized.practiceAttempts?.at(-1)?.promptId).toBe("prompt-250");
  });

  it("preserves every queued generated prompt snapshot", () => {
    const reviewQueue = Array.from({ length: 251 }, (_, index) => `generated-${index}`);
    const reviewPrompts = Object.fromEntries(
      reviewQueue.map((id) => [
        id,
        {
          id,
          moduleId: "ear",
          kind: "single",
          question: `Generated prompt ${id}`,
          choices: ["major", "minor"],
          answer: ["major"],
          explanation: "It was major."
        }
      ])
    );
    const normalized = normalizeProgressState({
      schemaVersion: 1,
      practiceMastery: {
        ear: {
          correct: 0,
          attempted: 251,
          streak: 0,
          reviewQueue
        }
      },
      reviewPrompts
    });

    expect(Object.keys(normalized.reviewPrompts)).toHaveLength(251);
    expect(normalized.practiceMastery.ear.reviewQueue).toEqual(reviewQueue);
    expect(normalized.reviewPrompts[reviewQueue[0]].id).toBe(reviewQueue[0]);
  });

  it("migrates placement results out of regular practice state", () => {
    const placementId = generatePlacementPrompts()[0].id;
    const normalized = normalizeProgressState({
      schemaVersion: 1,
      practiceResults: {
        [placementId]: { correct: 0, attempted: 1 },
        "pitch-note-c4": { correct: 2, attempted: 3 }
      },
      placementResults: {
        [placementId]: { correct: 1, attempted: 1 },
        unknown: { correct: 1, attempted: 1 }
      },
      practiceMastery: {
        pitch: {
          correct: 2,
          attempted: 3,
          streak: 1,
          reviewQueue: [placementId, "pitch-note-c4"]
        }
      },
      reviewPromptState: {
        [placementId]: {
          consecutiveCorrect: 0,
          lastResult: "incorrect",
          lastAttemptedAt: "2026-05-31T00:00:00.000Z"
        }
      },
      reviewPrompts: {
        [placementId]: {
          id: placementId,
          moduleId: "pitch",
          kind: "single",
          question: "Placement note.",
          choices: ["C", "D"],
          answer: ["C"],
          explanation: "C."
        }
      },
      skillMastery: {
        "note-reading": {
          correct: 2,
          attempted: 3,
          reviewQueue: [placementId, "pitch-note-c4"]
        }
      },
      practiceAttempts: [
        {
          promptId: placementId,
          moduleId: "pitch",
          isCorrect: false,
          expected: ["C"],
          selected: ["D"],
          question: "Placement note.",
          skillTargets: ["note-reading"],
          attemptedAt: "2026-05-31T00:00:00.000Z"
        }
      ]
    });

    expect(normalized.placementResults).toEqual({
      [placementId]: { correct: 1, attempted: 1 }
    });
    expect(normalized.practiceResults).toEqual({
      "pitch-note-c4": { correct: 2, attempted: 3 }
    });
    expect(normalized.practiceMastery.pitch.reviewQueue).toEqual(["pitch-note-c4"]);
    expect(normalized.skillMastery["note-reading"].reviewQueue).toEqual(["pitch-note-c4"]);
    expect(normalized.reviewPromptState).toEqual({});
    expect(normalized.reviewPrompts).toEqual({});
    expect(normalized.practiceAttempts).toEqual([]);
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
      reviewPrompts: {
        "generated-ear-1": {
          id: "generated-ear-1",
          moduleId: "ear",
          kind: "single",
          question: "What did you hear?",
          choices: ["major", "minor"],
          answer: ["major"],
          explanation: "It was major.",
          skillTargets: ["ear-training"],
          rhythmTokens: ["hit", "rest", "hit", "rest"]
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
    expect(normalized.reviewPrompts["generated-ear-1"].question).toBe("What did you hear?");
    expect(normalized.reviewPrompts["generated-ear-1"].rhythmTokens).toEqual([
      "hit",
      "rest",
      "hit",
      "rest"
    ]);
    expect(normalized.skillMastery["note-reading"].attempted).toBe(3);
    expect(normalized.generatedSessionHistory[0].id).toBe("session-1");
    expect(normalized.savedSongSketches[0].title).toBe("Loop");
    expect(normalized.savedSongSketches[0].tracks.voiceGuide).toEqual(["rest"]);
    expect(normalized.savedSongSketches[0].mutedTracks).toEqual([]);
    expect(normalized.sync).toEqual({ enabled: false, provider: "none" });
    expect(normalized.settings).toEqual({
      audioEnabled: false,
      reducedMotion: true,
      activeTrackId: "harmony-songwriting",
      theme: "system",
      noteNaming: "english",
      colorBlindSafe: false,
      focusMode: false,
      routines: []
    });
  });

  it("preserves a stored focus mode preference", () => {
    const normalized = normalizeProgressState({
      schemaVersion: 1,
      settings: {
        audioEnabled: true,
        reducedMotion: false,
        focusMode: true
      }
    });

    expect(normalized.settings.focusMode).toBe(true);
  });

  it("defaults focus mode to false when absent", () => {
    const normalized = normalizeProgressState({
      schemaVersion: 1,
      settings: {
        audioEnabled: true,
        reducedMotion: false
      }
    });

    expect(normalized.settings.focusMode).toBe(false);
  });

  it("normalizes a non-boolean focus mode value to false", () => {
    const normalized = normalizeProgressState({
      schemaVersion: 1,
      settings: {
        audioEnabled: true,
        reducedMotion: false,
        focusMode: "yes"
      }
    });

    expect(normalized.settings.focusMode).toBe(false);
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

  it("keeps a valid captured jam take on a stored sketch", () => {
    const normalized = normalizeProgressState({
      schemaVersion: 1,
      savedSongSketches: [
        {
          id: "song-take",
          title: "Take",
          bpm: 92,
          meter: "4/4",
          form: ["A"],
          tracks: {
            drums: [[true, false, true, true]],
            bass: ["C2"],
            chords: ["I"],
            melody: ["E4"]
          },
          capturedMelody: [
            { note: "C4", startBeat: 0.5, durationBeats: 0.25 },
            { note: "nope", startBeat: "x" },
            { note: "E4", startBeat: -2, durationBeats: 0 }
          ],
          createdAt: "2026-05-31T00:00:00.000Z",
          updatedAt: "2026-05-31T00:00:00.000Z"
        }
      ]
    });

    const take = normalized.savedSongSketches[0].capturedMelody;
    // The malformed middle entry is dropped, and the clamped one is repaired.
    expect(take).toHaveLength(2);
    expect(take?.[0]).toMatchObject({ note: "C4", startBeat: 0.5 });
    expect(take?.[1].startBeat).toBe(0);
    expect(take?.[1].durationBeats).toBeGreaterThan(0);
  });

  it("drops a malformed captured melody entirely", () => {
    const normalized = normalizeProgressState({
      schemaVersion: 1,
      savedSongSketches: [
        {
          id: "song-bad",
          title: "Bad take",
          bpm: 92,
          meter: "4/4",
          form: ["A"],
          tracks: {
            drums: [[true]],
            bass: ["C2"],
            chords: ["I"],
            melody: ["E4"]
          },
          capturedMelody: "not-an-array",
          createdAt: "2026-05-31T00:00:00.000Z",
          updatedAt: "2026-05-31T00:00:00.000Z"
        }
      ]
    });

    expect(normalized.savedSongSketches[0].capturedMelody).toBeUndefined();
  });
});
