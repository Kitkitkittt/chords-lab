import type { PracticePrompt } from "../lib/practiceEngine";
import {
  createPracticeSessionConfig,
  generatePracticePrompts
} from "../lib/practiceGenerators";
import { majorScaleNotes, naturalMinorScaleNotes, triadNotes } from "../lib/music";
import type { GeneratedPracticeModuleId } from "../lib/practiceGenerators";

export type PracticeModuleId = GeneratedPracticeModuleId;

export type PracticeModule = {
  id: PracticeModuleId;
  title: string;
  status: "available";
  summary: string;
  goal: string;
};

export const practiceModules: PracticeModule[] = [
  {
    id: "pitch",
    title: "Pitch",
    status: "available",
    summary: "Name notes from staff and keyboard clues.",
    goal: "Build quick note-name recall without a timer."
  },
  {
    id: "staff",
    title: "Staff",
    status: "available",
    summary: "Treble, bass, ledger line, and clef placement drills.",
    goal: "Connect written position to note names."
  },
  {
    id: "scales",
    title: "Scales",
    status: "available",
    summary: "Scale-degree and key-signature construction checks.",
    goal: "Spell collections from a tonic."
  },
  {
    id: "intervals",
    title: "Intervals",
    status: "available",
    summary: "Name distance, quality, inversion, and sound.",
    goal: "Measure pitch distance by sight and ear."
  },
  {
    id: "chords",
    title: "Chords",
    status: "available",
    summary: "Build triads from root, third, and fifth.",
    goal: "Connect chord symbols to concrete tones."
  },
  {
    id: "harmony",
    title: "Harmony",
    status: "available",
    summary: "Roman numerals, cadences, and common progressions.",
    goal: "Turn chords into musical grammar."
  },
  {
    id: "rhythm",
    title: "Rhythm",
    status: "available",
    summary: "Beat grid, rest, dot, tie, and measure-completion drills.",
    goal: "Read duration through action."
  },
  {
    id: "ear",
    title: "Ear training",
    status: "available",
    summary: "Replayable listening checks for intervals, triads, and rhythm.",
    goal: "Identify short sounds after choosing to play them."
  },
  {
    id: "instruments",
    title: "Instruments",
    status: "available",
    summary: "Apply notes, chords, scales, grooves, and solfege across a band.",
    goal: "Move the same theory idea across piano, strings, drums, and voice."
  }
];

export const pitchPracticePrompts: PracticePrompt[] = [
  {
    id: "pitch-note-c4",
    moduleId: "pitch",
    kind: "single",
    question: "Which note is shown on the staff?",
    choices: ["C", "D", "E", "F"],
    answer: ["C"],
    explanation: "Middle C sits just below the treble staff.",
    citationLabel: "MusicTheory.net lessons",
    notation: "C4/q",
    keyboardNotes: ["C4"]
  },
  {
    id: "pitch-note-e4",
    moduleId: "pitch",
    kind: "single",
    question: "Which note is shown on the staff?",
    choices: ["D", "E", "F", "G"],
    answer: ["E"],
    explanation: "E4 is the first line of the treble staff.",
    citationLabel: "Teoria tutorials",
    notation: "E4/q",
    keyboardNotes: ["E4"]
  },
  {
    id: "pitch-note-g4",
    moduleId: "pitch",
    kind: "single",
    question: "Which note is shown on the staff?",
    choices: ["F", "G", "A", "B"],
    answer: ["G"],
    explanation: "G4 sits on the second line, the line named by treble clef.",
    citationLabel: "Open Music Theory",
    notation: "G4/q",
    keyboardNotes: ["G4"]
  }
];

export const staffPracticePrompts: PracticePrompt[] = [
  {
    id: "staff-treble-c4",
    moduleId: "staff",
    kind: "single",
    question: "Name this ledger-line note below the treble staff.",
    choices: ["A", "B", "C", "D"],
    answer: ["C"],
    explanation:
      "Middle C uses one short ledger line below the treble staff.",
    citationLabel: "MusicTheory.net lessons",
    notation: "C4/q",
    clef: "treble",
    keyboardNotes: ["C4"]
  },
  {
    id: "staff-bass-f3",
    moduleId: "staff",
    kind: "single",
    question: "Name this bass-clef note.",
    choices: ["D", "E", "F", "G"],
    answer: ["F"],
    explanation: "F3 sits on the fourth line in bass clef, between the clef dots.",
    citationLabel: "Teoria tutorials",
    notation: "F3/q",
    clef: "bass",
    keyboardNotes: ["F3"]
  },
  {
    id: "staff-keyboard-grand-c",
    moduleId: "staff",
    kind: "note-builder",
    question: "Select the two C notes shown across the grand-staff idea.",
    choices: ["C3", "C4", "E4", "G4", "C5"],
    answer: ["C4", "C5"],
    explanation:
      "Grand-staff reading links repeated letter names across registers; both selected notes are C.",
    citationLabel: "Open Music Theory",
    keyboardNotes: ["C4", "C5"]
  }
];

function scalePrompt(
  id: string,
  question: string,
  answer: string[],
  explanation: string,
  citationLabel = "MusicTheory.net lessons"
): PracticePrompt {
  return {
    id,
    moduleId: "scales",
    kind: "ordered",
    question,
    choices: Array.from(new Set(answer.concat(["Bb", "C#", "F#"]))),
    answer,
    explanation,
    citationLabel,
    keyboardNotes: answer
  };
}

export const scalePracticePrompts: PracticePrompt[] = [
  scalePrompt(
    "scale-build-c-major",
    "Build C major from tonic to octave.",
    [...majorScaleNotes("C"), "C"],
    "C major follows the major-step pattern without sharps or flats."
  ),
  scalePrompt(
    "scale-build-a-natural-minor",
    "Build A natural minor from tonic to octave.",
    [...naturalMinorScaleNotes("A"), "A"],
    "A natural minor uses the same pitch collection as C major, beginning on A.",
    "Open Music Theory"
  ),
  scalePrompt(
    "scale-build-g-major",
    "Build G major from tonic to octave.",
    [...majorScaleNotes("G"), "G"],
    "G major keeps F sharp so the half steps land in the expected places.",
    "Teoria tutorials"
  ),
  {
    id: "scale-degree-dominant",
    moduleId: "scales",
    kind: "single",
    question: "Which scale-degree number is the dominant in a major scale?",
    choices: ["2", "3", "5", "7"],
    answer: ["5"],
    explanation: "The dominant is scale degree 5, five steps above the tonic.",
    citationLabel: "Open Music Theory"
  },
  {
    id: "scale-circle-one-sharp",
    moduleId: "scales",
    kind: "single",
    question: "Which major key has one sharp?",
    choices: ["C major", "F major", "G major", "D major"],
    answer: ["G major"],
    explanation: "G major has one sharp: F sharp.",
    citationLabel: "MusicTheory.net lessons",
    keyboardNotes: ["G", "A", "B", "C", "D", "E", "F#"]
  }
];

function triadPrompt(id: string, symbol: string, label: string): PracticePrompt {
  const notes = triadNotes(symbol);

  return {
    id,
    moduleId: "chords",
    kind: "chord-builder",
    question: `Select the notes in ${label}.`,
    choices: ["C", "D", "E", "F", "F#", "G", "A", "B"],
    answer: notes,
    explanation: `${label} uses ${notes.join(" ")} as root, third, and fifth.`,
    citationLabel: "Teoria tutorials",
    keyboardNotes: notes
  };
}

export const chordPracticePrompts: PracticePrompt[] = [
  triadPrompt("chord-triad-c-major", "C", "C major"),
  triadPrompt("chord-triad-a-minor", "Am", "A minor"),
  triadPrompt("chord-triad-g-major", "G", "G major"),
  {
    id: "chord-first-inversion-c",
    moduleId: "chords",
    kind: "ordered",
    question: "Build C major in first inversion from bottom to top.",
    choices: ["C", "E", "G"],
    answer: ["E", "G", "C"],
    explanation:
      "First inversion places the third of the chord in the bass: E, then G, then C.",
    citationLabel: "MusicTheory.net lessons",
    keyboardNotes: ["E", "G", "C"]
  },
  {
    id: "chord-seventh-g7",
    moduleId: "chords",
    kind: "chord-builder",
    question: "Select the notes in G7.",
    choices: ["G", "A", "B", "C", "D", "E", "F", "F#"],
    answer: ["G", "B", "D", "F"],
    explanation:
      "G7 is a G major triad plus a minor seventh above the root: F natural.",
    citationLabel: "Open Music Theory",
    keyboardNotes: ["G", "B", "D", "F"]
  },
  {
    id: "chord-roman-ii-c",
    moduleId: "chords",
    kind: "single",
    question: "In C major, which Roman numeral fits D minor?",
    choices: ["I", "ii", "IV", "V"],
    answer: ["ii"],
    explanation:
      "The chord on scale degree 2 in a major key is minor, so it is written ii.",
    citationLabel: "Open Music Theory"
  }
];

export const rhythmPracticePrompts: PracticePrompt[] = [
  {
    id: "rhythm-grid-quarter-rests",
    moduleId: "rhythm",
    kind: "grid",
    question: "Tap the four-beat pattern: hit, rest, hit, hit.",
    choices: ["hit", "rest"],
    answer: ["hit", "rest", "hit", "hit"],
    explanation:
      "The silent second beat still occupies time, so the pattern keeps four positions.",
    citationLabel: "Ableton Learning Music",
    audioNotes: ["C4", "Rest", "C4", "G4"],
    timeSignature: "4/4",
    visualLabel: "4-beat grid"
  },
  {
    id: "rhythm-complete-measure",
    moduleId: "rhythm",
    kind: "ordered",
    question: "Complete a 4/4 measure with quarter, quarter, half.",
    choices: ["quarter", "half", "rest"],
    answer: ["quarter", "quarter", "half"],
    explanation:
      "Two quarter notes use two beats, and a half note fills the remaining two beats.",
    citationLabel: "MusicTheory.net lessons",
    visualLabel: "Measure builder"
  },
  {
    id: "rhythm-triplet-count",
    moduleId: "rhythm",
    kind: "single",
    question: "How many equal parts does a triplet place into one beat area?",
    choices: ["2", "3", "4", "6"],
    answer: ["3"],
    explanation:
      "A basic triplet groups three equal attacks where two of the same note value often fit.",
    citationLabel: "Open Music Theory"
  }
];

export const earPracticePrompts: PracticePrompt[] = [
  {
    id: "ear-interval-perfect-fifth",
    moduleId: "ear",
    kind: "listening",
    question: "Play the prompt, then identify the interval.",
    choices: ["major third", "perfect fourth", "perfect fifth", "octave"],
    answer: ["perfect fifth"],
    explanation:
      "C up to G spans five staff letters and sounds stable, a common perfect fifth.",
    citationLabel: "Teoria exercises",
    audioNotes: ["C4", "G4"],
    keyboardNotes: ["C4", "G4"]
  },
  {
    id: "ear-triad-major",
    moduleId: "ear",
    kind: "listening",
    question: "Play the prompt, then identify the triad quality.",
    choices: ["major", "minor", "diminished", "augmented"],
    answer: ["major"],
    explanation:
      "The chord uses a bright major third with a perfect fifth above the root.",
    citationLabel: "Teoria exercises",
    audioNotes: ["C4", "E4", "G4"],
    keyboardNotes: ["C4", "E4", "G4"]
  },
  {
    id: "ear-scale-natural-minor",
    moduleId: "ear",
    kind: "listening",
    question: "Play the prompt, then identify the scale color.",
    choices: ["major", "natural minor", "chromatic", "whole tone"],
    answer: ["natural minor"],
    explanation:
      "The lowered third, sixth, and seventh create the natural minor collection.",
    citationLabel: "Ableton Learning Music",
    audioNotes: ["A4", "B4", "C5", "D5", "E5", "F5", "G5", "A5"],
    keyboardNotes: ["A", "B", "C", "D", "E", "F", "G"]
  }
];

export function getPracticePrompts(moduleId: PracticeModuleId): PracticePrompt[] {
  return generatePracticePrompts(createPracticeSessionConfig(moduleId));
}

export function getLegacyPracticePrompts(moduleId: PracticeModuleId): PracticePrompt[] {
  if (moduleId === "pitch") {
    return pitchPracticePrompts;
  }

  if (moduleId === "staff") {
    return staffPracticePrompts;
  }

  if (moduleId === "scales") {
    return scalePracticePrompts;
  }

  if (moduleId === "chords") {
    return chordPracticePrompts;
  }

  if (moduleId === "rhythm") {
    return rhythmPracticePrompts;
  }

  if (moduleId === "ear") {
    return earPracticePrompts;
  }

  return [];
}

export const allPracticePrompts = practiceModules.flatMap((module) =>
  getPracticePrompts(module.id)
);

export const practicePromptsById = new Map(
  allPracticePrompts.map((prompt) => [prompt.id, prompt])
);
