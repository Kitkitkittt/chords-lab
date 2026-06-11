import { describe, expect, it } from "vitest";
import { audioBufferToWav, encodeWavBytes } from "./audioEngine";

/**
 * Minimal stand-in for the Web Audio AudioBuffer so the pure WAV encoder can be
 * tested without a real audio context (jsdom has none).
 */
function fakeBuffer(channels: number[][], sampleRate: number): AudioBuffer {
  const length = channels[0]?.length ?? 0;

  return {
    numberOfChannels: channels.length,
    sampleRate,
    length,
    duration: length / sampleRate,
    getChannelData: (channel: number) => Float32Array.from(channels[channel])
  } as unknown as AudioBuffer;
}

function readString(view: DataView, offset: number, length: number): string {
  let text = "";
  for (let i = 0; i < length; i += 1) {
    text += String.fromCharCode(view.getUint8(offset + i));
  }
  return text;
}

describe("encodeWavBytes", () => {
  it("writes a valid RIFF/WAVE header", () => {
    const view = new DataView(
      encodeWavBytes(fakeBuffer([[0, 0.5, -0.5, 1]], 44100))
    );
    expect(readString(view, 0, 4)).toBe("RIFF");
    expect(readString(view, 8, 4)).toBe("WAVE");
    expect(readString(view, 12, 4)).toBe("fmt ");
    expect(readString(view, 36, 4)).toBe("data");
    expect(view.getUint16(20, true)).toBe(1); // PCM
    expect(view.getUint16(22, true)).toBe(1); // mono
    expect(view.getUint32(24, true)).toBe(44100);
    expect(view.getUint16(34, true)).toBe(16); // bits per sample
  });

  it("encodes the right byte length for the sample count", () => {
    const frames = 8;
    const view = new DataView(
      encodeWavBytes(fakeBuffer([new Array(frames).fill(0)], 22050))
    );
    // 44-byte header + frames * channels * 2 bytes (mono, 16-bit).
    expect(view.getUint32(40, true)).toBe(frames * 1 * 2);
    expect(view.byteLength).toBe(44 + frames * 2);
  });

  it("clamps out-of-range samples and round-trips full-scale values", () => {
    const view = new DataView(encodeWavBytes(fakeBuffer([[1, -1, 2, -2]], 8000)));
    expect(view.getInt16(44, true)).toBe(0x7fff);
    expect(view.getInt16(46, true)).toBe(-0x8000);
    expect(view.getInt16(48, true)).toBe(0x7fff); // 2 clamped to 1.0
    expect(view.getInt16(50, true)).toBe(-0x8000); // -2 clamped to -1.0
  });

  it("interleaves stereo channels frame by frame", () => {
    const view = new DataView(
      encodeWavBytes(
        fakeBuffer(
          [
            [1, 0],
            [-1, 0]
          ],
          44100
        )
      )
    );
    expect(view.getUint16(22, true)).toBe(2); // stereo
    expect(view.getInt16(44, true)).toBe(0x7fff); // frame 0 left
    expect(view.getInt16(46, true)).toBe(-0x8000); // frame 0 right
  });

  it("wraps bytes in an audio/wav Blob", () => {
    const blob = audioBufferToWav(fakeBuffer([[0, 0.25]], 44100));
    expect(blob.type).toBe("audio/wav");
    expect(blob.size).toBe(44 + 2 * 2);
  });
});
