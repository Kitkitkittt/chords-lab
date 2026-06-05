import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { ProgressProvider } from "../state/progress";
import { ProgressExportPage } from "./ProgressExportPage";

function renderPage() {
  localStorage.clear();

  return render(
    <MemoryRouter>
      <ProgressProvider>
        <ProgressExportPage />
      </ProgressProvider>
    </MemoryRouter>
  );
}

describe("ProgressExportPage", () => {
  it("previews valid progress JSON before import", async () => {
    const user = userEvent.setup();
    renderPage();

    expect(
      screen.getByRole("heading", { name: "Export and import" })
    ).toBeInTheDocument();
    expect(
      (screen.getByLabelText("Progress export JSON") as HTMLTextAreaElement)
        .value
    ).toContain("completedLessonSlugs");

    await user.click(screen.getByLabelText("Progress import JSON"));
    await user.paste(
      JSON.stringify({
        schemaVersion: 1,
        progress: {
          schemaVersion: 1,
          completedLessonSlugs: ["sound-pitch"],
          bookmarkedLessonSlugs: [],
          checkResults: {},
          practiceResults: {},
          practiceMastery: {},
          skillMastery: {},
          generatedSessionHistory: [],
          savedSongSketches: [],
          sync: { enabled: false, provider: "none" },
          settings: { audioEnabled: true, reducedMotion: false }
        }
      })
    );

    expect(screen.getByText("Import preview")).toBeInTheDocument();
    expect(screen.getByText("1 lessons")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /replace local progress/i }));
    expect(screen.getByText("Progress imported locally.")).toBeInTheDocument();
  });
});
