/**
 * Theory-guided "suggest the next chord" helper for the Song Lab.
 *
 * Pure functions (no React, no Tone.js, no external data, no randomness) that
 * propose strong diatonic continuations for a given Roman numeral and describe
 * short progressions in calm, beginner-friendly language.
 *
 * Numerals follow the same major-key convention used elsewhere in the app
 * (`src/lib/audioEngine.ts`): I ii iii IV V vi viio, plus the common
 * extensions V7 and I6. Suggestions are based on common functional-harmony
 * tendencies and are fully deterministic.
 */
import type { KeyMode } from "./theory";

export type ChordSuggestion = {
  numeral: string;
  reason: string;
  kind: "diatonic" | "spice";
};

/**
 * Tendency moves keyed by the current numeral. Each entry lists three strong
 * diatonic continuations followed by one "spice" option (a borrowed chord or
 * secondary dominant). Reasons are plain-language and non-judgmental.
 */
const TENDENCY_TABLE: Record<string, ChordSuggestion[]> = {
  I: [
    { numeral: "IV", reason: "IV opens the pre-chorus lift.", kind: "diatonic" },
    { numeral: "V", reason: "V builds tension that pulls back home.", kind: "diatonic" },
    { numeral: "vi", reason: "vi is a soft, relative-minor landing.", kind: "diatonic" },
    { numeral: "V7/V", reason: "V7/V is a secondary dominant that aims at V for an extra push.", kind: "spice" }
  ],
  ii: [
    { numeral: "V", reason: "ii flows naturally into V, the classic setup.", kind: "diatonic" },
    { numeral: "V7", reason: "V7 sharpens the pull toward home.", kind: "diatonic" },
    { numeral: "viio", reason: "viio shares V's tension and leans toward I.", kind: "diatonic" },
    { numeral: "bII", reason: "bII is a borrowed Neapolitan color before the cadence.", kind: "spice" }
  ],
  iii: [
    { numeral: "vi", reason: "iii settles gently onto vi.", kind: "diatonic" },
    { numeral: "IV", reason: "IV opens things back up after iii.", kind: "diatonic" },
    { numeral: "ii", reason: "ii steps toward a clean cadence.", kind: "diatonic" },
    { numeral: "V7/vi", reason: "V7/vi is a secondary dominant that spotlights vi.", kind: "spice" }
  ],
  IV: [
    { numeral: "V", reason: "IV to V is the steady walk into the cadence.", kind: "diatonic" },
    { numeral: "I", reason: "IV falls home to I for a warm, plagal rest.", kind: "diatonic" },
    { numeral: "ii", reason: "ii keeps the pre-chorus motion going.", kind: "diatonic" },
    { numeral: "iv", reason: "iv is a borrowed minor IV with a bittersweet glow.", kind: "spice" }
  ],
  V: [
    { numeral: "I", reason: "V wants to resolve home to I.", kind: "diatonic" },
    { numeral: "vi", reason: "vi is a deceptive turn that keeps the song going.", kind: "diatonic" },
    { numeral: "V7", reason: "V7 leans even harder toward home.", kind: "diatonic" },
    { numeral: "V7/IV", reason: "V7/IV is a secondary dominant that reframes I as a launch to IV.", kind: "spice" }
  ],
  V7: [
    { numeral: "I", reason: "V7 resolves firmly home to I.", kind: "diatonic" },
    { numeral: "vi", reason: "vi catches V7 in a soft deceptive turn.", kind: "diatonic" },
    { numeral: "I6", reason: "I6 lands home with a lighter, lifted bass.", kind: "diatonic" },
    { numeral: "bVII", reason: "bVII is a borrowed rock-flavored detour before resolving.", kind: "spice" }
  ],
  vi: [
    { numeral: "IV", reason: "vi to IV is the heart of the pop loop.", kind: "diatonic" },
    { numeral: "ii", reason: "ii continues the gentle climb toward V.", kind: "diatonic" },
    { numeral: "V", reason: "V re-energizes the phrase after vi.", kind: "diatonic" },
    { numeral: "V7/ii", reason: "V7/ii is a secondary dominant that leans into ii.", kind: "spice" }
  ],
  viio: [
    { numeral: "I", reason: "viio leans urgently into I.", kind: "diatonic" },
    { numeral: "vi", reason: "vi softens viio's tension with a deceptive step.", kind: "diatonic" },
    { numeral: "I6", reason: "I6 resolves viio with a lighter landing.", kind: "diatonic" },
    { numeral: "V7", reason: "V7 borrows viio's pull with a fuller dominant.", kind: "spice" }
  ],
  I6: [
    { numeral: "IV", reason: "I6 glides smoothly up to IV.", kind: "diatonic" },
    { numeral: "V", reason: "V picks up the motion toward the cadence.", kind: "diatonic" },
    { numeral: "ii", reason: "ii keeps the bass walking onward.", kind: "diatonic" },
    { numeral: "V7/V", reason: "V7/V is a secondary dominant aiming squarely at V.", kind: "spice" }
  ]
};

/**
 * Deterministic fallback used for any numeral not present in the tendency
 * table. Returns the four most common, reliable chords in a key.
 */
const FALLBACK_SUGGESTIONS: ChordSuggestion[] = [
  { numeral: "I", reason: "I is home base, a safe and grounded resting point.", kind: "diatonic" },
  { numeral: "IV", reason: "IV opens the pre-chorus lift.", kind: "diatonic" },
  { numeral: "V", reason: "V builds tension that pulls back home.", kind: "diatonic" },
  { numeral: "vi", reason: "vi is a soft, relative-minor landing.", kind: "spice" }
];

/**
 * Suggest the next chords after `currentNumeral`. Returns three strong diatonic
 * continuations plus one "spice" option (a borrowed chord or secondary
 * dominant), each with a short plain-language reason. Unknown input yields a
 * deterministic fallback (I, IV, V, vi). The `mode` argument is accepted for
 * forward-compatibility; suggestions currently use the major-key tendency set.
 */
export function suggestNextChords(
  currentNumeral: string,
  mode: KeyMode = "major"
): ChordSuggestion[] {
  void mode;
  const trimmed = currentNumeral.trim();
  const entry = TENDENCY_TABLE[trimmed];

  if (entry) {
    return entry.map((suggestion) => ({ ...suggestion }));
  }

  return FALLBACK_SUGGESTIONS.map((suggestion) => ({ ...suggestion }));
}

type NamedProgression = {
  pattern: string[];
  describe: (mode: KeyMode) => string;
};

const NAMED_PROGRESSIONS: NamedProgression[] = [
  {
    pattern: ["I", "V", "vi", "IV"],
    describe: () =>
      "The four-chord pop loop: stable, uplifting, and endlessly singable."
  },
  {
    pattern: ["I", "IV", "V"],
    describe: () =>
      "The three-chord backbone: bright, direct, and built for sing-alongs."
  },
  {
    pattern: ["ii", "V", "I"],
    describe: () =>
      "The ii\u2013V\u2013I cadence: the smooth turnaround at the heart of jazz."
  },
  {
    pattern: ["I", "IV", "I", "V"],
    describe: () =>
      "A twelve-bar blues shape: call-and-response that always circles home."
  }
];

function matchesPattern(numerals: string[], pattern: string[]): boolean {
  if (numerals.length !== pattern.length) {
    return false;
  }

  return numerals.every((numeral, index) => numeral.trim() === pattern[index]);
}

/**
 * Describe a short Roman-numeral progression in one calm, plain line. Detects a
 * few well-known shapes (I\u2013V\u2013vi\u2013IV, I\u2013IV\u2013V, ii\u2013V\u2013I, and a 12-bar-ish
 * I\u2013IV\u2013I\u2013V) and otherwise falls back to a gentle generic summary.
 */
export function explainProgression(
  numerals: string[],
  mode: KeyMode = "major"
): string {
  if (numerals.length === 0) {
    return `An empty progression in ${mode}.`;
  }

  const named = NAMED_PROGRESSIONS.find((candidate) =>
    matchesPattern(numerals, candidate.pattern)
  );

  if (named) {
    return named.describe(mode);
  }

  return `A ${numerals.length}-chord loop in ${mode}.`;
}
