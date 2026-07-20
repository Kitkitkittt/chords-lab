import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { defaultProgressState, PROGRESS_STORAGE_KEY } from "../lib/progressStorage";
import { ProgressProvider } from "../state/progress";
import { ConfusionDrillsPage } from "./ConfusionDrillsPage";

const pairId = "confusion-%5B%22C%22%2C%22D%22%5D";

function renderPage(route: string) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <ProgressProvider>
        <ConfusionDrillsPage />
      </ProgressProvider>
    </MemoryRouter>
  );
}

describe("ConfusionDrillsPage", () => {
  it("shows a calm empty state when no contrast qualifies", () => {
    localStorage.clear();
    renderPage("/practice/confusions");

    expect(screen.getByText(/No repeated contrasts yet/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /regular practice/i })).toHaveAttribute(
      "href",
      "/practice"
    );
  });

  it("renders the requested qualifying pair as a two-choice prompt", () => {
    localStorage.setItem(
      PROGRESS_STORAGE_KEY,
      JSON.stringify({
        ...defaultProgressState,
        practiceAttempts: [
          {
            promptId: "pitch-1",
            moduleId: "pitch",
            isCorrect: false,
            expected: ["C"],
            selected: ["D"],
            question: "Which note is shown?",
            skillTargets: ["note-reading"],
            attemptedAt: "2026-07-19T10:00:00.000Z"
          },
          {
            promptId: "pitch-2",
            moduleId: "pitch",
            isCorrect: false,
            expected: ["D"],
            selected: ["C"],
            question: "Which note is shown?",
            skillTargets: ["note-reading"],
            attemptedAt: "2026-07-19T11:00:00.000Z"
          }
        ]
      })
    );
    renderPage(`/practice/confusions?pair=${encodeURIComponent(pairId)}`);

    expect(screen.getByRole("heading", { level: 1, name: "C and D" })).toBeInTheDocument();
    expect(screen.getByText("Which note is shown?")).toBeInTheDocument();
    expect(screen.getByLabelText("Answer choices")).toHaveTextContent("C");
    expect(screen.getByLabelText("Answer choices")).toHaveTextContent("D");
  });
});
