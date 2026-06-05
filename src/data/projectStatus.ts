export type ProjectMilestone = {
  title: string;
  status: "complete" | "in-progress" | "planned";
  summary: string;
};

export type ProjectDecision = {
  label: string;
  value: string;
};

export const projectDecisions: ProjectDecision[] = [
  {
    label: "Release target",
    value: "V7 UX flow and interaction-first music learning PWA"
  },
  {
    label: "Audience",
    value: "ADHD beginners who need low-noise, short learning loops"
  },
  {
    label: "Platform",
    value: "React, Vite, TypeScript, local-first browser app"
  },
  {
    label: "Content policy",
    value: "Original lesson text with visible citations and source-use notes"
  },
  {
    label: "Persistence",
    value: "Browser localStorage only under chordslab.progress.v1"
  },
  {
    label: "Out of scope for V7",
    value: "Required accounts, live backend sync, microphone scoring, shipped MIDI input, teacher dashboards, and paid content"
  }
];

export const projectMilestones: ProjectMilestone[] = [
  {
    title: "Foundation app scaffold",
    status: "complete",
    summary:
      "React/Vite app, routing, PWA manifest, MDX rendering, fonts, design tokens, linting, tests, and Playwright setup are in place."
  },
  {
    title: "Beginner curriculum shell",
    status: "complete",
    summary:
      "Eight V1 lessons cover pitch, staff, rhythm, accidentals, scales, intervals, triads, and review."
  },
  {
    title: "Expanded course modules",
    status: "complete",
    summary:
      "Six additional lessons now cover scale fluency, sevenths and inversions, diatonic harmony, rhythm lab, ear training, and song building."
  },
  {
    title: "Learning interactions",
    status: "complete",
    summary:
      "Lessons support micro-checks, local scoring, bookmarks, completion state, VexFlow notation, keyboard visuals, and user-triggered Tone.js audio."
  },
  {
    title: "Interactive index practice hub",
    status: "complete",
    summary:
      "The home page now works as a playable entry point with due review, Song Lab, scale, rhythm, and staff micro-interactions."
  },
  {
    title: "Focused practice route",
    status: "complete",
    summary:
      "A /practice/:moduleId workspace now exposes pitch, staff, scale, chord, rhythm, and ear modules with reusable scoring and persisted attempts."
  },
  {
    title: "Practice Engine V2",
    status: "complete",
    summary:
      "Practice supports single-choice, multi-select, ordered sequence, rhythm grid, note builder, chord builder, and listening prompts with local mastery queues."
  },
  {
    title: "Review and Song Lab routes",
    status: "complete",
    summary:
      "/review mixes queued prompts, and /lab/song lets learners build beat, bass, chord, melody, and form blocks with user-triggered audio."
  },
  {
    title: "Reference surfaces",
    status: "complete",
    summary:
      "Glossary, bibliography, source notes, progress overview, and settings are available in the app."
  },
  {
    title: "Project documentation",
    status: "complete",
    summary:
      "Repository handoff docs now capture the plan, shipped work, test status, architecture, and next-phase roadmap."
  },
  {
    title: "Intermediate theory expansion",
    status: "in-progress",
    summary:
      "Seventh chords, Roman numerals, diatonic harmony, rhythm builders, and song construction are now started; cadences and modulation remain future work."
  },
  {
    title: "Adaptive practice expansion",
    status: "complete",
    summary:
      "Practice now uses deterministic generated sessions, setup screens, skill mastery, session history, and review queues."
  },
  {
    title: "Practice Engine V3",
    status: "complete",
    summary:
      "Generated staff, scale, interval, chord, harmony, rhythm, and ear prompts now support setup configuration and source-labeled skill targets."
  },
  {
    title: "Song Lab 2.0",
    status: "complete",
    summary:
      "Song Lab now edits eight-bar drums, bass, chords, melody, and form with local sketch save, duplicate, delete, export, and import."
  },
  {
    title: "Optional cloud preparation",
    status: "complete",
    summary:
      "Progress storage now sits behind a local repository interface with disabled sync metadata and a cloud adapter stub."
  },
  {
    title: "V4 interactive launchpad",
    status: "complete",
    summary:
      "The home page now prioritizes due review, Song Lab, scale building, rhythm tapping, and staff challenge interactions."
  },
  {
    title: "Direct workbench controls",
    status: "complete",
    summary:
      "Practice prompts now expose staff, rhythm, piano-roll, harmony, and analysis workbenches with keyboard-accessible controls."
  },
  {
    title: "Adaptive review and portability",
    status: "complete",
    summary:
      "Skill mastery now stores due dates and ease data, review prioritizes due skills, and progress can be exported or imported locally."
  },
  {
    title: "Educator content review",
    status: "complete",
    summary:
      "A content-review route checks lessons for citations, outcomes, source-use discipline, and connected practice routes."
  },
  {
    title: "V5 audio reliability layer",
    status: "complete",
    summary:
      "Lesson audio, practice prompts, rhythm playback, home previews, and Song Lab now use one shared Tone.js playback engine with managed stop and duration handling."
  },
  {
    title: "V5 guided doing loops",
    status: "complete",
    summary:
      "Home now includes a mission map, lessons route into practice/hearing/Song Lab/review actions, and missed practice answers show targeted retry hints."
  },
  {
    title: "V6 instrument layer",
    status: "complete",
    summary:
      "Instrument routes now cover piano, guitar, bass, drums, voice guide, and ukulele with shared instrument profiles and interactive workbenches."
  },
  {
    title: "Song Lab 3.0",
    status: "complete",
    summary:
      "Song Lab now includes voice guide tracks, mute/solo, playback cursor state, regenerate, duplicate section, and explain-loop controls."
  },
  {
    title: "Full-band practice modes",
    status: "in-progress",
    summary:
      "Practice types now support instrument-board, fretboard, drum-pad, voice-range, and song-arranger prompts with first generated instrument prompts."
  },
  {
    title: "V7 global UX feedback",
    status: "complete",
    summary:
      "The app now has global progress/audio/offline/review toasts, app mode state, interaction pulse states, and success/correction feedback tones through the shared audio engine."
  },
  {
    title: "V7 spatial learning flow",
    status: "complete",
    summary:
      "The learn route now uses a constellation-style course map with complete, current, available, and suggested-next node states while keeping the course rail for scanning."
  },
  {
    title: "V7 lesson checkpoint loop",
    status: "complete",
    summary:
      "Every lesson route now ends with a three-prompt generated checkpoint; two correct answers mark the lesson complete and missed prompts are routed into review."
  },
  {
    title: "V7 review mastery rule",
    status: "complete",
    summary:
      "Missed prompts now remain in review until two consecutive correct answers, with prompt-level review state persisted under chordslab.progress.v1."
  },
  {
    title: "V7 tap-first interaction polish",
    status: "complete",
    summary:
      "Staff taps preview sound, scales add Auto-Correct highlighting, chord stacks detect likely chord names, rhythm adds tap tempo, and Song Lab shows theory-sync context."
  }
];

export const acceptanceChecklist = [
  "Learner can start at home and continue into the first incomplete lesson.",
  "Lesson pages expose outcomes, prerequisites, source citations, completion, and bookmark actions.",
  "Micro-check attempts persist locally and survive reload.",
  "Practice attempts persist locally and survive reload.",
  "The home page offers playable due review, Song Lab, scale, rhythm, and staff interactions.",
  "The practice route exposes pitch, staff, scale, chord, rhythm, and ear-training modules.",
  "Deep links exist for /practice/:moduleId/setup, /practice/:moduleId, /review, /lab/song, and /lab/song/sketches.",
  "Generated sessions support difficulty, key, clef, topic, prompt count, and audio replay settings.",
  "Audio playback uses one shared engine with visible ready, loading, playing, stopped, disabled, and error states.",
  "Home launchpad offers due review, Song Lab, scale, rhythm, and staff micro-interactions.",
  "The home page includes a mission map for review, a new concept, and a play task.",
  "Practice workbenches support direct staff, rhythm, piano-roll, harmony, and analysis controls.",
  "Rhythm practice supports token remove, undo, clear, overfill feedback, and playback cursor state.",
  "Lesson pages offer learn-by-doing routes into practice, ear prompts, Song Lab, and review.",
  "Adaptive review stores due dates, ease, intervals, and lapses per skill target.",
  "Progress export/import moves local course state and Song Lab sketches without accounts.",
  "Content review flags lesson citation, outcome, and practice-route gaps.",
  "Instrument routes exist for piano, guitar, bass, drums, voice, and ukulele.",
  "Practice includes a full-band Instruments module with generated prompts.",
  "Song Lab 3.0 supports voice guide, mute/solo, regenerate, duplicate section, explain loop, and playback cursor state.",
  "Global toasts report offline mode, progress saves, audio availability, and review queue changes.",
  "The learn route presents a spatial course map with guided but non-blocking lesson states.",
  "Lesson checkpoint prompts require 2 of 3 correct answers to mark completion.",
  "Missed review prompts clear only after two consecutive correct answers.",
  "Tap-first workbenches provide immediate staff, scale, chord, and rhythm feedback.",
  "Song Lab displays active key, chord tones, scale notes, and safe melody notes.",
  "MIDI is represented as a future adapter status only and is not required.",
  "No microphone permission or microphone scoring is used.",
  "Song Lab requires a user action before playback and saves generated eight-bar sketches locally.",
  "Local progress stores skill mastery, session history, saved sketches, and disabled sync metadata.",
  "Audio examples require a click and can be disabled in settings.",
  "Notation examples render from data, not screenshots.",
  "Glossary and source pages are searchable or scannable.",
  "PWA app shell works offline after first load.",
  "Desktop and mobile Playwright smoke tests pass."
];
