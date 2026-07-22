import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TunerPanel } from "./TunerPanel";

const getUserMedia = vi.fn();

function setMediaDevices(value: MediaDevices | undefined) {
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value
  });
}

function streamWith(stop = vi.fn()) {
  return { getTracks: () => [{ stop }] } as unknown as MediaStream;
}

afterEach(() => {
  getUserMedia.mockReset();
  vi.unstubAllGlobals();
  setMediaDevices(undefined);
});

describe("TunerPanel", () => {
  it("shows starting state and ignores a rapid second start", async () => {
    class MockAudioContext {
      sampleRate = 44100;
      close = vi.fn(() => Promise.resolve());
      createMediaStreamSource() {
        return { connect: vi.fn() };
      }
      createAnalyser() {
        return { fftSize: 2048, getFloatTimeDomainData: vi.fn() };
      }
    }
    vi.stubGlobal("AudioContext", MockAudioContext);
    vi.stubGlobal("requestAnimationFrame", vi.fn(() => 1));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    let resolveStream!: (stream: MediaStream) => void;
    getUserMedia.mockImplementationOnce(
      () => new Promise<MediaStream>((resolve) => {
        resolveStream = resolve;
      })
    );
    setMediaDevices({ getUserMedia } as unknown as MediaDevices);
    render(<TunerPanel />);

    fireEvent.click(screen.getByRole("button", { name: "Start tuner" }));
    expect(screen.getByRole("button", { name: "Starting tuner" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Starting tuner" }));
    expect(getUserMedia).toHaveBeenCalledTimes(1);

    const stop = vi.fn();
    resolveStream(streamWith(stop));
    await Promise.resolve();
  });

  it("cleans up a stream that resolves after unmount", async () => {
    class MockAudioContext {
      close = vi.fn(() => Promise.resolve());
      createMediaStreamSource() {
        return { connect: vi.fn() };
      }
      createAnalyser() {
        return { fftSize: 2048, getFloatTimeDomainData: vi.fn() };
      }
    }
    Object.defineProperty(window, "AudioContext", { configurable: true, value: MockAudioContext });
    let resolveStream!: (stream: MediaStream) => void;
    getUserMedia.mockImplementationOnce(
      () => new Promise<MediaStream>((resolve) => {
        resolveStream = resolve;
      })
    );
    setMediaDevices({ getUserMedia } as unknown as MediaDevices);
    const { unmount } = render(<TunerPanel />);

    fireEvent.click(screen.getByRole("button", { name: "Start tuner" }));
    await Promise.resolve();
    unmount();
    const stop = vi.fn();
    resolveStream(streamWith(stop));
    await Promise.resolve();

    expect(stop).toHaveBeenCalledTimes(1);
  });

  it("reports unsupported when AudioContext is unavailable", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("AudioContext", undefined);
    Object.defineProperty(window, "AudioContext", { configurable: true, value: undefined });
    Object.defineProperty(window, "webkitAudioContext", { configurable: true, value: undefined });
    setMediaDevices({ getUserMedia } as unknown as MediaDevices);
    render(<TunerPanel />);

    await user.click(screen.getByRole("button", { name: "Start tuner" }));

    expect(screen.getByRole("status")).toHaveTextContent(/unavailable/i);
    expect(getUserMedia).not.toHaveBeenCalled();
  });
});
