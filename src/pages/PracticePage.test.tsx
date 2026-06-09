import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { ProgressProvider } from "../state/progress";
import { PracticePage } from "./PracticePage";

vi.mock("../components/LessonComponents", () => ({
  KeyboardFigure: ({ label, active }: { label: string; active: string[] }) => (
    <div aria-label={label}>{active.join(" ")}</div>
  ),
  NotationFigure: ({
    title,
    notation
  }: {
    title: string;
    notation: string;
  }) => <figure aria-label={title}>{notation}</figure>
}));

function renderPracticePage() {
  localStorage.clear();

  return render(
    <MemoryRouter initialEntries={["/practice"]}>
      <ProgressProvider>
        <Routes>
          <Route path="/practice" element={<PracticePage />} />
          <Route path="/practice/:moduleId" element={<PracticePage />} />
        </Routes>
      </ProgressProvider>
    </MemoryRouter>
  );
}

describe("PracticePage", () => {
  it("renders module cards and records pitch and chord attempts", async () => {
    const user = userEvent.setup();
    renderPracticePage();

    expect(
      screen.getByRole("heading", { level: 1, name: "Interactive modules" })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Pitch/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Ear training/i })).toBeInTheDocument();

    const pitchChoices = screen.getByLabelText("Answer choices");
    await user.click(within(pitchChoices).getByRole("button", { name: "C" }));
    await user.click(screen.getByRole("button", { name: /check answer/i }));

    expect(screen.getByLabelText("Practice result")).toHaveTextContent(
      "C4 uses the letter name C"
    );

    await user.click(screen.getByText("Chords").closest("button")!);
    const chordChoices = screen.getByLabelText("Answer choices");
    await user.click(within(chordChoices).getByRole("button", { name: "C" }));
    await user.click(within(chordChoices).getByRole("button", { name: "E" }));
    await user.click(within(chordChoices).getByRole("button", { name: "G" }));
    await user.click(screen.getByRole("button", { name: /check answer/i }));

    expect(screen.getByLabelText("Practice result")).toHaveTextContent(
      "C is spelled C E G"
    );
    expect(localStorage.getItem("chordslab.progress.v1")).toContain(
      "pitch-note-1"
    );
    expect(localStorage.getItem("chordslab.progress.v1")).toContain(
      "chord-builder-1"
    );
    expect(localStorage.getItem("chordslab.progress.v1")).toContain(
      "practiceMastery"
    );
  }, 10000);

  it("shows an in-session progress indicator with prompt count", () => {
    renderPracticePage();

    // Pitch session defaults to 10 prompts; the live indicator shows position.
    expect(screen.getByText(/Prompt 1 of 10/i)).toBeInTheDocument();
  });

  it("supports ordered scale prompts through a module deep link", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/practice/scales"]}>
        <ProgressProvider>
          <Routes>
            <Route path="/practice/:moduleId" element={<PracticePage />} />
          </Routes>
        </ProgressProvider>
      </MemoryRouter>
    );

    const choices = screen.getByLabelText("Answer choices");
    for (const note of ["C", "D", "E", "F", "G", "A", "B", "C"]) {
      await user.click(
        within(choices).getByRole("button", { name: new RegExp(`^${note}$`) })
      );
    }
    await user.click(screen.getByRole("button", { name: /check answer/i }));

    expect(screen.getByLabelText("Practice result")).toHaveTextContent(
      "C major keeps the letter order visible"
    );
  }, 10000);

  it("supports rhythm builder remove, undo, clear, and overfill feedback", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/practice/rhythm"]}>
        <ProgressProvider>
          <Routes>
            <Route path="/practice/:moduleId" element={<PracticePage />} />
          </Routes>
        </ProgressProvider>
      </MemoryRouter>
    );

    const tokens = screen.getByLabelText("Rhythm tokens");
    await user.click(within(tokens).getByRole("button", { name: /Dotted quarter/i }));
    await user.click(within(tokens).getByRole("button", { name: /Dotted quarter/i }));
    await user.click(within(tokens).getByRole("button", { name: /Dotted quarter/i }));

    expect(screen.getByText(/Measure overfilled/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Undo/i }));
    expect(screen.getByText(/Keep building/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Clear/i }));
    expect(screen.getByLabelText("Selected rhythm tokens")).toHaveTextContent(
      "Select rhythm tokens."
    );

    await user.click(within(tokens).getByRole("button", { name: /Hit/i }));
    await user.click(within(tokens).getByRole("button", { name: /^Rest/i }));
    await user.click(
      within(screen.getByLabelText("Selected rhythm tokens")).getByRole("button", {
        name: /1\. hit/i
      })
    );
    expect(screen.getByLabelText("Selected rhythm tokens")).toHaveTextContent("rest");
    expect(screen.getByLabelText("Selected rhythm tokens")).not.toHaveTextContent("hit");

    await user.click(screen.getByRole("button", { name: /Clear/i }));
    expect(screen.getByLabelText("Selected rhythm tokens")).toHaveTextContent(
      "Select rhythm tokens."
    );
  }, 10000);
});
