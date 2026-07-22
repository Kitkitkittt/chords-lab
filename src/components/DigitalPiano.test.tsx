import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DigitalPiano } from "./DigitalPiano";

function renderPiano(overrides: Partial<React.ComponentProps<typeof DigitalPiano>> = {}) {
  const props = {
    activeNotes: [],
    startOctave: 3,
    qwertyOctave: 4,
    latch: false,
    noteLabels: true,
    onNoteOn: vi.fn(),
    onNoteOff: vi.fn(),
    onToggle: vi.fn(),
    ...overrides
  };

  return { ...render(<DigitalPiano {...props} />), props };
}

describe("DigitalPiano", () => {
  it("renders three octave keybeds with correct white and black key counts", () => {
    const { container } = renderPiano();

    expect(container.querySelectorAll(".digital-piano__octave")).toHaveLength(3);
    expect(container.querySelectorAll(".digital-piano__key")).toHaveLength(36);
    expect(container.querySelectorAll(".digital-piano__key--white")).toHaveLength(21);
    expect(container.querySelectorAll(".digital-piano__key--black")).toHaveLength(15);
  });

  it("exposes active, target, next, and mistake states", () => {
    const { getByRole } = renderPiano({
      activeNotes: ["C3"],
      targetNotes: ["D3"],
      nextNote: "E3",
      mistakeNote: "F3"
    });

    expect(getByRole("button", { name: "C3" })).toHaveAttribute("data-active", "true");
    expect(getByRole("button", { name: "D3" })).toHaveAttribute("data-target", "true");
    expect(getByRole("button", { name: "E3" })).toHaveAttribute("data-next", "true");
    expect(getByRole("button", { name: "F3" })).toHaveAttribute("data-mistake", "true");
  });

  it("holds notes for pointer input and toggles only once in latch mode", () => {
    const held = renderPiano();
    const heldKey = held.getByRole("button", { name: "C3" });
    const capture = vi.fn();
    Object.defineProperty(heldKey, "setPointerCapture", { configurable: true, value: capture });

    fireEvent.pointerDown(heldKey, { pointerId: 4 });
    fireEvent.pointerUp(heldKey, { pointerId: 4 });

    expect(capture).toHaveBeenCalled();
    expect(held.props.onNoteOn).toHaveBeenCalledWith("C3", 0.8, "pointer:undefined");
    expect(held.props.onNoteOff).toHaveBeenCalledWith("C3", "pointer:undefined");

    const latched = renderPiano({ latch: true });
    const latchedKey = latched.container.querySelector<HTMLButtonElement>("button[aria-label='C3']");
    expect(latchedKey).not.toBeNull();
    fireEvent.pointerDown(latchedKey!, { pointerId: 5 });
    fireEvent.pointerUp(latchedKey!, { pointerId: 5 });

    expect(latched.props.onToggle).toHaveBeenCalledTimes(1);
    expect(latched.props.onToggle).toHaveBeenCalledWith("C3", "pointer:latch");
    expect(latched.props.onNoteOff).not.toHaveBeenCalled();
  });

  it("toggles once for Enter or Space without a click handler", () => {
    const { getByRole, props } = renderPiano();
    const key = getByRole("button", { name: "C3" });

    fireEvent.keyDown(key, { key: "Enter" });
    fireEvent.keyUp(key, { key: "Enter" });
    fireEvent.keyDown(key, { key: " " });
    fireEvent.keyUp(key, { key: " " });

    expect(props.onToggle).toHaveBeenCalledTimes(2);
    expect(props.onToggle).toHaveBeenNthCalledWith(1, "C3");
    expect(props.onToggle).toHaveBeenNthCalledWith(2, "C3");
  });

  it("shows QWERTY mapping only in the configured octave", () => {
    const { getByRole, queryByText } = renderPiano({ startOctave: 3, qwertyOctave: 4 });

    expect(getByRole("button", { name: "C4" })).toHaveTextContent("C");
    expect(getByRole("button", { name: "C4" })).toHaveTextContent("A");
    expect(queryByText("A", { selector: "button[aria-label='C3'] *" })).toBeNull();
  });

  it("guides chord tones across octaves so inversions stay visible", () => {
    const { getByRole } = renderPiano({ targetNotes: ["C4", "E4", "G4"] });

    expect(getByRole("button", { name: "C3" })).toHaveAttribute("data-target", "true");
    expect(getByRole("button", { name: "E5" })).toHaveAttribute("data-target", "true");
    expect(getByRole("button", { name: "D4" })).toHaveAttribute("data-target", "false");
  });

  it("highlights flat targets on their sharp-rendered keyboard keys", () => {
    const { getByRole } = renderPiano({ targetNotes: ["Bb4", "Eb4"] });

    expect(getByRole("button", { name: "A#3" })).toHaveAttribute("data-target", "true");
    expect(getByRole("button", { name: "D#5" })).toHaveAttribute("data-target", "true");
    expect(getByRole("button", { name: "B4" })).toHaveAttribute("data-target", "false");
  });

  it("highlights only the exact Falling Notes octave", () => {
    const { getByRole } = renderPiano({
      targetNotes: ["C4"],
      exactTargetNotes: true,
      nextNote: "C4"
    });

    expect(getByRole("button", { name: "C4" })).toHaveAttribute("data-target", "true");
    expect(getByRole("button", { name: "C4" })).toHaveAttribute("data-next", "true");
    expect(getByRole("button", { name: "C3" })).toHaveAttribute("data-target", "false");
    expect(getByRole("button", { name: "C5" })).toHaveAttribute("data-target", "false");
  });
});
