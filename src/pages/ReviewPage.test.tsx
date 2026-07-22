import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import {
  defaultProgressState,
  PROGRESS_STORAGE_KEY
} from "../lib/progressStorage";

const playPattern = vi.hoisted(() => vi.fn().mockResolvedValue("playing"));

vi.mock("../lib/audioEngine", async () => {
  const actual = await vi.importActual<typeof import("../lib/audioEngine")>(
    "../lib/audioEngine"
  );
  return { ...actual, playPattern };
});
import { ProgressProvider } from "../state/progress";
import type { ProgressState } from "../types/course";
import { ReviewPage } from "./ReviewPage";

function renderReviewPage(progress?: ProgressState) {
  localStorage.clear();
  if (progress) {
    localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
  }

  return render(
    <MemoryRouter>
      <ProgressProvider>
        <ReviewPage />
      </ProgressProvider>
    </MemoryRouter>
  );
}

describe("ReviewPage", () => {
  it("resolves a queued generated prompt from its stored snapshot", () => {
    renderReviewPage({
      ...defaultProgressState,
      practiceMastery: {
        ear: {
          correct: 0,
          attempted: 0,
          streak: 0,
          reviewQueue: ["dictation-melodic-0"]
        }
      },
      reviewPrompts: {
        "dictation-melodic-0": {
          id: "dictation-melodic-0",
          moduleId: "ear",
          kind: "ordered",
          question: "Replay this exact generated melody.",
          choices: ["C", "E", "G"],
          answer: ["C", "E", "G"],
          explanation: "The melody outlines C E G.",
          skillTargets: ["ear-training"],
          inputMode: "sequence",
          audioNotes: ["C4", "E4", "G4"]
        }
      }
    });

    expect(screen.getByText("Replay this exact generated melody.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Play prompt" })).toBeInTheDocument();
  });

  it("reconstructs stored rhythm audio from playback tokens", async () => {
    const user = userEvent.setup();
    playPattern.mockClear();
    renderReviewPage({
      ...defaultProgressState,
      practiceMastery: {
        rhythm: {
          correct: 0,
          attempted: 0,
          streak: 0,
          reviewQueue: ["generated-rhythm-0"]
        }
      },
      reviewPrompts: {
        "generated-rhythm-0": {
          id: "generated-rhythm-0",
          moduleId: "rhythm",
          kind: "grid",
          question: "Replay this exact generated rhythm.",
          choices: ["1 and 3", "2 and 4"],
          answer: ["2 and 4"],
          explanation: "The rhythm preserves its original groove.",
          inputMode: "rhythm-grid",
          audioNotes: ["C4", "Rest", "Rest", "G4"],
          audioMode: "rhythm",
          rhythmTokens: ["dotted-quarter", "tie", "quarter-rest", "hit"]
        }
      }
    });

    await user.click(screen.getByRole("button", { name: "Play prompt" }));

    expect(playPattern).toHaveBeenCalledOnce();
    const pattern = playPattern.mock.calls[0][0];
    expect(pattern.events.map((event: { durationBeats: number }) => event.durationBeats)).toEqual([
      0.75,
      0.35,
      0.35,
      0.35
    ]);
    expect(pattern.events.map((event: { rest?: boolean }) => Boolean(event.rest))).toEqual([
      false,
      true,
      true,
      false
    ]);
  });

  it("records missed prompts into the local review queue", async () => {
    const user = userEvent.setup();
    renderReviewPage();

    expect(
      screen.getByRole("heading", { level: 1, name: "Mixed practice" })
    ).toBeInTheDocument();

    const choices = screen.getByLabelText("Answer choices");
    await user.click(within(choices).getByRole("button", { name: "E4" }));
    const checkButton = screen.getByRole("button", { name: /check answer/i });
    await waitFor(() => expect(checkButton).not.toBeDisabled());
    await user.click(checkButton);

    expect(screen.getByRole("status")).toHaveTextContent("Expected C4");
    expect(localStorage.getItem("chordslab.progress.v1")).toContain(
      "staff-click-1"
    );
  });

  it("offers an Easy/Hard confidence rating after a correct answer", async () => {
    const user = userEvent.setup();
    renderReviewPage();

    // The first review prompt's correct answer is its first expected token.
    // Answer correctly by selecting the staff position note C4.
    const choices = screen.getByLabelText("Answer choices");
    await user.click(within(choices).getByRole("button", { name: "C4" }));
    const checkButton = screen.getByRole("button", { name: /check answer/i });
    await waitFor(() => expect(checkButton).not.toBeDisabled());
    await user.click(checkButton);

    const result = screen.getByRole("status");
    expect(within(result).getByText(/How did that feel\?/i)).toBeInTheDocument();
    expect(
      within(result).getByRole("button", { name: "Easy" })
    ).toBeInTheDocument();
    await user.click(within(result).getByRole("button", { name: "Easy" }));
  });
});
