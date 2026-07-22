import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
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
  afterEach(() => {
    Object.defineProperty(navigator, "requestMIDIAccess", {
      configurable: true,
      value: undefined
    });
  });

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

  it("uses roving tab focus and arrow-key mode navigation", () => {
    setup();
    const chordQuest = screen.getByRole("tab", { name: "Chord Quest" });
    const fallingNotes = screen.getByRole("tab", { name: "Falling Notes" });
    const progressionJam = screen.getByRole("tab", { name: "Progression Jam" });

    expect(chordQuest).toHaveAttribute("tabindex", "0");
    expect(fallingNotes).toHaveAttribute("tabindex", "-1");
    expect(fallingNotes).toHaveAttribute("aria-controls", "piano-mode-falling-notes");
    expect(screen.getByRole("tabpanel")).toHaveAttribute(
      "aria-labelledby",
      "piano-mode-tab-chord-quest"
    );

    chordQuest.focus();
    fireEvent.keyDown(chordQuest, { key: "ArrowRight" });
    expect(fallingNotes).toHaveFocus();
    expect(fallingNotes).toHaveAttribute("aria-selected", "true");

    fireEvent.keyDown(fallingNotes, { key: "End" });
    expect(progressionJam).toHaveFocus();
    expect(progressionJam).toHaveAttribute("aria-selected", "true");

    fireEvent.keyDown(progressionJam, { key: "Home" });
    expect(chordQuest).toHaveFocus();
    expect(chordQuest).toHaveAttribute("aria-selected", "true");

    fireEvent.keyDown(chordQuest, { key: "ArrowLeft" });
    expect(progressionJam).toHaveFocus();
  });

  it("reports MIDI device names and prevents duplicate connection attempts", async () => {
    let resolveAccess: (value: {
      inputs: { values: () => Iterable<{ name?: string; onmidimessage: null }> };
      onstatechange: null;
    }) => void = () => {};
    const requestMIDIAccess = vi.fn(() => new Promise<{
      inputs: { values: () => Iterable<{ name?: string; onmidimessage: null }> };
      onstatechange: null;
    }>((resolve) => {
      resolveAccess = resolve;
    }));
    Object.defineProperty(navigator, "requestMIDIAccess", {
      configurable: true,
      value: requestMIDIAccess
    });
    const user = userEvent.setup();
    setup();

    const connect = screen.getByRole("button", { name: "Connect MIDI" });
    await user.click(connect);
    expect(connect).toBeDisabled();
    expect(screen.getByText("Connecting to MIDI devices")).toBeInTheDocument();
    expect(requestMIDIAccess).toHaveBeenCalledTimes(1);

    resolveAccess!({
      inputs: { values: () => [{ name: "Studio Controller", onmidimessage: null }].values() },
      onstatechange: null
    });
    expect(await screen.findByText("MIDI connected: Studio Controller")).toBeInTheDocument();
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

  it("maps key-aware progression symbols to playable Song Lab numerals", async () => {
    const user = userEvent.setup();
    const { props } = setup();

    await user.selectOptions(screen.getByLabelText("Key"), "G");
    expect(screen.getByText("Quest: G")).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: "Progression Jam" }));
    await user.click(screen.getByRole("button", { name: "Send progression" }));

    expect(props.onSendProgression).toHaveBeenCalledWith(["I", "V", "vi", "IV"], "G");
    expect(progressionSymbolsToNumerals(["Dm", "G7", "C", "C"])).toEqual([
      "ii",
      "V7",
      "I",
      "I"
    ]);
  });
});
