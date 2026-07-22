import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import * as progressRepository from "../lib/progressRepository";
import { rhythmPattern } from "../lib/audioEngine";
import { defaultProgressState, PROGRESS_STORAGE_KEY } from "../lib/progressStorage";
import type { PracticePrompt } from "../lib/practiceEngine";
import { ProgressProvider, useProgress } from "../state/progress";
import { SmartSessionPage } from "./SmartSessionPage";

function renderPage() {
  return render(
    <MemoryRouter>
      <ProgressProvider>
        <SmartSessionPage />
      </ProgressProvider>
    </MemoryRouter>
  );
}

function SameIdReviewHarness({ prompts }: { prompts: [PracticePrompt, PracticePrompt] }) {
  const { progress, queuePracticeReview } = useProgress();

  return (
    <>
      <button type="button" onClick={() => queuePracticeReview(prompts[0].id, "rhythm", prompts[0])}>
        Queue first
      </button>
      <button type="button" onClick={() => queuePracticeReview(prompts[1].id, "rhythm", prompts[1])}>
        Queue second
      </button>
      <output>{Object.values(progress.reviewPrompts).map((prompt) => prompt.question).join("|")}</output>
    </>
  );
}

describe("SmartSessionPage", () => {
  it("waits for primary progress hydration before planning", async () => {
    localStorage.clear();
    vi.stubGlobal("indexedDB", {});
    let resolveHydration!: (progress: typeof defaultProgressState) => void;
    const hydrate = new Promise<typeof defaultProgressState>((resolve) => {
      resolveHydration = resolve;
    });
    const repository = vi.spyOn(progressRepository, "browserProgressRepository")
      .mockReturnValue({
        hydrate: () => hydrate,
        persist: vi.fn().mockResolvedValue(undefined)
      });

    renderPage();
    expect(screen.getByRole("status")).toHaveTextContent("Loading local progress");
    resolveHydration({
      ...defaultProgressState,
      skillMastery: {
        "scale-spelling": {
          correct: 4,
          attempted: 6,
          ease: 2.3,
          intervalDays: 1,
          lapses: 0,
          dueAt: "2020-01-01T00:00:00.000Z",
          reviewQueue: []
        }
      }
    });

    expect(await screen.findByText(/Scale spelling/)).toBeInTheDocument();
    repository.mockRestore();
    vi.unstubAllGlobals();
  });

  it("builds a five-prompt session from persisted due work", () => {
    localStorage.clear();
    localStorage.setItem(
      PROGRESS_STORAGE_KEY,
      JSON.stringify({
        ...defaultProgressState,
        skillMastery: {
          "scale-spelling": {
            correct: 4,
            attempted: 6,
            ease: 2.3,
            intervalDays: 1,
            lapses: 0,
            dueAt: "2020-01-01T00:00:00.000Z",
            reviewQueue: []
          }
        }
      })
    );

    renderPage();

    expect(
      screen.getByRole("heading", { level: 1, name: "Smart session" })
    ).toBeInTheDocument();
    expect(screen.getByText(/5 prompts:/i)).toBeInTheDocument();
    const plan = screen.getByRole("heading", { name: "Your session" }).closest("section");
    expect(plan).not.toBeNull();
    expect(within(plan!).getByText(/Scale spelling/)).toBeInTheDocument();
    expect(within(plan!).getByText("Review")).toBeInTheDocument();
  });

  it("stores the exact skipped prompt for Review", async () => {
    localStorage.clear();
    const user = userEvent.setup();
    renderPage();
    const question = screen.getByText(/.+/, { selector: ".practice-prompt p" }).textContent;

    await user.click(screen.getByRole("button", { name: "Skip" }));

    await waitFor(() => {
      const saved = JSON.parse(localStorage.getItem(PROGRESS_STORAGE_KEY) ?? "{}") as {
        practiceMastery?: Record<string, { reviewQueue: string[] }>;
        reviewPrompts?: Record<string, { question: string }>;
      };
      const promptId = Object.values(saved.practiceMastery ?? {})[0]?.reviewQueue[0];
      expect(promptId).toMatch(/^smart-/);
      expect(saved.reviewPrompts?.[promptId]?.question).toBe(question);
    });
  });

  it("isolates queued snapshots when generated prompt IDs collide", async () => {
    localStorage.clear();
    const user = userEvent.setup();
    const prompt = (question: string, beats: string[]): PracticePrompt => ({
      id: "generated-rhythm-1",
      moduleId: "rhythm",
      kind: "single",
      question,
      choices: ["2 and 4", "1 and 3"],
      answer: ["2 and 4"],
      explanation: "Backbeat.",
      audioNotes: ["C4", "Rest", "C4", "Rest"],
      playbackPattern: rhythmPattern(question, beats),
      renderSpec: {
        type: "instrument",
        instrumentId: "drums",
        highlightedNotes: [],
        rhythmPattern: beats
      }
    });

    render(
      <ProgressProvider>
        <SameIdReviewHarness
          prompts={[
            prompt("First generated groove", ["hit", "rest", "hit", "rest"]),
            prompt("Later generated groove", ["hit", "hit", "hit", "hit"])
          ]}
        />
      </ProgressProvider>
    );
    await user.click(screen.getByRole("button", { name: "Queue first" }));
    await user.click(screen.getByRole("button", { name: "Queue second" }));

    expect(screen.getByText("First generated groove|Later generated groove")).toBeInTheDocument();
    await waitFor(() => {
      const saved = JSON.parse(localStorage.getItem(PROGRESS_STORAGE_KEY) ?? "{}") as {
        reviewPrompts?: Record<string, { question: string; rhythmTokens: string[] }>;
      };
      const snapshots = Object.values(saved.reviewPrompts ?? {});
      expect(snapshots).toHaveLength(2);
      expect(snapshots).toEqual(expect.arrayContaining([
        expect.objectContaining({
          question: "First generated groove",
          rhythmTokens: ["hit", "rest", "hit", "rest"]
        }),
        expect.objectContaining({
          question: "Later generated groove",
          rhythmTokens: ["hit", "hit", "hit", "hit"]
        })
      ]));
    });
  });

  it("completes when the final prompt is skipped", async () => {
    localStorage.clear();
    const user = userEvent.setup();
    renderPage();

    for (let index = 0; index < 5; index += 1) {
      await user.click(screen.getByRole("button", { name: "Skip" }));
    }

    expect(await screen.findByRole("heading", { name: "Done for today" })).toBeInTheDocument();
  });
});
