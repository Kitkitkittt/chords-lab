import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

const playSequence = vi.fn(
  (...args: Parameters<typeof import("../lib/audioEngine").playSequence>) => {
    void args;
    return Promise.resolve("playing" as const);
  }
);
const playRhythm = vi.fn(
  (...args: Parameters<typeof import("../lib/audioEngine").playRhythm>) => {
    void args;
    return Promise.resolve("playing" as const);
  }
);
const getUserMedia = vi.fn();

vi.mock("../lib/audioEngine", async () => {
  const actual = await vi.importActual<typeof import("../lib/audioEngine")>(
    "../lib/audioEngine"
  );
  return {
    ...actual,
    playSequence: (
      label: string,
      notes: string[],
      options: { audioEnabled: boolean }
    ) => playSequence(label, notes, options),
    playRhythm: (
      label: string,
      tokens: string[],
      options: { audioEnabled: boolean }
    ) => playRhythm(label, tokens, options)
  };
});

import { CallResponseGames } from "./CallResponseGames";
import { ProgressProvider } from "../state/progress";

function renderGames() {
  return render(
    <ProgressProvider>
      <CallResponseGames />
    </ProgressProvider>
  );
}

function setMediaDevices(value: MediaDevices | undefined) {
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value
  });
}

afterEach(() => {
  playSequence.mockClear();
  playRhythm.mockClear();
  getUserMedia.mockReset();
  vi.unstubAllGlobals();
});

describe("CallResponseGames", () => {
  it("renders no-score privacy framing and both modes without starting audio or mic", () => {
    renderGames();

    expect(
      screen.getByRole("heading", { level: 2, name: "Call and response" })
    ).toBeInTheDocument();
    expect(screen.getByText(/nothing leaves your device/i)).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Sing back" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Clap back" })).toBeInTheDocument();
    expect(playSequence).not.toHaveBeenCalled();
    expect(playRhythm).not.toHaveBeenCalled();
    expect(getUserMedia).not.toHaveBeenCalled();
  });

  it("plays the selected sing target only when asked", async () => {
    const user = userEvent.setup();
    renderGames();

    await user.click(screen.getByRole("button", { name: "Hear target" }));

    expect(playSequence).toHaveBeenCalledWith(
      "Call and response",
      expect.any(Array),
      expect.objectContaining({ audioEnabled: expect.any(Boolean) })
    );
  });

  it("plays the selected clap target only when asked", async () => {
    const user = userEvent.setup();
    renderGames();

    await user.click(screen.getByRole("tab", { name: "Clap back" }));
    await user.click(screen.getByRole("button", { name: "Hear target" }));

    expect(playRhythm).toHaveBeenCalledWith(
      "Call and response",
      expect.any(Array),
      expect.objectContaining({ audioEnabled: expect.any(Boolean) })
    );
  });

  it("offers Tap instead after microphone access is denied", async () => {
    const user = userEvent.setup();
    getUserMedia.mockRejectedValueOnce(new Error("denied"));
    setMediaDevices({ getUserMedia } as unknown as MediaDevices);
    renderGames();

    await user.click(screen.getByRole("tab", { name: "Clap back" }));
    await user.click(screen.getByRole("button", { name: "Start listening" }));

    expect(await screen.findByRole("button", { name: "Tap instead" })).toBeInTheDocument();
  });

  it("captures and checks clap taps without microphone input", async () => {
    const user = userEvent.setup();
    getUserMedia.mockRejectedValueOnce(new Error("denied"));
    setMediaDevices({ getUserMedia } as unknown as MediaDevices);
    renderGames();

    await user.click(screen.getByRole("tab", { name: "Clap back" }));
    await user.click(screen.getByRole("button", { name: "Start listening" }));
    const tap = await screen.findByRole("button", { name: "Tap instead" });
    await user.click(tap);
    await user.click(tap);
    await user.click(screen.getByRole("button", { name: "Stop & check" }));

    expect(screen.getByText(/Detected 2 claps/i)).toBeInTheDocument();
    expect(screen.getByText(/Try again|Close|Matched/i)).toBeInTheDocument();
  });

  it("releases microphone tracks when listening stops", async () => {
    const user = userEvent.setup();
    const stop = vi.fn();
    const stream = { getTracks: () => [{ stop }] };
    getUserMedia.mockResolvedValueOnce(stream);
    setMediaDevices({ getUserMedia } as unknown as MediaDevices);
    const close = vi.fn(() => Promise.resolve());
    const analyser = {
      fftSize: 2048,
      getFloatTimeDomainData: vi.fn()
    };
    class MockAudioContext {
      sampleRate = 44100;
      createMediaStreamSource() {
        return { connect: vi.fn() };
      }
      createAnalyser() {
        return analyser;
      }
      close = close;
    }
    vi.stubGlobal("AudioContext", MockAudioContext);
    vi.stubGlobal("requestAnimationFrame", vi.fn(() => 1));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    renderGames();

    await user.click(screen.getByRole("button", { name: "Start listening" }));
    await user.click(await screen.findByRole("button", { name: "Stop listening" }));

    expect(stop).toHaveBeenCalled();
    expect(close).toHaveBeenCalled();
  });
});
