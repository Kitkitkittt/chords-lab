import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { generatePlacementPrompts } from "../lib/placement";
import { defaultProgressState, writeProgressState } from "../lib/progressStorage";
import { ProgressProvider } from "../state/progress";
import { PlacementPage } from "./PlacementPage";

describe("PlacementPage", () => {
  it("offers an optional untimed check with a regular-practice exit", async () => {
    localStorage.clear();
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <ProgressProvider>
          <PlacementPage />
        </ProgressProvider>
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: "Optional placement check" })).toBeInTheDocument();
    expect(screen.getByText(/An optional, untimed pass/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Skip to regular practice" })).toHaveAttribute(
      "href",
      "/practice"
    );
    expect(screen.queryByText("Name the note shown on the staff.")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Start placement" }));
    expect(screen.getByText("Name the note shown on the staff.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Skip" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "End for today" })).not.toBeInTheDocument();
  });

  it("completes after eight answers without changing regular practice", async () => {
    localStorage.clear();
    writeProgressState(localStorage, {
      ...defaultProgressState,
      practiceResults: {
        "pitch-note-c4": { correct: 2, attempted: 3 }
      }
    });
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <ProgressProvider>
          <PlacementPage />
        </ProgressProvider>
      </MemoryRouter>
    );

    await user.click(screen.getByRole("button", { name: "Start placement" }));
    const prompts = generatePlacementPrompts();
    for (const [index, prompt] of prompts.entries()) {
      const choices = within(screen.getByLabelText("Answer choices"));
      for (const answer of prompt.answer) {
        await user.click(choices.getByRole("button", { name: answer }));
      }
      await user.click(screen.getByRole("button", { name: "Check answer" }));
      if (index < prompts.length - 1) {
        await user.click(screen.getByRole("button", { name: "Next prompt" }));
      }
    }

    expect(screen.getByRole("heading", { name: "Placement results" })).toBeInTheDocument();
    const stored = JSON.parse(localStorage.getItem("chordslab.progress.v1") ?? "{}");
    expect(Object.keys(stored.placementResults)).toHaveLength(8);
    expect(stored.practiceResults).toEqual({
      "pitch-note-c4": { correct: 2, attempted: 3 }
    });
    expect(stored.practiceMastery).toEqual({});
    expect(stored.reviewPromptState).toEqual({});
    expect(stored.reviewPrompts).toEqual({});
    expect(stored.skillMastery).toEqual({});
    expect(stored.practiceAttempts).toEqual([]);
    // Thirty-plus interactions, each re-rendering the whole session tree.
    // Measured ~4.4s alone, ~9.4s with the machine saturated.
  }, 20_000);

  it("shows persisted results and resets only when a retake starts", async () => {
    localStorage.clear();
    const placementResults = Object.fromEntries(
      generatePlacementPrompts().map((prompt, index) => [
        prompt.id,
        { correct: index === 0 ? 0 : 1, attempted: 1 }
      ])
    );
    writeProgressState(localStorage, {
      ...defaultProgressState,
      placementResults,
      practiceResults: {
        "pitch-note-c4": { correct: 2, attempted: 3 }
      }
    });
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <ProgressProvider>
          <PlacementPage />
        </ProgressProvider>
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: "Placement results" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Retake placement" }));
    expect(screen.getByText("Name the note shown on the staff.")).toBeInTheDocument();

    const stored = JSON.parse(localStorage.getItem("chordslab.progress.v1") ?? "{}");
    expect(stored.placementResults).toEqual({});
    expect(stored.practiceResults).toEqual({
      "pitch-note-c4": { correct: 2, attempted: 3 }
    });
  });
});
