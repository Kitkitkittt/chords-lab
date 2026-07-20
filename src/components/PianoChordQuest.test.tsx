import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";

const { playChord } = vi.hoisted(() => ({
  playChord: vi.fn(() => Promise.resolve("playing"))
}));

vi.mock("../lib/audioEngine", async () => {
  const actual = await vi.importActual<typeof import("../lib/audioEngine")>(
    "../lib/audioEngine"
  );
  return { ...actual, playChord };
});

import { PianoChordQuest } from "./PianoChordQuest";

type Props = ComponentProps<typeof PianoChordQuest>;

function setup(activeNotes: string[] = []) {
  const onTargetNotesChange = vi.fn();
  const onReleaseAll = vi.fn();
  const onComplete = vi.fn();
  const props: Props = {
    activeNotes,
    audioEnabled: true,
    onTargetNotesChange,
    onReleaseAll,
    onComplete
  };
  const view = render(<PianoChordQuest {...props} />);

  return {
    onTargetNotesChange,
    onReleaseAll,
    onComplete,
    rerender: (nextNotes: string[]) =>
      view.rerender(<PianoChordQuest {...props} activeNotes={nextNotes} />)
  };
}

describe("PianoChordQuest", () => {
  it("guides the parent to the initial C quest", () => {
    const { onTargetNotesChange } = setup();

    expect(screen.getByText("Quest: C")).toBeInTheDocument();
    expect(onTargetNotesChange).toHaveBeenLastCalledWith(["C4", "E4", "G4"]);
  });

  it("reports missing notes from active piano input", () => {
    setup(["C4"]);

    expect(screen.getByText("Missing: E, G")).toBeInTheDocument();
    expect(screen.getByText("Extra: None")).toBeInTheDocument();
  });

  it("completes an inversion once and activates one band layer", () => {
    const { onComplete, rerender } = setup(["E3", "G3", "C4"]);

    expect(screen.getByText("Inversion: First inversion")).toBeInTheDocument();
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith({
      id: "c",
      expected: ["C4", "E4", "G4"],
      selected: ["E3", "G3", "C4"],
      question: "Build C."
    });
    expect(screen.getByText("Drums: active")).toBeInTheDocument();
    expect(screen.getByText("Bass: locked")).toBeInTheDocument();

    rerender(["E3", "G3", "C4"]);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("releases notes and guides the next target", async () => {
    const user = userEvent.setup();
    const { onReleaseAll, onTargetNotesChange } = setup();
    onTargetNotesChange.mockClear();

    await user.click(screen.getByRole("button", { name: "Next quest" }));

    expect(onReleaseAll).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Quest: Am")).toBeInTheDocument();
    expect(onTargetNotesChange).toHaveBeenLastCalledWith(["A4", "C5", "E5"]);
  });

  it("plays the target only when explicitly requested", async () => {
    const user = userEvent.setup();
    setup();

    expect(playChord).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Play target" }));
    expect(playChord).toHaveBeenCalledWith("C", ["C4", "E4", "G4"], {
      audioEnabled: true
    });
  });
});
