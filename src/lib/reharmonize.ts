/**
 * Chord-progression reharmonization helper for the Song Lab.
 *
 * Pure functions (no React, no Tone.js, no external data, no randomness) that
 * offer classic reharmonization candidates for a given Roman numeral and map a
 * whole progression to its per-bar options. Every candidate carries a calm,
 * plain-language reason that explains *why* the substitution works musically
 * (shared function, common tones, or voice-leading pull).
 *
 * Numerals follow the same major-key convention used elsewhere in the app
 * (`src/lib/chordSuggest.ts`, `src/lib/audioEngine.ts`): I ii iii IV V vi viio,
 * plus the common extensions V7 and I6, secondary-dominant tokens such as
 * "V7/V" and "V7/vi", and borrowed colors like "iv", "bVII", and "bII".
 *
 * The `mode` argument is accepted on every entry point for forward-
 * compatibility, mirroring `suggestNextChords`. The candidate tables are built
 * around the major-key reading of each numeral; minor-key sketches still get
 * musically sensible options because the techniques (function-preserving
 * substitution, secondary dominants, relative swaps, modal mixture) transfer
 * directly. A future revision can branch on `mode` without changing the API.
 *
 * Output is fully deterministic, and every returned object is a fresh clone so
 * callers can never mutate the shared constant tables.
 */
import type { KeyMode } from "./theory";

export type ReharmonizeOption = {
  numeral: string;
  reason: string;
  technique:
    | "diatonic-substitution"
    | "secondary-dominant"
    | "relative-swap"
    | "borrowed";
};

/**
 * Reharmonization candidates keyed by the current numeral. Each entry mixes the
 * four classic techniques: a function-preserving diatonic substitution, a
 * secondary dominant aimed at a common destination, a relative major/minor
 * swap, and one tasteful borrowed (modal-mixture) color. Reasons are plain-
 * language and non-judgmental.
 */
const REHARMONIZE_TABLE: Record<string, ReharmonizeOption[]> = {
  I: [
    {
      numeral: "vi",
      reason:
        "vi shares two tones with I and keeps the tonic feeling, just a touch softer.",
      technique: "diatonic-substitution"
    },
    {
      numeral: "iii",
      reason:
        "iii also overlaps with I, so it rests in the same tonic family with a cooler shade.",
      technique: "diatonic-substitution"
    },
    {
      numeral: "vi",
      reason:
        "Swapping I for its relative minor vi gives the same home base a gentler, reflective mood.",
      technique: "relative-swap"
    },
    {
      numeral: "bVII",
      reason:
        "bVII is borrowed from the parallel minor and lends I a warm, rock-flavored lift.",
      technique: "borrowed"
    }
  ],
  ii: [
    {
      numeral: "IV",
      reason:
        "IV and ii are both subdominant chords sharing tones, so IV stands in smoothly for ii.",
      technique: "diatonic-substitution"
    },
    {
      numeral: "V7/V",
      reason:
        "V7/V is a secondary dominant that leans hard into V, sharpening the usual ii-to-V motion.",
      technique: "secondary-dominant"
    },
    {
      numeral: "IV",
      reason:
        "Reading ii as the relative minor of IV lets you trade in IV for a brighter subdominant.",
      technique: "relative-swap"
    },
    {
      numeral: "bII",
      reason:
        "bII is the borrowed Neapolitan, a lush half-step approach into the cadence.",
      technique: "borrowed"
    }
  ],
  iii: [
    {
      numeral: "I",
      reason:
        "iii and I share two tones, so I gives the same color with a stronger sense of home.",
      technique: "diatonic-substitution"
    },
    {
      numeral: "V7/vi",
      reason:
        "V7/vi is a secondary dominant that spotlights vi, the chord iii often steps toward.",
      technique: "secondary-dominant"
    },
    {
      numeral: "V",
      reason:
        "iii can act as the relative minor of V, so V offers a brighter, more driving option.",
      technique: "relative-swap"
    },
    {
      numeral: "bVII",
      reason:
        "bVII is a borrowed color that recasts iii's mood with an open, modal feel.",
      technique: "borrowed"
    }
  ],
  IV: [
    {
      numeral: "ii",
      reason:
        "ii and IV are both subdominant and share tones, so ii substitutes for IV without losing the pull.",
      technique: "diatonic-substitution"
    },
    {
      numeral: "V7/V",
      reason:
        "V7/V is a secondary dominant that turns the pre-cadence into a stronger push toward V.",
      technique: "secondary-dominant"
    },
    {
      numeral: "ii",
      reason:
        "Trading IV for its relative minor ii keeps the subdominant role with a softer landing.",
      technique: "relative-swap"
    },
    {
      numeral: "iv",
      reason:
        "iv is the borrowed minor IV, a bittersweet glow that voice-leads beautifully back home.",
      technique: "borrowed"
    }
  ],
  V: [
    {
      numeral: "viio",
      reason:
        "viio shares V's leading tone and tension, so it leans toward I just as strongly.",
      technique: "diatonic-substitution"
    },
    {
      numeral: "V7",
      reason:
        "V7 adds the seventh to V, tightening the voice-leading pull back to the tonic.",
      technique: "diatonic-substitution"
    },
    {
      numeral: "iii",
      reason:
        "Read as the relative minor of V, iii gives the dominant spot a calmer, suspended feel.",
      technique: "relative-swap"
    },
    {
      numeral: "bII",
      reason:
        "bII is the borrowed Neapolitan dominant, a colorful half-step slide into the cadence.",
      technique: "borrowed"
    }
  ],
  V7: [
    {
      numeral: "viio",
      reason:
        "viio carries the same leading-tone tension as V7, so it resolves to I with a lighter touch.",
      technique: "diatonic-substitution"
    },
    {
      numeral: "V7/V",
      reason:
        "V7/V is a secondary dominant that delays the resolution by aiming at V first.",
      technique: "secondary-dominant"
    },
    {
      numeral: "iii",
      reason:
        "iii relates to the dominant family and offers a gentle, less urgent stand-in for V7.",
      technique: "relative-swap"
    },
    {
      numeral: "bII",
      reason:
        "bII is the borrowed Neapolitan, a rich tritone substitution that still falls home to I.",
      technique: "borrowed"
    }
  ],
  vi: [
    {
      numeral: "I",
      reason:
        "vi and I share two tones, so I keeps the same color with a more grounded resolution.",
      technique: "diatonic-substitution"
    },
    {
      numeral: "V7/vi",
      reason:
        "V7/vi is a secondary dominant that arrives on vi with a satisfying, ear-catching pull.",
      technique: "secondary-dominant"
    },
    {
      numeral: "I",
      reason:
        "Swapping vi for its relative major I brightens the phrase while staying in the tonic family.",
      technique: "relative-swap"
    },
    {
      numeral: "bVII",
      reason:
        "bVII is a borrowed chord that gives vi an open, anthemic lift toward the next phrase.",
      technique: "borrowed"
    }
  ],
  viio: [
    {
      numeral: "V7",
      reason:
        "V7 contains viio's tones plus a full root, so it shares the same urgent pull toward I.",
      technique: "diatonic-substitution"
    },
    {
      numeral: "V7/V",
      reason:
        "V7/V is a secondary dominant that redirects viio's tension toward V instead of I.",
      technique: "secondary-dominant"
    },
    {
      numeral: "V",
      reason:
        "V is the larger dominant family chord viio belongs to, offering a fuller resolution.",
      technique: "relative-swap"
    },
    {
      numeral: "bII",
      reason:
        "bII is the borrowed Neapolitan, trading viio's tension for a smooth half-step descent.",
      technique: "borrowed"
    }
  ],
  I6: [
    {
      numeral: "vi",
      reason:
        "vi shares tones with the tonic, so it stands in for I6 while keeping the lifted, gentle feel.",
      technique: "diatonic-substitution"
    },
    {
      numeral: "V7/IV",
      reason:
        "V7/IV is a secondary dominant that reframes the tonic as a launch toward IV.",
      technique: "secondary-dominant"
    },
    {
      numeral: "vi",
      reason:
        "Reading I6 as its relative minor vi keeps the home feeling with a softer, introspective color.",
      technique: "relative-swap"
    },
    {
      numeral: "bVII",
      reason:
        "bVII is borrowed from the parallel minor, adding a warm, modal glow to the tonic.",
      technique: "borrowed"
    }
  ]
};

/**
 * Deterministic fallback used for any numeral not present in the table. Offers
 * safe tonic-family and subdominant substitutions that work in nearly any
 * context, so unknown input still yields musically sensible options.
 */
const FALLBACK_OPTIONS: ReharmonizeOption[] = [
  {
    numeral: "vi",
    reason:
      "vi is a soft tonic-family substitute that shares tones with the home chord.",
    technique: "diatonic-substitution"
  },
  {
    numeral: "IV",
    reason:
      "IV is a reliable subdominant that opens space and voice-leads smoothly onward.",
    technique: "diatonic-substitution"
  },
  {
    numeral: "ii",
    reason:
      "ii is the other subdominant option, stepping naturally toward a cadence.",
    technique: "diatonic-substitution"
  },
  {
    numeral: "iv",
    reason:
      "iv is a borrowed minor subdominant that adds a tasteful, bittersweet color.",
    technique: "borrowed"
  }
];

/**
 * Offer reharmonization candidates for a single Roman numeral. Returns a
 * deterministic set spanning the classic techniques (function-preserving
 * diatonic substitution, secondary dominant, relative swap, and borrowed modal
 * mixture), each with a short plain-language reason. Unknown input yields a
 * deterministic fallback of safe tonic-family and subdominant substitutions.
 * The `mode` argument is accepted for forward-compatibility; candidates
 * currently use the major-key reading of each numeral.
 */
export function reharmonizeChord(
  numeral: string,
  mode: KeyMode = "major"
): ReharmonizeOption[] {
  void mode;
  const trimmed = numeral.trim();
  const entry = REHARMONIZE_TABLE[trimmed];

  if (entry) {
    return entry.map((option) => ({ ...option }));
  }

  return FALLBACK_OPTIONS.map((option) => ({ ...option }));
}

/**
 * Map every bar of a Roman-numeral progression to its reharmonization options.
 * Each result records the bar index, the original numeral, and the candidate
 * list from `reharmonizeChord`. An empty progression yields an empty array. The
 * `mode` argument is passed through for forward-compatibility.
 */
export function reharmonizeProgression(
  numerals: string[],
  mode: KeyMode = "major"
): Array<{ barIndex: number; original: string; options: ReharmonizeOption[] }> {
  if (numerals.length === 0) {
    return [];
  }

  return numerals.map((numeral, barIndex) => ({
    barIndex,
    original: numeral,
    options: reharmonizeChord(numeral, mode)
  }));
}
