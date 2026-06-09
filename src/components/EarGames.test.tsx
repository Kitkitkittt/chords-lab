import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const calls: unknown[][] = [];
const playChord = vi.fn((...args: unknown[]) => {
  calls.push(args);
  return Promise.resolve("playing");
});
const playSequence = vi.fn((...args: unknown[]) => {
  calls.push(args);
  return Promise.resolve("playing");
});

vi.mock("../lib/audioEngine", async () => {
  const actual = await vi.importActual<typeof import("../lib/audioEngine")>(
    "../lib/audioEngine"
  );
  return {
    ...actual,
    playChord: (...args: unknown[]) => playChord(...args),
    playSequence: (...args: unknown[]) => playSequence(...args)
  };
});

import { EarGames } from "./EarGames";
import { ProgressProvider } from "../state/progress";

function renderGames() {
  return render(
    <ProgressProvider>
      <EarGames />
    </ProgressProvider>
  );
}

describe("EarGames", () => {
  it("frames the games as no-score play", () => {
    renderGames();
    expect(
      screen.getByRole("heading", { level: 2, name: "Ear games" })
    ).toBeInTheDocument();
    expect(screen.getByText(/No score, just play/i)).toBeInTheDocument();
  });

  it("offers each game as a tab", () => {
    renderGames();
    const tabs = screen.getAllByRole("tab");
    expect(tabs.length).toBe(3);
  });

  it("plays the round when Hear it is pressed", async () => {
    const user = userEvent.setup();
    renderGames();
    playSequence.mockClear();
    await user.click(screen.getByRole("button", { name: /Hear it/i }));
    expect(playSequence).toHaveBeenCalled();
  });

  it("reveals the answer after a guess and offers a next round", async () => {
    const user = userEvent.setup();
    renderGames();

    // Interval game is first; pick any option, then expect a reveal.
    const options = screen
      .getByText("Which interval did you hear?")
      .parentElement?.querySelector(".ear-games__options") as HTMLElement;
    const firstOption = within(options).getAllByRole("button")[0];
    await user.click(firstOption);

    expect(
      screen.getByRole("button", { name: /Next round/i })
    ).toBeInTheDocument();
  });
});
