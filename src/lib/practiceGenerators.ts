import { Chord, Interval, Note, Scale } from "tonal";
import { chordPattern, rhythmPattern, sequencePattern } from "./audioEngine";
import {
  bassTargetsFor,
  chordShapeFor,
  chordToneHighlights,
  scaleDegreeHighlights
} from "./instruments";
import type {
  PracticeDifficulty,
  PracticePrompt,
  PracticeSessionConfig
} from "./practiceEngine";

export type GeneratedPracticeModuleId =
  | "pitch"
  | "staff"
  | "scales"
  | "intervals"
  | "chords"
  | "harmony"
  | "rhythm"
  | "ear"
  | "instruments";

const naturalNotes = ["C", "D", "E", "F", "G", "A", "B"];
const chromaticChoices = [
  "C",
  "C#",
  "D",
  "Eb",
  "E",
  "F",
  "F#",
  "G",
  "Ab",
  "A",
  "Bb",
  "B"
];
const majorKeys = ["C", "G", "D", "F", "Bb", "A", "Eb"];

const staffPool = [
  { note: "C4", letter: "C", clef: "treble" as const, notation: "C4/q" },
  { note: "E4", letter: "E", clef: "treble" as const, notation: "E4/q" },
  { note: "G4", letter: "G", clef: "treble" as const, notation: "G4/q" },
  { note: "A4", letter: "A", clef: "treble" as const, notation: "A4/q" },
  { note: "B4", letter: "B", clef: "treble" as const, notation: "B4/q" },
  { note: "D5", letter: "D", clef: "treble" as const, notation: "D5/q" },
  { note: "F3", letter: "F", clef: "bass" as const, notation: "F3/q" },
  { note: "A3", letter: "A", clef: "bass" as const, notation: "A3/q" },
  { note: "C3", letter: "C", clef: "bass" as const, notation: "C3/q" },
  { note: "E3", letter: "E", clef: "bass" as const, notation: "E3/q" },
  { note: "G2", letter: "G", clef: "bass" as const, notation: "G2/q" },
  { note: "B2", letter: "B", clef: "bass" as const, notation: "B2/q" }
];

const staffPositions = staffPool.map((item, index) => ({
  note: item.note,
  label: `${item.note} on ${item.clef}`,
  step: index % 6,
  clef: item.clef
}));

function hashSeed(seed: string): number {
  return seed.split("").reduce((hash, char) => {
    return (hash * 31 + char.charCodeAt(0)) >>> 0;
  }, 2166136261);
}

function seededIndex(seed: string, index: number, length: number): number {
  const value = (hashSeed(`${seed}:${index}`) + index * 1103515245) >>> 0;

  return value % length;
}

function takeBySeed<T>(items: T[], seed: string, index: number): T {
  if (index === 0) {
    return items[0];
  }

  return items[seededIndex(seed, index, items.length)];
}

function noteName(note: string): string {
  return Note.pitchClass(note) || note.replace(/[0-9]/g, "");
}

function withOctave(notes: string[], startOctave = 4): string[] {
  let octave = startOctave;
  let previousMidi = -1;

  return notes.map((note) => {
    const candidate = `${note}${octave}`;
    let midi = Note.midi(candidate) ?? previousMidi + 1;

    if (previousMidi >= 0 && midi <= previousMidi) {
      octave += 1;
      midi = Note.midi(`${note}${octave}`) ?? midi + 12;
    }

    previousMidi = midi;
    return `${note}${octave}`;
  });
}

function scaleNotes(key: string, topic: string): string[] {
  const normalizedTopic =
    topic === "minor" ? "natural minor" : topic === "modes" ? "dorian" : topic;
  const requested = Scale.get(`${key} ${normalizedTopic}`).notes;

  if (requested.length > 0) {
    return requested;
  }

  if (topic === "pentatonic") {
    return Scale.get(`${key} major pentatonic`).notes;
  }

  if (topic === "chromatic") {
    return chromaticChoices;
  }

  return Scale.get(`${key} major`).notes;
}

function sourceLabelsFor(moduleId: string): string[] {
  if (moduleId === "ear") {
    return ["Teoria exercises", "Ableton Learning Music"];
  }

  if (moduleId === "harmony") {
    return ["Open Music Theory", "MusicTheory.net lessons"];
  }

  if (moduleId === "rhythm") {
    return ["Ableton Learning Music", "Open Music Theory"];
  }

  if (moduleId === "instruments") {
    return ["Open Music Theory", "Ableton Learning Music", "MusicTheory.net lessons"];
  }

  return ["Teoria tutorials", "MusicTheory.net lessons", "Open Music Theory"];
}

export function createPracticeSessionConfig(
  moduleId: GeneratedPracticeModuleId,
  overrides: Partial<PracticeSessionConfig> = {}
): PracticeSessionConfig {
  const promptCount = Number.isFinite(overrides.promptCount)
    ? overrides.promptCount
    : 10;

  return {
    moduleId,
    difficulty: overrides.difficulty ?? "beginner",
    promptCount: Math.max(1, Math.min(promptCount ?? 10, 20)),
    clef: overrides.clef ?? "treble",
    key: overrides.key ?? "C",
    topic: overrides.topic ?? "mixed",
    audioEnabled: overrides.audioEnabled ?? true,
    seed: overrides.seed ?? `${moduleId}-${overrides.key ?? "C"}-${overrides.topic ?? "mixed"}`
  };
}

function enrichPrompt(
  prompt: PracticePrompt,
  config: PracticeSessionConfig,
  index: number,
  skillTargets: string[]
): PracticePrompt {
  return {
    ...prompt,
    generatorId: `${config.moduleId}-generator-v5`,
    difficulty: config.difficulty,
    topicTags: [config.topic, config.key, ...skillTargets],
    sourceLabels: sourceLabelsFor(config.moduleId),
    skillTargets,
    citationLabel: prompt.citationLabel ?? sourceLabelsFor(config.moduleId)[0],
    id: `${prompt.id}-${index + 1}`
  };
}

function generatePitchPrompt(
  config: PracticeSessionConfig,
  index: number
): PracticePrompt {
  const item = takeBySeed(staffPool, config.seed, index);

  return enrichPrompt(
    {
      id: "pitch-note",
      moduleId: "pitch",
      kind: "single",
      inputMode: "choice",
      question: "Name the note shown on the staff.",
      choices: naturalNotes,
      answer: [item.letter],
      explanation: `${item.note} uses the letter name ${item.letter}.`,
      notation: item.notation,
      clef: item.clef,
      keyboardNotes: [item.note],
      renderSpec: {
        type: "staff",
        clef: item.clef,
        notation: item.notation,
        positions:
          config.clef === "mixed"
            ? staffPositions
            : staffPositions.filter((position) => position.clef === item.clef)
      }
    },
    config,
    index,
    ["note-reading", item.clef]
  );
}

function generateStaffPrompt(
  config: PracticeSessionConfig,
  index: number
): PracticePrompt {
  const pool =
    config.clef === "mixed"
      ? staffPool
      : staffPool.filter((item) => item.clef === config.clef);
  const item = takeBySeed(pool.length > 0 ? pool : staffPool, config.seed, index);

  return enrichPrompt(
    {
      id: "staff-click",
      moduleId: "staff",
      kind: "single",
      inputMode: "staff-click",
      question: `Select the staff position for ${item.note}.`,
      choices: staffPool.map((candidate) => candidate.note),
      answer: [item.note],
      explanation: `${item.note} belongs on the ${item.clef} staff position shown in the answer.`,
      notation: item.notation,
      clef: item.clef,
      keyboardNotes: [item.note],
      renderSpec: {
        type: "staff",
        clef: item.clef,
        notation: item.notation,
        positions: staffPositions.filter((position) => position.clef === item.clef)
      }
    },
    config,
    index,
    ["staff-click", item.clef]
  );
}

function generateScalePrompt(
  config: PracticeSessionConfig,
  index: number
): PracticePrompt {
  const key = config.key === "mixed" ? takeBySeed(majorKeys, config.seed, index) : config.key;
  const topics = [
    "major",
    "natural minor",
    "harmonic minor",
    "melodic minor",
    "dorian",
    "mixolydian",
    "major pentatonic",
    "whole tone",
    "chromatic",
    "lydian"
  ];
  const topic =
    config.topic === "mixed" ? takeBySeed(topics, config.seed, index) : config.topic;
  const notes = scaleNotes(key, topic);
  const answer = [...notes, notes[0]];

  return enrichPrompt(
    {
      id: "scale-build",
      moduleId: "scales",
      kind: "ordered",
      inputMode: "sequence",
      question: `Build ${key} ${topic} from tonic to octave.`,
      choices: Array.from(new Set(answer.concat(chromaticChoices))),
      answer,
      explanation: `${key} ${topic} keeps the letter order visible while matching the scale sound.`,
      keyboardNotes: withOctave(answer),
      renderSpec: {
        type: "keyboard",
        notes: answer,
        mode: "scale",
        enharmonicWarnings: answer.some((note) => note.includes("#") || note.includes("b"))
          ? ["Keep the written spelling visible; enharmonic keys may sound identical."]
          : []
      }
    },
    config,
    index,
    ["scale-spelling", topic]
  );
}

function generateIntervalPrompt(
  config: PracticeSessionConfig,
  index: number
): PracticePrompt {
  const pairs = [
    ["C4", "E4"],
    ["C4", "G4"],
    ["D4", "F4"],
    ["E4", "C5"],
    ["F4", "Bb4"],
    ["G4", "F5"],
    ["A3", "C4"],
    ["B3", "D4"],
    ["C4", "C5"],
    ["D4", "A4"]
  ];
  const pair = takeBySeed(pairs, config.seed, index);
  const interval = Interval.distance(pair[0], pair[1]);
  const name = Interval.get(interval).name || interval;

  return enrichPrompt(
    {
      id: "interval-name",
      moduleId: "intervals",
      kind: "single",
      inputMode: "choice",
      question: `Name the interval from ${pair[0]} to ${pair[1]}.`,
      choices: [
        "minor third",
        "major third",
        "perfect fourth",
        "perfect fifth",
        "minor sixth",
        "major sixth",
        "minor seventh",
        "octave"
      ],
      answer: [name],
      explanation: `${noteName(pair[0])} to ${noteName(pair[1])} is ${name}.`,
      keyboardNotes: pair,
      audioNotes: pair,
      playbackPattern: sequencePattern("Interval prompt", pair),
      renderSpec: { type: "audio", notes: pair, mode: "sequence" }
    },
    config,
    index,
    ["interval-quality", "interval-size"]
  );
}

function generateChordPrompt(
  config: PracticeSessionConfig,
  index: number
): PracticePrompt {
  const symbols = [
    "C",
    "Am",
    "Bdim",
    "Caug",
    "C/E",
    "C/G",
    "G7",
    "Dm7",
    "Fmaj7",
    "Em7"
  ];
  const symbol = takeBySeed(symbols, config.seed, index);
  const notes = Chord.get(symbol).notes;

  return enrichPrompt(
    {
      id: "chord-builder",
      moduleId: "chords",
      kind: "chord-builder",
      inputMode: "piano-roll",
      question: `Select the notes in ${symbol}.`,
      choices: chromaticChoices,
      answer: notes,
      explanation: `${symbol} is spelled ${notes.join(" ")}.`,
      keyboardNotes: notes,
      audioNotes: withOctave(notes),
      playbackPattern: chordPattern(`${symbol} chord`, withOctave(notes)),
      renderSpec: {
        type: "keyboard",
        notes,
        mode: "chord",
        enharmonicWarnings: symbol.includes("/")
          ? ["The slash symbol names the bass note, not a new root."]
          : []
      }
    },
    config,
    index,
    ["chord-symbol", notes.length > 3 ? "seventh-chords" : "triads"]
  );
}

function generateHarmonyPrompt(
  config: PracticeSessionConfig,
  index: number
): PracticePrompt {
  const progressions = [
    {
      key: "C",
      labels: ["I", "IV", "V", "I"],
      chords: ["C", "F", "G", "C"],
      name: "authentic return"
    },
    {
      key: "C",
      labels: ["I", "vi", "IV", "V"],
      chords: ["C", "Am", "F", "G"],
      name: "common loop"
    },
    {
      key: "G",
      labels: ["I", "V", "vi", "IV"],
      chords: ["G", "D", "Em", "C"],
      name: "pop loop"
    },
    {
      key: "F",
      labels: ["ii", "V", "I"],
      chords: ["Gm", "C", "F"],
      name: "predominant to tonic"
    },
    {
      key: "C",
      labels: ["I", "V", "vi"],
      chords: ["C", "G", "Am"],
      name: "deceptive cadence setup"
    },
    {
      key: "C",
      labels: ["I", "IV", "I"],
      chords: ["C", "F", "C"],
      name: "plagal motion"
    },
    {
      key: "D",
      labels: ["I", "vi", "ii", "V"],
      chords: ["D", "Bm", "Em", "A"],
      name: "circle preparation"
    },
    {
      key: "A",
      labels: ["I", "V", "vi", "IV"],
      chords: ["A", "E", "F#m", "D"],
      name: "transposed pop loop"
    },
    {
      key: "C",
      labels: ["phrase", "cadence", "period"],
      chords: ["C", "F", "G", "C"],
      name: "phrase analysis"
    },
    {
      key: "G",
      labels: ["verse", "chorus", "bridge"],
      chords: ["G", "Em", "C", "D"],
      name: "form label"
    }
  ];
  const progression = takeBySeed(progressions, config.seed, index);
  const isAnalysis = progression.labels.some((label) =>
    ["phrase", "cadence", "period", "verse", "chorus", "bridge"].includes(label)
  );

  return enrichPrompt(
    {
      id: "harmony-board",
      moduleId: "harmony",
      kind: "ordered",
      inputMode: isAnalysis ? "analysis-board" : "harmony-board",
      question: `Build the ${progression.name} progression in ${progression.key}.`,
      choices: isAnalysis
        ? ["verse", "phrase", "chorus", "cadence", "bridge", "period"]
        : ["I", "ii", "iii", "IV", "V", "vi", "vii°"],
      answer: progression.labels,
      explanation: `${progression.chords.join(" ")} maps to ${progression.labels.join(" ")} in ${progression.key}.`,
      keyboardNotes: progression.chords.flatMap((symbol) => Chord.get(symbol).notes),
      renderSpec: isAnalysis
        ? {
            type: "analysis",
            labels: progression.labels,
            key: progression.key,
            meter: "4/4",
            cadence: progression.labels.includes("cadence") ? "authentic" : undefined,
            form: progression.name
          }
        : {
            type: "harmony",
            key: progression.key,
            numerals: progression.labels,
            slots: progression.labels.map((_, slotIndex) => `Slot ${slotIndex + 1}`)
          }
    },
    config,
    index,
    ["roman-numerals", "progressions"]
  );
}

function generateRhythmPrompt(
  config: PracticeSessionConfig,
  index: number
): PracticePrompt {
  const patterns = [
    {
      label: "quarter rest grid",
      answer: ["hit", "rest", "hit", "hit"],
      explanation: "The second beat is silent but still counted."
    },
    {
      label: "syncopated eighth grid",
      answer: ["hit", "rest", "rest", "hit", "hit", "rest", "hit", "rest"],
      explanation: "Syncopation places some attacks away from the strongest beats."
    },
    {
      label: "triplet grid",
      answer: ["hit", "rest", "hit"],
      explanation: "A triplet divides the beat area into three equal parts."
    },
    {
      label: "dotted-quarter idea",
      answer: ["dotted-quarter", "eighth", "quarter", "quarter"],
      explanation: "A dotted quarter plus an eighth fills two beats before the final quarters."
    },
    {
      label: "tie across the middle",
      answer: ["quarter", "tie", "quarter", "half"],
      explanation: "The tie sustains sound instead of starting a new attack."
    },
    {
      label: "compound-meter pulse",
      answer: ["hit", "rest", "rest", "hit", "rest", "rest"],
      explanation: "Compound meter groups six subdivisions into two larger pulses."
    },
    {
      label: "odd-meter five",
      answer: ["hit", "rest", "hit", "rest", "hit"],
      explanation: "Five-beat patterns can group unevenly while still filling the measure."
    },
    {
      label: "syncopation answer",
      answer: ["rest", "hit", "rest", "hit", "hit", "rest", "rest", "hit"],
      explanation: "The attacks lean into weaker subdivisions."
    },
    {
      label: "rest placement",
      answer: ["quarter", "quarter-rest", "quarter", "quarter-rest"],
      explanation: "Rests use time just like notes."
    },
    {
      label: "rhythm dictation",
      answer: ["hit", "hit", "rest", "hit"],
      explanation: "The heard pattern has two attacks, one rest, then a final attack."
    }
  ];
  const pattern = takeBySeed(patterns, config.seed, index);

  return enrichPrompt(
    {
      id: "rhythm-grid",
      moduleId: "rhythm",
      kind: "grid",
      inputMode: "rhythm-grid",
      question: `Tap the ${pattern.label}.`,
      choices: Array.from(
        new Set([
          "hit",
          "rest",
          "quarter",
          "quarter-rest",
          "half",
          "eighth",
          "dotted-quarter",
          "tie"
        ].concat(pattern.answer))
      ),
      answer: pattern.answer,
      explanation: pattern.explanation,
      audioNotes: pattern.answer.map((value, beatIndex) =>
        value !== "rest" && value !== "quarter-rest" && value !== "tie"
          ? beatIndex % 2 === 0
            ? "C4"
            : "G4"
          : "Rest"
      ),
      playbackPattern: rhythmPattern(pattern.label, pattern.answer),
      visualLabel: "Rhythm grid",
      timeSignature: pattern.answer.length === 6 ? "6/8" : pattern.answer.length === 5 ? "5/4" : "4/4",
      renderSpec: {
        type: "rhythm",
        beats: pattern.answer,
        subdivision: pattern.answer.length === 3 ? "triplet" : "eighth",
        meter: pattern.answer.length === 6 ? "6/8" : pattern.answer.length === 5 ? "5/4" : "4/4",
        targetBeats: pattern.answer.length === 6 ? 2 : pattern.answer.length === 5 ? 5 : 4,
        tokens: [
          { value: "quarter", label: "Quarter", beats: 1 },
          { value: "quarter-rest", label: "Quarter rest", beats: 1 },
          { value: "dotted-quarter", label: "Dotted quarter", beats: 1.5 },
          { value: "eighth", label: "Eighth", beats: 0.5 },
          { value: "tie", label: "Tie", beats: 0 },
          { value: "hit", label: "Hit", beats: 1 },
          { value: "rest", label: "Rest", beats: 1 }
        ]
      }
    },
    config,
    index,
    ["rhythm-grid", pattern.answer.length === 3 ? "tuplets" : "syncopation"]
  );
}

function generateEarPrompt(
  config: PracticeSessionConfig,
  index: number
): PracticePrompt {
  const prompts = [
    {
      label: "perfect fifth",
      choices: ["major third", "perfect fourth", "perfect fifth", "octave"],
      notes: ["C4", "G4"],
      explanation: "C to G is a stable perfect fifth."
    },
    {
      label: "major triad",
      choices: ["major triad", "minor triad", "diminished triad", "dominant seventh"],
      notes: ["C4", "E4", "G4"],
      explanation: "The sound has a major third and perfect fifth above the root."
    },
    {
      label: "authentic cadence",
      choices: ["plagal cadence", "authentic cadence", "deceptive cadence", "half cadence"],
      notes: ["G3", "B3", "D4", "C4", "E4", "G4"],
      explanation: "The dominant sound resolves to tonic."
    },
    {
      label: "minor third",
      choices: ["minor third", "major third", "perfect fourth", "perfect fifth"],
      notes: ["A4", "C5"],
      explanation: "The upper note is three half steps above the lower note."
    },
    {
      label: "minor triad",
      choices: ["major triad", "minor triad", "diminished triad", "augmented triad"],
      notes: ["A3", "C4", "E4"],
      explanation: "The chord has a minor third and perfect fifth above the root."
    },
    {
      label: "dominant seventh",
      choices: ["major triad", "minor seventh", "dominant seventh", "major seventh"],
      notes: ["G3", "B3", "D4", "F4"],
      explanation: "The sound adds a minor seventh to a major triad."
    },
    {
      label: "natural minor",
      choices: ["major", "natural minor", "whole tone", "chromatic"],
      notes: ["A4", "B4", "C5", "D5", "E5", "F5", "G5", "A5"],
      explanation: "The lowered third, sixth, and seventh give the scale its color."
    },
    {
      label: "plagal cadence",
      choices: ["plagal cadence", "authentic cadence", "deceptive cadence", "half cadence"],
      notes: ["F3", "A3", "C4", "C4", "E4", "G4"],
      explanation: "The subdominant sound moves back to tonic."
    },
    {
      label: "syncopated rhythm",
      choices: ["steady quarters", "syncopated rhythm", "triplet rhythm", "whole note"],
      notes: ["Rest", "C4", "Rest", "G4", "C4", "Rest", "Rest", "G4"],
      explanation: "The attacks fall away from the strongest beat positions."
    },
    {
      label: "melodic memory",
      choices: ["C D E", "C E G", "C F E", "G E C"],
      notes: ["C4", "D4", "E4"],
      explanation: "The short melody steps upward through C, D, and E."
    },
    {
      label: "descending bass",
      choices: ["ascending bass", "descending bass", "pedal bass", "repeated bass"],
      notes: ["C3", "B2", "A2", "G2"],
      explanation: "Each bass note moves lower than the previous one."
    },
    {
      label: "pop progression",
      choices: ["I V vi IV", "I IV V I", "ii V I", "I vi ii V"],
      notes: ["C3", "G3", "A3", "F3"],
      explanation: "The bass roots outline the common I V vi IV loop."
    }
  ];
  const prompt = takeBySeed(prompts, config.seed, index);

  return enrichPrompt(
    {
      id: "ear-listening",
      moduleId: "ear",
      kind: "listening",
      inputMode: "listening",
      question: "Play the prompt, then identify the sound.",
      choices: prompt.choices,
      answer: [prompt.label],
      explanation: prompt.explanation,
      audioNotes: prompt.notes,
      playbackPattern: sequencePattern(prompt.label, prompt.notes),
      keyboardNotes: prompt.notes,
      renderSpec: { type: "audio", notes: prompt.notes, mode: "sequence" }
    },
    config,
    index,
    ["ear-training", prompt.label]
  );
}

function generateInstrumentPrompt(
  config: PracticeSessionConfig,
  index: number
): PracticePrompt {
  const prompts = [
    {
      id: "instrument-piano-chord",
      instrumentId: "piano" as const,
      inputMode: "instrument-board" as const,
      question: "On piano, which tone is the third of C major?",
      choices: ["C", "E", "G", "B"],
      answer: ["E"],
      explanation: "C major uses C as root, E as third, and G as fifth.",
      notes: ["C", "E", "G"],
      shapeSymbol: "C"
    },
    {
      id: "instrument-piano-degree",
      instrumentId: "piano" as const,
      inputMode: "instrument-board" as const,
      question: "In C major, which note is scale degree 5?",
      choices: ["C", "D", "G", "B"],
      answer: ["G"],
      explanation: "Scale degree 5 in C major is G.",
      notes: ["C", "D", "E", "F", "G", "A", "B"],
      shapeSymbol: "C"
    },
    {
      id: "instrument-guitar-shape",
      instrumentId: "guitar" as const,
      inputMode: "fretboard" as const,
      question: "Which open guitar shape uses C E G?",
      choices: ["C", "G", "Am", "D"],
      answer: ["C"],
      explanation: "The open C guitar shape sounds the notes C, E, and G.",
      notes: ["C", "E", "G"],
      shapeSymbol: "C"
    },
    {
      id: "instrument-ukulele-shape",
      instrumentId: "ukulele" as const,
      inputMode: "fretboard" as const,
      question: "Which ukulele shape places C on the A string third fret?",
      choices: ["C", "F", "G", "Am"],
      answer: ["C"],
      explanation: "The common C ukulele shape frets the A string at fret 3.",
      notes: ["C", "E", "G"],
      shapeSymbol: "C"
    },
    {
      id: "instrument-bass-root-fifth",
      instrumentId: "bass" as const,
      inputMode: "song-arranger" as const,
      question: "For C major, which bass target is the fifth?",
      choices: ["C", "E", "G", "B"],
      answer: ["G"],
      explanation: "The fifth of C is G, a stable bass target.",
      notes: ["C", "G"],
      shapeSymbol: "C"
    },
    {
      id: "instrument-bass-arpeggio",
      instrumentId: "bass" as const,
      inputMode: "song-arranger" as const,
      question: "Which note starts a C bass arpeggio?",
      choices: ["C", "D", "F", "A"],
      answer: ["C"],
      explanation: "Basslines usually anchor the root before moving to fifths or passing tones.",
      notes: ["C", "G", "C"],
      shapeSymbol: "C"
    },
    {
      id: "instrument-drum-backbeat",
      instrumentId: "drums" as const,
      inputMode: "drum-pad" as const,
      question: "In a basic backbeat, where is the snare strongest?",
      choices: ["1 and 3", "2 and 4", "only 1", "only 4"],
      answer: ["2 and 4"],
      explanation: "A common backbeat places snare emphasis on beats 2 and 4.",
      notes: ["hit", "rest", "hit", "rest"],
      shapeSymbol: "backbeat"
    },
    {
      id: "instrument-drum-repair",
      instrumentId: "drums" as const,
      inputMode: "drum-pad" as const,
      question: "Which drum part usually marks the steady subdivision?",
      choices: ["kick", "snare", "hat", "tom"],
      answer: ["hat"],
      explanation: "The hi-hat often carries the steady subdivision in beginner grooves.",
      notes: ["hit", "hit", "hit", "hit"],
      shapeSymbol: "backbeat"
    },
    {
      id: "instrument-voice-solfege",
      instrumentId: "voice" as const,
      inputMode: "voice-range" as const,
      question: "In movable-do solfege, C in C major is what?",
      choices: ["do", "re", "mi", "sol"],
      answer: ["do"],
      explanation: "The tonic is do in movable-do solfege.",
      notes: ["C4", "D4", "E4", "G4"],
      shapeSymbol: "C"
    },
    {
      id: "instrument-song-apply",
      instrumentId: "piano" as const,
      inputMode: "song-arranger" as const,
      question: "Which Song Lab track should carry chord symbols?",
      choices: ["drums", "bass", "chords", "voice guide"],
      answer: ["chords"],
      explanation: "Chord symbols belong on the chords track before being voiced by piano, guitar, or ukulele.",
      notes: ["C", "E", "G"],
      shapeSymbol: "C"
    }
  ];
  const prompt = takeBySeed(prompts, config.seed, index);
  const degreeLabels =
    prompt.instrumentId === "piano"
      ? prompt.id.includes("degree")
        ? scaleDegreeHighlights("C")
        : chordToneHighlights(prompt.shapeSymbol)
      : undefined;
  const activeNotes =
    prompt.instrumentId === "bass"
      ? bassTargetsFor(prompt.shapeSymbol).map(noteName)
      : prompt.notes;

  return enrichPrompt(
    {
      id: prompt.id,
      moduleId: "instruments",
      kind: "single",
      inputMode: prompt.inputMode,
      question: prompt.question,
      choices: prompt.choices,
      answer: prompt.answer,
      explanation: prompt.explanation,
      keyboardNotes: notesWithSafeOctaves(activeNotes),
      audioNotes: notesWithSafeOctaves(activeNotes),
      playbackPattern:
        prompt.instrumentId === "drums"
          ? rhythmPattern(prompt.shapeSymbol, prompt.notes)
          : sequencePattern(prompt.shapeSymbol, notesWithSafeOctaves(activeNotes)),
      renderSpec: {
        type: "instrument",
        instrumentId: prompt.instrumentId,
        highlightedNotes: activeNotes,
        chordShape:
          prompt.instrumentId === "guitar" ||
          prompt.instrumentId === "ukulele" ||
          prompt.instrumentId === "bass"
            ? chordShapeFor(prompt.instrumentId, prompt.shapeSymbol)
            : undefined,
        degreeLabels,
        scalePattern: prompt.id.includes("degree")
          ? scaleDegreeHighlights("C")
          : undefined,
        rhythmPattern: prompt.instrumentId === "drums" ? prompt.notes : undefined,
        playbackPattern:
          prompt.instrumentId === "drums"
            ? rhythmPattern(prompt.shapeSymbol, prompt.notes)
            : sequencePattern(prompt.shapeSymbol, notesWithSafeOctaves(activeNotes))
      }
    },
    config,
    index,
    ["instrument-application", prompt.instrumentId]
  );
}

function notesWithSafeOctaves(notes: string[]): string[] {
  return notes.map((note) => {
    if (note === "hit" || note === "rest" || /\d/.test(note)) {
      return note;
    }

    return `${note}4`;
  });
}

export function generatePracticePrompts(
  config: PracticeSessionConfig
): PracticePrompt[] {
  const promptCount = Math.max(1, Math.min(config.promptCount, 20));
  const generators: Record<string, (index: number) => PracticePrompt> = {
    pitch: (index) => generatePitchPrompt(config, index),
    staff: (index) => generateStaffPrompt(config, index),
    scales: (index) => generateScalePrompt(config, index),
    intervals: (index) => generateIntervalPrompt(config, index),
    chords: (index) => generateChordPrompt(config, index),
    harmony: (index) => generateHarmonyPrompt(config, index),
    rhythm: (index) => generateRhythmPrompt(config, index),
    ear: (index) => generateEarPrompt(config, index),
    instruments: (index) => generateInstrumentPrompt(config, index)
  };
  const generator = generators[config.moduleId] ?? generators.pitch;

  return Array.from({ length: promptCount }, (_, index) => generator(index));
}

export function practiceTopicsForModule(moduleId: GeneratedPracticeModuleId): string[] {
  const topics: Record<GeneratedPracticeModuleId, string[]> = {
    pitch: ["mixed", "note names", "octaves"],
    staff: ["mixed", "treble", "bass", "ledger lines", "grand staff"],
    scales: [
      "mixed",
      "major",
      "natural minor",
      "harmonic minor",
      "melodic minor",
      "dorian",
      "mixolydian",
      "major pentatonic",
      "whole tone",
      "chromatic"
    ],
    intervals: ["mixed", "generic", "quality", "inversion", "ear"],
    chords: ["mixed", "triads", "seventh chords", "inversions", "voicings"],
    harmony: ["mixed", "roman numerals", "cadences", "circle progressions"],
    rhythm: ["mixed", "rests", "dots", "ties", "tuplets", "syncopation"],
    ear: ["mixed", "intervals", "chords", "scales", "cadences", "rhythm"],
    instruments: [
      "mixed",
      "piano",
      "guitar",
      "bass",
      "drums",
      "voice",
      "ukulele",
      "song lab"
    ]
  };

  return topics[moduleId];
}

export function practiceKeysForDifficulty(
  difficulty: PracticeDifficulty
): string[] {
  return difficulty === "beginner"
    ? ["C", "G", "F", "Am", "Em", "Dm"]
    : ["C", "G", "D", "A", "F", "Bb", "Eb", "Am", "Em", "Bm", "Dm", "Gm"];
}
