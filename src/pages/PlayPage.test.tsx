import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

const playLoop = vi.fn((...args: unknown[]) =>
  Promise.resolve({ stop: vi.fn(), args })
);
const stopLoop = vi.fn();
const attack = vi.fn();
const release = vi.fn();

vi.mock("../lib/audioEngine", async () => {
  const actual = await vi.importActual<typeof import("../lib/audioEngine")>(
    "../lib/audioEngine"
  );
  return {
    ...actual,
    playLoop: (...args: unknown[]) => playLoop(...args),
    stopLoop: (...args: unknown[]) => stopLoop(...args),
    triggerNoteAttack: (...args: unknown[]) => attack(...args),
    triggerNoteRelease: (...args: unknown[]) => release(...args),
    releaseAllLiveNotes: vi.fn()
  };
});

import { PlayPage } from "./PlayPage";
import { ProgressProvider } from "../state/progress";

function renderPlay() {
  return render(
    <MemoryRouter>
      <ProgressProvider>
        <PlayPage />
      </ProgressProvider>
    </MemoryRouter>
  );
}

describe("PlayPage / Jam Room", () => {
  it("frames the page as low-pressure play", () => {
    renderPlay();
    expect(
      screen.getByRole("heading", { level: 1, name: "Play" })
    ).toBeInTheDocument();
    expect(screen.getByText(/No scoring, no timer/i)).toBeInTheDocument();
  });

  it("offers selectable backing vibes", () => {
    renderPlay();
    const vibes = screen.getAllByRole("radio");
    expect(vibes.length).toBeGreaterThanOrEqual(3);
    expect(vibes[0]).toHaveAttribute("aria-checked", "true");
  });

  it("starts a backing loop when play is pressed", async () => {
    const user = userEvent.setup();
    renderPlay();
    await user.click(screen.getByRole("button", { name: /Play loop/i }));
    expect(playLoop).toHaveBeenCalled();
  });

  it("plays a note when a keyboard key is pressed", () => {
    renderPlay();
    const key = screen.getAllByRole("button", { name: /fits the loop/i })[0];
    key.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));
    expect(attack).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ voiceId: "keys" })
    );
  });
});
