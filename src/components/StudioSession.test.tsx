import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Profiler } from "react";
import type { ProfilerOnRenderCallback } from "react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { defaultProgressState, PROGRESS_STORAGE_KEY } from "../lib/progressStorage";
import type { PracticePrompt } from "../lib/practiceEngine";
import { ProgressProvider, useProgress } from "../state/progress";
import { StudioSession } from "./StudioSession";

const prompts: PracticePrompt[] = [{
  id: "studio-render-cost",
  moduleId: "ear",
  kind: "single",
  question: "Which note starts this melody?",
  choices: ["C", "D"],
  answer: ["C"],
  explanation: "The melody starts on C.",
  keyboardNotes: ["C"],
  audioNotes: ["C4"]
}];

function ProgressControls() {
  const { progress, markLessonComplete, setAudioEnabled, setNoteNaming } = useProgress();

  return (
    <>
      <button onClick={() => markLessonComplete("first-lesson")}>Complete lesson</button>
      <button onClick={() => setAudioEnabled(false)}>Mute audio</button>
      <button onClick={() => setNoteNaming("fixed-do")}>Use solfege</button>
      <output aria-label="Completed lessons">{progress.completedLessonSlugs.length}</output>
    </>
  );
}

function ProfiledStudioSession({ onRender }: { onRender: ProfilerOnRenderCallback }) {
  // React 19 propagates lazy context changes when this stable parent bails out,
  // before the Profiler decides whether the session subtree committed.
  return (
    <Profiler id="studio" onRender={onRender}>
      <StudioSession prompts={prompts} label="Ear training" moduleId="ear" />
    </Profiler>
  );
}

describe("StudioSession", () => {
  it("isolates progress writes while preserving live settings and answer persistence", async () => {
    localStorage.clear();
    localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(defaultProgressState));
    const user = userEvent.setup();
    let commits = 0;
    await act(async () => {
      render(
        <MemoryRouter>
          <ProgressProvider>
            <ProgressControls />
            <ProfiledStudioSession onRender={() => { commits += 1; }} />
          </ProgressProvider>
        </MemoryRouter>
      );
    });
    const keyboard = screen.getByLabelText("Ear training keyboard");
    expect(within(keyboard).getByText("C")).toBeInTheDocument();
    const initialCommits = commits;
    expect(initialCommits).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: "Complete lesson" }));

    expect(screen.getByLabelText("Completed lessons")).toHaveTextContent("1");
    expect(commits).toBe(initialCommits);

    await user.click(screen.getByRole("button", { name: "Use solfege" }));
    expect(within(keyboard).getByText("Do")).toBeInTheDocument();
    expect(commits).toBeGreaterThan(initialCommits);
    await user.click(screen.getByRole("button", { name: "Mute audio" }));
    await user.click(screen.getByRole("button", { name: "Play prompt" }));
    expect(await screen.findByText("Audio disabled")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "C" }));
    await user.click(screen.getByRole("button", { name: "Check answer" }));

    await waitFor(() => {
      const saved = JSON.parse(localStorage.getItem(PROGRESS_STORAGE_KEY) ?? "{}");
      expect(saved.practiceResults["studio-render-cost"]).toEqual({ correct: 1, attempted: 1 });
      expect(saved.settings.audioEnabled).toBe(false);
      expect(saved.settings.noteNaming).toBe("fixed-do");
    });
  });
});
