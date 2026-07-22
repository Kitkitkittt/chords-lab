import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { defaultProgressState, PROGRESS_STORAGE_KEY } from "../lib/progressStorage";
import { ProgressProvider } from "../state/progress";
import { RoutinesPage } from "./RoutinesPage";

function renderPage() {
  return render(
    <MemoryRouter>
      <ProgressProvider>
        <RoutinesPage />
      </ProgressProvider>
    </MemoryRouter>
  );
}

describe("RoutinesPage", () => {
  it("saves and runs an authored three-step routine", async () => {
    localStorage.clear();
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText("Name"), "My reset");
    await user.click(screen.getByRole("button", { name: "Add Review" }));
    await user.click(screen.getByRole("button", { name: "Add Chords" }));
    await user.click(screen.getByRole("button", { name: "Add Free play" }));

    expect(screen.getByText(/3\/3 steps: Review, Chords, Free play/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add Pitch" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Save routine" }));

    expect(screen.getByRole("status")).toHaveTextContent('Saved "My reset".');
    const saved = screen.getByRole("heading", { name: "Your routines" }).closest("section");
    expect(saved).not.toBeNull();
    expect(within(saved!).getByText("3 steps: review, chords, play.")).toBeInTheDocument();
    await waitFor(() =>
      expect(localStorage.getItem(PROGRESS_STORAGE_KEY)).toContain("My reset")
    );

    await user.click(within(saved!).getByRole("button", { name: "Start" }));
    expect(screen.getByText("Step 1 of 3: Review")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open step" })).toHaveAttribute(
      "href",
      "/review"
    );

    await user.click(screen.getByRole("button", { name: "Next gentle step" }));
    expect(screen.getByText("Step 2 of 3: Chords")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Next gentle step" }));
    await user.click(screen.getByRole("button", { name: "Finish for today" }));

    expect(screen.getByRole("status")).toHaveTextContent(
      "Routine finished for today."
    );
  });

  it("adds and removes a preset", async () => {
    localStorage.clear();
    localStorage.setItem(
      PROGRESS_STORAGE_KEY,
      JSON.stringify({ ...defaultProgressState, completedLessonSlugs: ["sound-pitch"] })
    );
    const user = userEvent.setup();
    renderPage();
    const presets = screen.getByRole("heading", { name: "Presets" }).closest("section");
    expect(presets).not.toBeNull();
    const morningPreset = within(presets!).getByText("Morning warm-up").closest("li");
    expect(morningPreset).not.toBeNull();

    await user.click(within(morningPreset!).getByRole("button", { name: "Add" }));

    const saved = screen.getByRole("heading", { name: "Your routines" }).closest("section");
    expect(saved).not.toBeNull();
    await waitFor(() =>
      expect(within(saved!).getByRole("status")).toHaveTextContent(
        'Added "Morning warm-up".'
      )
    );
    await user.click(within(saved!).getByRole("button", { name: "Remove" }));

    await waitFor(() =>
      expect(within(saved!).getByRole("status")).toHaveTextContent("Routine removed.")
    );
    expect(within(saved!).getByText("No saved routines yet.")).toBeInTheDocument();
  });
});
