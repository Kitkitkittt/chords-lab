import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const playSequence = vi.fn(
  (...args: Parameters<typeof import("../lib/audioEngine").playSequence>) => {
    void args;
    return Promise.resolve("playing" as const);
  }
);

vi.mock("../lib/audioEngine", () => ({
  playSequence: (label: string, notes: string[], options: { audioEnabled: boolean }) =>
    playSequence(label, notes, options)
}));

import { PianoFallingNotes } from "./PianoFallingNotes";

type Played = { note: string; id: number } | null;

function props(lastPlayed: Played = null, reducedMotion = false) {
  return {
    lastPlayed,
    audioEnabled: true,
    reducedMotion,
    onTargetNotesChange: vi.fn(),
    onReleaseAll: vi.fn(),
    onComplete: vi.fn()
  };
}

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("PianoFallingNotes", () => {
  it("records one incorrect attempt at retry and one correct completion", () => {
    const value = props();
    const view = render(<PianoFallingNotes {...value} />);
    const play = (note: string, id: number) =>
      view.rerender(<PianoFallingNotes {...value} lastPlayed={{ note, id }} />);

    play("C4", 1);
    expect(screen.getByText("Current: D4")).toBeInTheDocument();
    play("F4", 2);
    expect(screen.getByRole("status")).toHaveTextContent("Wrong note");
    expect(value.onComplete).toHaveBeenCalledWith({
      id: "c-major",
      expected: ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5"],
      selected: ["C4", "F4"],
      question: "Play C major ascending.",
      isCorrect: false
    });

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5"].forEach((note, index) => {
      play(note, index + 3);
    });

    expect(value.onComplete).toHaveBeenCalledTimes(2);
    expect(value.onComplete).toHaveBeenLastCalledWith({
      id: "c-major",
      expected: ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5"],
      selected: ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5"],
      question: "Play C major ascending.",
      isCorrect: true
    });
  });

  it("does not run beat mode before Start, then advances missed beats", () => {
    vi.useFakeTimers();
    const value = props();
    render(<PianoFallingNotes {...value} />);

    fireEvent.click(screen.getByRole("radio", { name: "Beat" }));
    act(() => vi.advanceTimersByTime(2000));
    expect(screen.getByText("Current: C4")).toBeInTheDocument();
    expect(value.onComplete).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByRole("status")).toHaveTextContent("Missed C4");
    expect(screen.getByText("Current: D4")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(7000));
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
    expect(value.onComplete).toHaveBeenCalledTimes(1);
    expect(value.onComplete).toHaveBeenLastCalledWith(expect.objectContaining({
      isCorrect: false,
      selected: []
    }));
  });

  it("ignores beat notes and Stop before Start", () => {
    const value = props();
    const view = render(<PianoFallingNotes {...value} />);

    fireEvent.click(screen.getByRole("radio", { name: "Beat" }));
    view.rerender(<PianoFallingNotes {...value} lastPlayed={{ note: "C4", id: 1 }} />);
    fireEvent.click(screen.getByRole("button", { name: "Stop" }));

    expect(value.onComplete).not.toHaveBeenCalled();
  });

  it("records one incomplete result when stopped", () => {
    const value = props();
    const view = render(<PianoFallingNotes {...value} />);

    fireEvent.click(screen.getByRole("radio", { name: "Beat" }));
    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    view.rerender(<PianoFallingNotes {...value} lastPlayed={{ note: "C4", id: 1 }} />);
    fireEvent.click(screen.getByRole("button", { name: "Stop" }));
    fireEvent.click(screen.getByRole("button", { name: "Stop" }));

    expect(value.onComplete).toHaveBeenCalledTimes(1);
    expect(value.onComplete).toHaveBeenCalledWith(expect.objectContaining({
      isCorrect: false,
      selected: ["C4"]
    }));
  });

  it("uses stable reduced-motion lane markup and hears only on request", () => {
    const value = props(null, true);
    render(<PianoFallingNotes {...value} />);

    const lane = screen.getByTestId("falling-notes-lane");
    expect(lane).toHaveAttribute("data-motion", "reduced");
    expect(lane).not.toHaveClass("falling-notes--falling");
    expect(playSequence).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Hear sequence" }));
    expect(playSequence).toHaveBeenCalledWith(
      "Piano falling notes",
      ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5"],
      { audioEnabled: true }
    );
  });
});
