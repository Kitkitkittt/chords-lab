import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const playLoop = vi.fn<
  (pattern: unknown, options: unknown) => Promise<{ stop: () => void }>
>(() => Promise.resolve({ stop: vi.fn() }));
const stopLoop = vi.fn<() => void>();

vi.mock("../lib/audioEngine", async () => {
  const actual = await vi.importActual<typeof import("../lib/audioEngine")>(
    "../lib/audioEngine"
  );
  return {
    ...actual,
    playLoop: (...args: Parameters<typeof playLoop>) => playLoop(...args),
    stopLoop: (...args: Parameters<typeof stopLoop>) => stopLoop(...args)
  };
});

import { PianoProgressionJam } from "./PianoProgressionJam";

type Props = React.ComponentProps<typeof PianoProgressionJam>;

function setup(activeNotes: string[] = []) {
  const props: Props = {
    activeNotes,
    audioEnabled: true,
    onTargetNotesChange: vi.fn(),
    onReleaseAll: vi.fn(),
    onComplete: vi.fn(),
    onSendProgression: vi.fn()
  };
  return { props, ...render(<PianoProgressionJam {...props} />) };
}

function notesFor(symbol: string) {
  return {
    C: ["C3", "E4", "G5"],
    G: ["G3", "B4", "D5"],
    Am: ["A3", "C4", "E5"],
    F: ["F3", "A4", "C5"]
  }[symbol] ?? [];
}

describe("PianoProgressionJam", () => {
  it("guides the initial chord and advances after an exact inversion", async () => {
    const user = userEvent.setup();
    const { props, rerender } = setup();

    expect(screen.getByText("Current chord: C")).toBeInTheDocument();
    expect(props.onTargetNotesChange).toHaveBeenLastCalledWith(["C4", "E4", "G4"]);
    expect(screen.getByRole("button", { name: "Next chord" })).toBeDisabled();

    rerender(<PianoProgressionJam {...props} activeNotes={notesFor("C")} />);
    await user.click(screen.getByRole("button", { name: "Next chord" }));

    expect(props.onReleaseAll).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Current chord: G")).toBeInTheDocument();
  });

  it("records an untimed completion once", async () => {
    const user = userEvent.setup();
    const { props, rerender } = setup();

    for (const symbol of ["C", "G", "Am", "F"]) {
      rerender(<PianoProgressionJam {...props} activeNotes={notesFor(symbol)} />);
      await user.click(screen.getByRole("button", { name: /Next chord|Complete jam/ }));
    }

    expect(props.onComplete).toHaveBeenCalledTimes(1);
    expect(props.onComplete).toHaveBeenCalledWith(
      expect.objectContaining({ id: "c-g-am-f", expected: ["F4", "A4", "C5"] })
    );
  });

  it("starts groove only after the explicit button and changes target on a bar step", async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole("button", { name: "Groove" }));
    expect(playLoop).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Start groove" }));
    expect(playLoop).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Stop groove" })).toBeInTheDocument();

    const [pattern, options] = playLoop.mock.calls[0] as [
      { events: { startBeat: number; track?: string }[] },
      { onStep: (event: { startBeat: number; track?: string }) => void }
    ];
    const nextBar = pattern.events.find(
      (event) => event.track === "drums" && event.startBeat === 4
    );
    expect(nextBar).toBeDefined();
    options.onStep(nextBar!);

    await waitFor(() => {
      expect(screen.getByText("Current chord: G")).toBeInTheDocument();
    });
  });

  it("records one incorrect groove cycle before retrying", async () => {
    const user = userEvent.setup();
    const { props } = setup();

    await user.click(screen.getByRole("button", { name: "Groove" }));
    await user.click(screen.getByRole("button", { name: "Start groove" }));
    const [pattern, options] = playLoop.mock.calls.at(-1) as [
      { events: { startBeat: number; track?: string }[] },
      { onStep: (event: { startBeat: number; track?: string }) => void }
    ];

    const bars = pattern.events.filter(
      (event) => event.track === "drums" && event.startBeat % 4 === 0
    );
    bars.forEach(options.onStep);
    options.onStep(bars[0]);

    await waitFor(() => {
      expect(props.onComplete).toHaveBeenCalledWith(expect.objectContaining({
        isCorrect: false,
        selected: []
      }));
    });
    expect(props.onComplete).toHaveBeenCalledTimes(1);
  });

  it("ignores stale groove callbacks after stopping", async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole("button", { name: "Groove" }));
    await user.click(screen.getByRole("button", { name: "Start groove" }));
    const [, options] = playLoop.mock.calls.at(-1) as [
      unknown,
      { onStep: (event: { startBeat: number; track?: string }) => void }
    ];

    await user.click(screen.getByRole("button", { name: "Stop groove" }));
    options.onStep({ track: "drums", startBeat: 4 });

    expect(screen.getByText("Current chord: C")).toBeInTheDocument();
  });

  it("stops the loop on cleanup", () => {
    const { unmount } = setup();
    stopLoop.mockClear();
    unmount();
    expect(stopLoop).toHaveBeenCalled();
  });

  it("sends the selected progression", async () => {
    const user = userEvent.setup();
    const { props } = setup();

    await user.click(screen.getByRole("button", { name: "Send progression" }));
    expect(props.onSendProgression).toHaveBeenCalledWith(["C", "G", "Am", "F"]);
  });
});
