/**
 * Progression spotter (V8 Phase 4).
 *
 * Pure, deterministic helpers for finding which repertoire songs use a given
 * Roman-numeral progression. Matching is cyclic: a song's numeral loop is
 * treated as repeating, so a query that wraps around the end of the loop (for
 * example [V, I] against a song ending on V) still matches.
 *
 * No React, no audio, no randomness — just array comparison over the data in
 * `src/data/repertoire.ts`.
 */
import { repertoireSongs, type RepertoireSong } from "../data/repertoire";

export type ProgressionMatch = {
  song: RepertoireSong;
  /** Index in the song's loop where the query begins. */
  matchedAt: number;
};

/**
 * Trim surrounding whitespace from each numeral token. Case is preserved on
 * purpose because case distinguishes quality (e.g. I vs i, IV vs iv).
 */
export function normalizeNumerals(numerals: string[]): string[] {
  return numerals.map((numeral) => numeral.trim());
}

function cyclicMatchIndex(loop: string[], query: string[]): number {
  if (query.length === 0) {
    return -1;
  }
  if (query.length > loop.length) {
    return -1;
  }

  for (let start = 0; start < loop.length; start += 1) {
    let matched = true;
    for (let offset = 0; offset < query.length; offset += 1) {
      if (loop[(start + offset) % loop.length] !== query[offset]) {
        matched = false;
        break;
      }
    }
    if (matched) {
      return start;
    }
  }

  return -1;
}

export function findSongsWithProgression(
  query: string[],
  songs: RepertoireSong[] = repertoireSongs
): ProgressionMatch[] {
  const normalizedQuery = normalizeNumerals(query);
  if (normalizedQuery.length === 0) {
    return [];
  }

  const matches: ProgressionMatch[] = [];
  for (const song of songs) {
    const matchedAt = cyclicMatchIndex(normalizeNumerals(song.numerals), normalizedQuery);
    if (matchedAt !== -1) {
      matches.push({ song, matchedAt });
    }
  }

  return matches.sort((a, b) => a.song.id.localeCompare(b.song.id));
}

export function commonProgressions(): { name: string; numerals: string[] }[] {
  return [
    { name: "I–V–vi–IV", numerals: ["I", "V", "vi", "IV"] },
    { name: "I–IV–V", numerals: ["I", "IV", "V"] },
    { name: "ii–V–I", numerals: ["ii", "V", "I"] },
    {
      name: "12-bar blues",
      numerals: ["I", "I", "I", "I", "IV", "IV", "I", "I", "V", "IV", "I", "V"]
    },
    { name: "50s progression", numerals: ["I", "vi", "IV", "V"] },
    { name: "Pachelbel", numerals: ["I", "V", "vi", "iii", "IV", "I", "IV", "V"] }
  ];
}

export function songsUsingProgressionName(name: string): RepertoireSong[] {
  const progression = commonProgressions().find((entry) => entry.name === name);
  if (!progression) {
    return [];
  }

  return findSongsWithProgression(progression.numerals).map((match) => match.song);
}
