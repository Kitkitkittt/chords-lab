export type InteractiveGoal = {
  title: string;
  module:
    | "Pitch"
    | "Staff"
    | "Scales"
    | "Intervals"
    | "Chords"
    | "Harmony"
    | "Rhythm"
    | "Ear"
    | "Song";
  status: "now" | "next" | "later";
  summary: string;
};

export const interactiveGoals: InteractiveGoal[] = [
  {
    title: "Make the index page a playable practice hub",
    module: "Pitch",
    status: "now",
    summary:
      "Let learners touch notes, hear them, and move into lessons from the first screen."
  },
  {
    title: "Add reusable pitch and staff drills",
    module: "Staff",
    status: "now",
    summary:
      "Turn note names, staff positions, clefs, and keyboard mapping into repeatable checks."
  },
  {
    title: "Build scale construction modules",
    module: "Scales",
    status: "now",
    summary:
      "Let learners choose a tonic, build major/minor scales, hear them, and compare spelling."
  },
  {
    title: "Build chord construction modules",
    module: "Chords",
    status: "now",
    summary:
      "Support triad quality, inversion, chord symbol, and keyboard/staff feedback loops."
  },
  {
    title: "Build rhythm pattern modules",
    module: "Rhythm",
    status: "now",
    summary:
      "Let learners toggle beats, hear patterns, and connect sound to measures and notation."
  },
  {
    title: "Add ear-training modules",
    module: "Ear",
    status: "now",
    summary:
      "Add note, interval, scale, chord, and rhythm listening checks after the visual modules are stable."
  },
  {
    title: "Generate interval and harmony sessions",
    module: "Harmony",
    status: "now",
    summary:
      "Create seedable interval, Roman numeral, cadence, and progression prompts."
  },
  {
    title: "Add a play-first Song Lab",
    module: "Song",
    status: "now",
    summary:
      "Let learners combine beat, bass, chords, melody, and form with user-triggered audio playback."
  },
  {
    title: "Add optional cloud sync adapter",
    module: "Chords",
    status: "next",
    summary:
      "Keep local-first progress stable while preparing a disabled cloud repository path."
  }
];
