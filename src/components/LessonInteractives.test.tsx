import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const playChord = vi.fn((...args: unknown[]) => {
  void args;
  return Promise.resolve("playing");
});
const playSequence = vi.fn((...args: unknown[]) => {
  void args;
  return Promise.resolve("playing");
});
const triggerNote = vi.fn();

vi.mock("../lib/audioEngine", async () => {
  const actual = await vi.importActual<typeof import("../lib/audioEngine")>(
    "../lib/audioEngine"
  );
  return {
    ...actual,
    playChord: (...args: unknown[]) => playChord(...args),
    playSequence: (...args: unknown[]) => playSequence(...args),
    triggerNote: (...args: unknown[]) => triggerNote(...args)
  };
});

import { IntervalExplorer, PlayableProgression } from "./LessonInteractives";
import { ProgressProvider } from "../state/progress";

function wrap(node: React.ReactNode) {
  return render(<ProgressProvider>{node}</ProgressProvider>);
}

describe("PlayableProgression", () => {
  it("renders each numeral with its concrete chord", () => {
    wrap(
      <PlayableProgression numerals={["I", "V", "vi", "IV"]} tonic="C" mode="major" />
    );
    // Roman numerals present
    expect(screen.getByText("I")).toBeInTheDocument();
    expect(screen.getByText("vi")).toBeInTheDocument();
    // Concrete chords derived in C major
    expect(screen.getByText("C")).toBeInTheDocument();
    expect(screen.getByText("Am")).toBeInTheDocument();
  });

  it("plays a single chord when a chip is tapped", async () => {
    const user = userEvent.setup();
    wrap(<PlayableProgression numerals={["I", "IV"]} tonic="C" mode="major" />);
    playChord.mockClear();
    await user.click(screen.getByText("C").closest("button")!);
    expect(playChord).toHaveBeenCalled();
  });

  it("plays the whole loop", async () => {
    const user = userEvent.setup();
    wrap(<PlayableProgression numerals={["I", "V"]} tonic="C" mode="major" />);
    playSequence.mockClear();
    await user.click(screen.getByRole("button", { name: /Play loop/i }));
    expect(playSequence).toHaveBeenCalled();
  });
});

describe("IntervalExplorer", () => {
  it("offers a ladder of notes and names the interval on tap", async () => {
    const user = userEvent.setup();
    wrap(<IntervalExplorer root="C4" />);

    const notes = within(
      document.querySelector(".interval-explorer__notes") as HTMLElement
    ).getAllByRole("button");
    expect(notes.length).toBeGreaterThanOrEqual(7);

    // Tapping the 5th note (G) names a perfect fifth.
    playSequence.mockClear();
    await user.click(screen.getByRole("button", { name: "G" }));
    expect(playSequence).toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent(/fifth/i);
  });
});
