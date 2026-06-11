/**
 * Public-domain repertoire library (V8 Phase 4).
 *
 * A small, honest collection of traditional / public-domain pieces described
 * only by factual metadata and a diatonic Roman-numeral harmony approximation.
 * No copyrighted lyrics or melodies are stored here — just key, meter, tempo
 * and a teaching-grade chord loop that learners can play back through the
 * audio engine's `romanChordNotes` map.
 *
 * Numerals follow the same major-key convention used elsewhere in the app
 * (`src/lib/audioEngine.ts`): I ii iii IV V vi viio, plus the common
 * extensions V7 and I6. These loops are deliberate teaching approximations,
 * not transcriptions.
 */

export type RepertoireSong = {
  id: string;
  title: string;
  origin: string;
  era: string;
  key: string;
  mode: "major" | "minor";
  meter: string;
  bpm: number;
  numerals: string[];
  skills: string[];
  note: string;
};

export const repertoireSongs: RepertoireSong[] = [
  {
    id: "ode-to-joy",
    title: "Ode to Joy (theme)",
    origin: "Ludwig van Beethoven, Symphony No. 9",
    era: "Classical",
    key: "C",
    mode: "major",
    meter: "4/4",
    bpm: 120,
    numerals: ["I", "I", "V", "I", "IV", "I", "V", "I"],
    skills: ["roman-numerals", "chord-spelling"],
    note: "Stepwise melody over a plain I–IV–V frame — great first harmony to hear."
  },
  {
    id: "greensleeves",
    title: "Greensleeves",
    origin: "Traditional English",
    era: "Renaissance",
    key: "A",
    mode: "minor",
    meter: "6/8",
    bpm: 96,
    numerals: ["vi", "IV", "V", "I"],
    skills: ["roman-numerals", "voice-leading"],
    note: "A lilting compound-meter tune that shows minor color and a strong V pull."
  },
  {
    id: "scarborough-fair",
    title: "Scarborough Fair",
    origin: "Traditional English",
    era: "Medieval / Folk",
    key: "A",
    mode: "minor",
    meter: "3/4",
    bpm: 92,
    numerals: ["vi", "iii", "IV", "I"],
    skills: ["ear-training", "voice-leading"],
    note: "Modal folk melody; the loop leans on the gentle vi–iii–IV pull."
  },
  {
    id: "amazing-grace",
    title: "Amazing Grace",
    origin: "Traditional hymn (Newton / New Britain)",
    era: "Folk hymn",
    key: "G",
    mode: "major",
    meter: "3/4",
    bpm: 80,
    numerals: ["I", "IV", "I", "V", "I", "IV", "I", "I"],
    skills: ["chord-spelling", "rhythm-reading"],
    note: "A waltz-time hymn built almost entirely on I, IV and V."
  },
  {
    id: "twelve-bar-blues-c",
    title: "Twelve-Bar Blues in C",
    origin: "Traditional blues form",
    era: "Early 20th century",
    key: "C",
    mode: "major",
    meter: "4/4",
    bpm: 100,
    numerals: ["I", "I", "I", "I", "IV", "IV", "I", "I", "V", "IV", "I", "V"],
    skills: ["roman-numerals", "rhythm-reading", "ear-training"],
    note: "The classic 12-bar blues frame — the backbone of countless songs."
  },
  {
    id: "canon-in-d",
    title: "Canon in D",
    origin: "Johann Pachelbel",
    era: "Baroque",
    key: "D",
    mode: "major",
    meter: "4/4",
    bpm: 64,
    numerals: ["I", "V", "vi", "iii", "IV", "I", "IV", "V"],
    skills: ["roman-numerals", "voice-leading"],
    note: "The famous descending Pachelbel loop — endless smooth voice-leading."
  },
  {
    id: "auld-lang-syne",
    title: "Auld Lang Syne",
    origin: "Traditional Scottish (Burns)",
    era: "Folk",
    key: "F",
    mode: "major",
    meter: "4/4",
    bpm: 88,
    numerals: ["I", "IV", "I", "V", "I", "IV", "V", "I"],
    skills: ["chord-spelling", "ear-training"],
    note: "A New Year staple resting on a sturdy I–IV–V cadence."
  },
  {
    id: "londonderry-air",
    title: "Londonderry Air (Danny Boy)",
    origin: "Traditional Irish",
    era: "Folk",
    key: "C",
    mode: "major",
    meter: "4/4",
    bpm: 72,
    numerals: ["I", "V", "vi", "IV", "I", "IV", "V", "I"],
    skills: ["voice-leading", "ear-training"],
    note: "A sweeping melody whose loop opens with the popular I–V–vi–IV run."
  },
  {
    id: "house-of-the-rising-sun",
    title: "House of the Rising Sun",
    origin: "Traditional American folk",
    era: "Folk",
    key: "A",
    mode: "minor",
    meter: "6/8",
    bpm: 76,
    numerals: ["vi", "I", "IV", "vi", "vi", "I", "V", "V"],
    skills: ["roman-numerals", "rhythm-reading"],
    note: "A dark compound-meter ballad circling a minor tonic."
  },
  {
    id: "when-the-saints",
    title: "When the Saints Go Marching In",
    origin: "Traditional American gospel",
    era: "Folk gospel",
    key: "C",
    mode: "major",
    meter: "4/4",
    bpm: 112,
    numerals: ["I", "I", "I", "V", "V", "V", "I", "I"],
    skills: ["chord-spelling", "rhythm-reading"],
    note: "An upbeat march that swings between just I and V."
  },
  {
    id: "pop-axis-loop",
    title: "Axis Progression (I–V–vi–IV)",
    origin: "Traditional / common-practice loop",
    era: "Modern teaching form",
    key: "C",
    mode: "major",
    meter: "4/4",
    bpm: 104,
    numerals: ["I", "V", "vi", "IV"],
    skills: ["roman-numerals", "ear-training"],
    note: "The four-chord pop loop in its purest teaching form."
  },
  {
    id: "fifties-doo-wop",
    title: "Fifties Doo-Wop (I–vi–IV–V)",
    origin: "Traditional / common-practice loop",
    era: "Mid 20th century",
    key: "C",
    mode: "major",
    meter: "4/4",
    bpm: 92,
    numerals: ["I", "vi", "IV", "V"],
    skills: ["roman-numerals", "voice-leading"],
    note: "The nostalgic '50s loop that resolves V back to I."
  },
  {
    id: "simple-gifts",
    title: "Simple Gifts",
    origin: "Traditional Shaker tune",
    era: "Folk hymn",
    key: "G",
    mode: "major",
    meter: "2/4",
    bpm: 108,
    numerals: ["I", "I", "V", "I", "IV", "I", "V", "I"],
    skills: ["chord-spelling", "rhythm-reading"],
    note: "A bright Shaker melody anchored by alternating I and V."
  }
];

export function repertoireById(id: string): RepertoireSong | undefined {
  return repertoireSongs.find((song) => song.id === id);
}
