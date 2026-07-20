/**
 * Share a Song Lab sketch via URL.
 *
 * Encodes a {@link SongSketch} into a compact, URL-safe token (no backend)
 * and decodes it back through {@link normalizeSongSketch} for safety. Volatile
 * fields (id, createdAt, updatedAt) are stripped before encoding and freshly
 * regenerated on decode so imported sketches never collide.
 *
 * The base64 implementation is manual (over Uint8Array, with TextEncoder /
 * TextDecoder) so it works identically in the browser and in Node / jsdom
 * without relying on Buffer.
 */

import type { SongLabTrackType, SongSketch } from "../types/course";
import { createDefaultSongSketch, normalizeSongSketch } from "./songSketches";

const BASE64_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/** Reverse lookup table: char code -> 6-bit value (or -1 when invalid). */
const BASE64_LOOKUP = (() => {
  const table = new Int16Array(128).fill(-1);
  for (let i = 0; i < BASE64_ALPHABET.length; i += 1) {
    table[BASE64_ALPHABET.charCodeAt(i)] = i;
  }
  return table;
})();

/** Subset of {@link SongSketch} that actually travels in the token. */
type PortableSketch = {
  title: string;
  bpm: number;
  meter: string;
  key?: string;
  mode?: "major" | "minor";
  form: string[];
  tracks: SongSketch["tracks"];
  mutedTracks: SongLabTrackType[];
  soloTracks: SongLabTrackType[];
};

/** Encode raw bytes to a URL-safe base64 string (no padding, `-`/`_`). */
export function bytesToBase64Url(bytes: Uint8Array): string {
  let out = "";

  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const b2 = i + 2 < bytes.length ? bytes[i + 2] : 0;
    const remaining = bytes.length - i;

    out += BASE64_ALPHABET[b0 >> 2];
    out += BASE64_ALPHABET[((b0 & 0x03) << 4) | (b1 >> 4)];
    if (remaining > 1) {
      out += BASE64_ALPHABET[((b1 & 0x0f) << 2) | (b2 >> 6)];
    }
    if (remaining > 2) {
      out += BASE64_ALPHABET[b2 & 0x3f];
    }
  }

  return out.replace(/\+/g, "-").replace(/\//g, "_");
}

/** Decode a URL-safe base64 string back to raw bytes. Throws on bad input. */
export function base64UrlToBytes(token: string): Uint8Array {
  const normalized = token.replace(/-/g, "+").replace(/_/g, "/");
  const length = normalized.length;
  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;

  for (let i = 0; i < length; i += 1) {
    const code = normalized.charCodeAt(i);
    const value = code < 128 ? BASE64_LOOKUP[code] : -1;
    if (value === -1) {
      throw new Error("Invalid base64 character");
    }
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }

  return Uint8Array.from(bytes);
}

/** Pull only the portable fields out of a full sketch. */
function toPortable(sketch: SongSketch): PortableSketch {
  return {
    title: sketch.title,
    bpm: sketch.bpm,
    meter: sketch.meter,
    key: sketch.key,
    mode: sketch.mode,
    form: sketch.form,
    tracks: sketch.tracks,
    mutedTracks: sketch.mutedTracks,
    soloTracks: sketch.soloTracks
  };
}

/** Compress a sketch into a compact, URL-safe token. */
export function encodeSketchToToken(sketch: SongSketch): string {
  const json = JSON.stringify(toPortable(sketch));
  const bytes = new TextEncoder().encode(json);
  return bytesToBase64Url(bytes);
}

/** Generate a fresh import id distinct from locally created sketches. */
function freshImportId(): string {
  return `song-imported-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Decode a token back into a normalized sketch. Returns null on any malformed,
 * oversized, or non-decodable input instead of throwing.
 */
export function decodeTokenToSketch(token: string): SongSketch | null {
  if (typeof token !== "string" || token.length === 0) {
    return null;
  }

  try {
    const bytes = base64UrlToBytes(token);
    const json = new TextDecoder().decode(bytes);
    const parsed = JSON.parse(json) as Partial<PortableSketch>;

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !Array.isArray(parsed.form) ||
      typeof parsed.tracks !== "object" ||
      parsed.tracks === null
    ) {
      return null;
    }

    const base = createDefaultSongSketch();
    const now = new Date().toISOString();

    const merged: SongSketch = {
      ...base,
      title: typeof parsed.title === "string" ? parsed.title : base.title,
      bpm: typeof parsed.bpm === "number" ? parsed.bpm : base.bpm,
      meter: typeof parsed.meter === "string" ? parsed.meter : base.meter,
      key: parsed.key,
      mode: parsed.mode,
      form: parsed.form,
      tracks: parsed.tracks as SongSketch["tracks"],
      mutedTracks: Array.isArray(parsed.mutedTracks) ? parsed.mutedTracks : [],
      soloTracks: Array.isArray(parsed.soloTracks) ? parsed.soloTracks : [],
      id: freshImportId(),
      createdAt: now,
      updatedAt: now
    };

    return normalizeSongSketch(merged);
  } catch {
    return null;
  }
}

/** Build the shareable deep-link URL for a sketch. */
export function buildShareUrl(sketch: SongSketch, origin: string): string {
  const token = encodeSketchToToken(sketch);
  return `${origin}/lab/song/sketches#s=${token}`;
}

/** Extract the `#s=...` token from a location hash, or null when absent. */
export function readSketchTokenFromHash(hash: string): string | null {
  if (typeof hash !== "string") {
    return null;
  }

  const match = hash.match(/[#&]s=([^&]+)/);
  return match?.[1] ? match[1] : null;
}

export function readSketchTokenFromShareTarget(search: string): string | null {
  if (typeof search !== "string") {
    return null;
  }

  try {
    const params = new URLSearchParams(search);
    for (const name of ["url", "text"]) {
      const value = params.get(name);
      if (!value) {
        continue;
      }
      const token = readSketchTokenFromHash(value.slice(value.indexOf("#")));
      if (token) {
        return token;
      }
    }
  } catch {
    return null;
  }

  return null;
}
