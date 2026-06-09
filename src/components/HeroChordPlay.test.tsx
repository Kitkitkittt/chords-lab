import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

const attack = vi.fn();
const release = vi.fn();
const oneShot = vi.fn();

vi.mock("../lib/audioEngine", async () => {
  const actual = await vi.importActual<typeof import("../lib/audioEngine")>(
    "../lib/audioEngine"
  );
  return {
    ...actual,
    triggerNoteAttack: (...args: unknown[]) => attack(...args),
    triggerNoteRelease: (...args: unknown[]) => release(...args),
    triggerNote: (...args: unknown[]) => oneShot(...args)
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
});
