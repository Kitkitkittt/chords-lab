import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { progressionSymbolsToNumerals } from "../lib/pianoPerformance";
import { PianoStudio } from "./PianoStudio";

function setup() {
  const props = {
    audioEnabled: false,
    reducedMotion: false,
    onComplete: vi.fn(),
    onSendProgression: vi.fn()
  };

  return { props, ...render(<PianoStudio {...props} />) };
}

describe("PianoStudio", () => {
  it("shares one three-octave keyboard across all studio modes", async () => {
    const user = userEvent.setup();
    const { container } = setup();

    expect(screen.getByRole("heading", { name: "Chord Quest" })).toBeInTheDocument();
    expect(screen.getByText("Web MIDI unavailable")).toBeInTheDocument();
    expect(container.querySelectorAll(".digital-piano__key")).toHaveLength(36);

    await user.click(screen.getByRole("tab", { name: "Falling Notes" }));
    expect(screen.getByRole("heading", { name: "Falling Notes" })).toBeInTheDocument();
    expect(container.querySelectorAll(".digital-piano__key")).toHaveLength(36);

    await user.click(screen.getByRole("tab", { name: "Progression Jam" }));
    expect(screen.getByRole("heading", { name: "Progression Jam" })).toBeInTheDocument();
    expect(container.querySelectorAll(".digital-piano__key")).toHaveLength(36);
  });

  it("records a completed chord quest through the studio boundary", () => {
    const { props } = setup();

    for (const note of ["C3", "E3", "G3"]) {
      fireEvent.pointerDown(screen.getByRole("button", { name: note }), { pointerId: 1 });
    }

    expect(props.onComplete).toHaveBeenCalledWith(
      "chord-quest",
      expect.objectContaining({ id: "c", question: "Build C." })
    );
  });

  it("maps progression symbols to playable Song Lab numerals", async () => {
    const user = userEvent.setup();
    const { props } = setup();

    await user.click(screen.getByRole("tab", { name: "Progression Jam" }));
    await user.click(screen.getByRole("button", { name: "Send progression" }));

    expect(props.onSendProgression).toHaveBeenCalledWith(["I", "V", "vi", "IV"]);
    expect(progressionSymbolsToNumerals(["Dm", "G7", "C", "C"])).toEqual([
      "ii",
      "V7",
      "I",
      "I"
    ]);
  });
});
