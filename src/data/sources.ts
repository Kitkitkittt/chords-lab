import type { SourceEntry } from "../types/course";

export const sourceEntries: SourceEntry[] = [
  {
    label: "Teoria tutorials",
    owner: "Jose Rodriguez Alvira / teoria.com",
    url: "https://www.teoria.com/en/tutorials/",
    licenseNote:
      "CC BY-NC-ND 4.0. Use for reference and attribution only; do not copy or adapt lesson text.",
    bestUse: "Music theory topic sequence and terminology cross-checking.",
    riskLevel: "medium"
  },
  {
    label: "Teoria exercises",
    owner: "Jose Rodriguez Alvira / teoria.com",
    url: "https://www.teoria.com/en/exercises/",
    licenseNote:
      "CC BY-NC-ND 4.0. Use for drill taxonomy inspiration only; do not clone exercise wording or assets.",
    bestUse: "Future drill categories for notation and ear training.",
    riskLevel: "medium"
  },
  {
    label: "MusicTheory.net lessons",
    owner: "musictheory.net, LLC",
    url: "https://www.musictheory.net/lessons",
    licenseNote:
      "Copyrighted site content. Use as a reference syllabus only; write original explanations.",
    bestUse: "Beginner-to-intermediate topic ordering and coverage checks.",
    riskLevel: "high"
  },
  {
    label: "Open Music Theory",
    owner: "Open Music Theory / Hybrid Pedagogy Publishing",
    url: "https://openmusictheory.github.io/contents.html",
    licenseNote:
      "CC BY-SA 4.0. Cite when used; direct adaptation would require share-alike compliance.",
    bestUse: "College-level terminology, advanced roadmap, and cross-checking fundamentals.",
    riskLevel: "low"
  },
  {
    label: "Ableton Learning Music",
    owner: "Ableton",
    url: "https://learningmusic.ableton.com/",
    licenseNote:
      "Copyrighted site content. Use as product inspiration only; write original material.",
    bestUse: "Play-first framing for beats, pitch, chords, basslines, and song structure.",
    riskLevel: "high"
  },
  {
    label: "VexFlow",
    owner: "VexFlow contributors",
    url: "https://www.vexflow.com/",
    licenseNote: "MIT-licensed notation rendering library.",
    bestUse: "Browser-rendered staff notation examples.",
    riskLevel: "low"
  },
  {
    label: "Tonal",
    owner: "tonaljs contributors",
    url: "https://tonaljs.github.io/tonal/docs",
    licenseNote: "Open-source music theory utility library.",
    bestUse: "Note, interval, scale, and chord calculations.",
    riskLevel: "low"
  },
  {
    label: "Tone.js",
    owner: "Tone.js contributors",
    url: "https://tonejs.github.io/docs/",
    licenseNote: "MIT-licensed Web Audio framework.",
    bestUse: "Short, user-triggered synthesized audio examples.",
    riskLevel: "low"
  }
];

export const sourceByLabel = new Map(
  sourceEntries.map((source) => [source.label, source])
);
