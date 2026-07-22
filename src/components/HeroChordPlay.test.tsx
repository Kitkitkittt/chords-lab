import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

const attack = vi.fn();
const release = vi.fn();
const oneShot = vi.fn();
const releaseAll = vi.fn();

vi.mock("../lib/audioEngine", async () => {
  const actual = await vi.importActual<typeof import("../lib/audioEngine")>(
    "../lib/audioEngine"
  );
  return {
    ...actual,
    triggerNoteAttack: (...args: unknown[]) => attack(...args),
    triggerNoteRelease: (...args: unknown[]) => release(...args),
    triggerNote: (...args: unknown[]) => oneShot(...args),
    releaseAllLiveNotes: () => releaseAll()
  };
});

import { HeroChordPlay } from "./HeroChordPlay";
import { ProgressProvider } from "../state/progress";

function renderHero() {
  return render(
    <MemoryRouter>
      <ProgressProvider>
        <HeroChordPlay />
      </ProgressProvider>
    </MemoryRouter>
  );
}

afterEach(() => {
  attack.mockClear();
  release.mockClear();
  oneShot.mockClear();
  releaseAll.mockClear();
  vi.useRealTimers();
});

describe("HeroChordPlay", () => {
  it("invites a first interaction", () => {
    renderHero();
    expect(
      screen.getByRole("heading", { name: /Build a chord/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/Press keys to build a chord/i)).toBeInTheDocument();
  });

  it("names the chord after a preset is played", async () => {
    const user = userEvent.setup();
    renderHero();
    await user.click(screen.getByRole("button", { name: "Fmaj7" }));
    expect(screen.getByRole("status")).toHaveTextContent(/F/);
  });

  it("plays a note on key press", () => {
    renderHero();
    const key = screen.getByRole("button", { name: "C4" });
    key.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));
    expect(attack).toHaveBeenCalledWith(
      "C4",
      expect.objectContaining({ voiceId: "keys" })
    );
  });

  it("releases pressed notes on Clear and unmount", () => {
    const { unmount } = renderHero();
    const key = screen.getByRole("button", { name: "C4" });
    key.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));
    screen.getByRole("button", { name: "Clear" }).click();
    expect(release).toHaveBeenCalledWith("C4", { voiceId: "keys" });

    key.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));
    unmount();
    expect(release).toHaveBeenCalledTimes(2);
    expect(releaseAll).toHaveBeenCalled();
  });

  it("supersedes preset timers and ignores repeated keyboard activation", () => {
    vi.useFakeTimers();
    renderHero();
    screen.getByRole("button", { name: "C" }).click();
    screen.getByRole("button", { name: "Am" }).click();
    vi.runAllTimers();
    expect(oneShot).toHaveBeenCalledTimes(3);

    const key = screen.getByRole("button", { name: "C4" });
    key.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    key.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", repeat: true, bubbles: true }));
    expect(oneShot).toHaveBeenCalledTimes(4);
  });
});
