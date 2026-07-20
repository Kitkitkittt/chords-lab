/**
 * Tests for the Song Lab sketch share codec.
 */

import { describe, expect, it } from "vitest";
import { createDefaultSongSketch } from "./songSketches";
import {
  buildShareUrl,
  decodeTokenToSketch,
  encodeSketchToToken,
  readSketchTokenFromHash,
  readSketchTokenFromShareTarget
} from "./sketchShare";

describe("sketchShare codec", () => {
  it("round-trips the portable fields of a sketch", () => {
    const sketch = createDefaultSongSketch("Round trip loop");
    const decoded = decodeTokenToSketch(encodeSketchToToken(sketch));

    expect(decoded).not.toBeNull();
    expect(decoded?.title).toBe(sketch.title);
    expect(decoded?.bpm).toBe(sketch.bpm);
    expect(decoded?.meter).toBe(sketch.meter);
    expect(decoded?.key).toBe(sketch.key);
    expect(decoded?.mode).toBe(sketch.mode);
    expect(decoded?.form).toEqual(sketch.form);
    expect(decoded?.tracks).toEqual(sketch.tracks);
  });

  it("regenerates volatile fields on decode", () => {
    const sketch = createDefaultSongSketch("Fresh ids");
    const decoded = decodeTokenToSketch(encodeSketchToToken(sketch));

    expect(decoded?.id).toMatch(/^song-imported-/);
    expect(decoded?.id).not.toBe(sketch.id);
  });

  it("preserves unicode in the title", () => {
    const sketch = createDefaultSongSketch("Café ♭ loop");
    const decoded = decodeTokenToSketch(encodeSketchToToken(sketch));

    expect(decoded?.title).toBe("Café ♭ loop");
  });

  it("returns null for malformed tokens without throwing", () => {
    expect(() => decodeTokenToSketch("not-a-valid-token!!")).not.toThrow();
    expect(decodeTokenToSketch("not-a-valid-token!!")).toBeNull();
  });

  it("returns null for empty input", () => {
    expect(decodeTokenToSketch("")).toBeNull();
  });

  it("reads the token out of a location hash", () => {
    expect(readSketchTokenFromHash("#s=abc")).toBe("abc");
    expect(readSketchTokenFromHash("#other")).toBeNull();
  });

  it("reads a shared sketch token from url or text query parameters", () => {
    expect(
      readSketchTokenFromShareTarget("?url=https%3A%2F%2Fexample.test%2Flab%23s%3Dabc")
    ).toBe("abc");
    expect(readSketchTokenFromShareTarget("?text=Try%20this%20%23s%3Ddef")).toBe(
      "def"
    );
  });

  it("rejects empty or malformed share target values", () => {
    expect(readSketchTokenFromShareTarget("")).toBeNull();
    expect(readSketchTokenFromShareTarget("?url=https%3A%2F%2Fexample.test%2Flab")).toBeNull();
    expect(readSketchTokenFromShareTarget("?text=%E0%A4%A")).toBeNull();
  });

  it("builds a share URL pointing at the sketches route", () => {
    const sketch = createDefaultSongSketch("Shareable");
    const url = buildShareUrl(sketch, "https://example.test");

    expect(url).toContain("/lab/song/sketches#s=");
    expect(url.startsWith("https://example.test/lab/song/sketches#s=")).toBe(
      true
    );
  });

  it("round-trips a sketch carried through a built share URL", () => {
    const sketch = createDefaultSongSketch("Via URL");
    const url = buildShareUrl(sketch, "https://example.test");
    const hash = url.slice(url.indexOf("#"));
    const token = readSketchTokenFromHash(hash);

    expect(token).not.toBeNull();
    const decoded = decodeTokenToSketch(token as string);
    expect(decoded?.title).toBe(sketch.title);
    expect(decoded?.tracks).toEqual(sketch.tracks);
  });
});
