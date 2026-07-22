import {
  createPracticeSessionConfig,
  generatePracticePrompts
} from "./practiceGenerators";
import type { PracticePrompt } from "./practiceEngine";

export type ContrastPromptFamily =
  | "interval-inversion"
  | "staff-clef-transfer"
  | "enharmonic-register";

const families: ContrastPromptFamily[] = [
  "interval-inversion",
  "staff-clef-transfer",
  "enharmonic-register"
];

function source(moduleId: "intervals" | "staff" | "pitch", seed: string) {
  return generatePracticePrompts(
    createPracticeSessionConfig(moduleId, { promptCount: 1, seed })
  )[0];
}

function intervalPrompt(seed: string, index: number): PracticePrompt {
  const base = source("intervals", `${seed}-interval-${index}`);
  const melodic = index % 2 === 0;

  return {
    ...base,
    id: `contrast-interval-${index + 1}`,
    question: `A major third played ${melodic ? "melodically" : "harmonically"} inverts to which interval?`,
    choices: ["minor sixth", "major sixth", "perfect fifth", "minor third"],
    answer: ["minor sixth"],
    explanation: "Intervals that invert add to nine; a major third becomes a minor sixth.",
    skillTargets: ["interval-quality", "interval-inversion"],
    topicTags: ["contrast", "inversion", melodic ? "melodic" : "harmonic"]
  };
}

function staffPrompt(seed: string, index: number): PracticePrompt {
  const base = source("staff", `${seed}-staff-${index}`);
  const treble = index % 2 === 0;

  return {
    ...base,
    id: `contrast-staff-${index + 1}`,
    question: `Middle C is a ledger-line note in treble clef. In bass clef, it is which position?`,
    choices: ["first ledger line above", "second line", "first space", "fourth line"],
    answer: ["first ledger line above"],
    explanation: "The same pitch changes staff position when the clef changes; middle C sits one ledger line above bass clef.",
    inputMode: "choice",
    clef: treble ? "treble" : "bass",
    notation: treble ? "C4/q" : "C4/q",
    skillTargets: ["staff-position", "clef-transfer"],
    topicTags: ["contrast", "line-space", "clef-transfer"]
  };
}

function enharmonicPrompt(seed: string, index: number): PracticePrompt {
  const base = source("pitch", `${seed}-enharmonic-${index}`);
  const sharp = index % 2 === 0 ? "F#4" : "C#5";
  const flat = index % 2 === 0 ? "Gb4" : "Db5";

  return {
    ...base,
    id: `contrast-enharmonic-${index + 1}`,
    question: `${sharp} and ${flat} are enharmonic. What stays the same?`,
    choices: ["Sounding pitch and register", "Letter name only", "Staff line only", "Scale function only"],
    answer: ["Sounding pitch and register"],
    explanation: `${sharp} and ${flat} name the same key in the same register, though their written spelling can serve different harmonic roles.`,
    keyboardNotes: [sharp, flat],
    skillTargets: ["note-reading", "enharmonic-register"],
    topicTags: ["contrast", "enharmonic", "register"]
  };
}

export function generateContrastPrompts(
  seed = "contrast-v1",
  count = 6
): PracticePrompt[] {
  const total = Math.min(12, Math.max(3, Math.floor(count) || 3));

  return Array.from({ length: total }, (_, index) => {
    switch (families[index % families.length]) {
      case "interval-inversion":
        return intervalPrompt(seed, index);
      case "staff-clef-transfer":
        return staffPrompt(seed, index);
      case "enharmonic-register":
        return enharmonicPrompt(seed, index);
    }
  });
}
