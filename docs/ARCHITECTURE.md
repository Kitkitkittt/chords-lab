# Chords Lab Architecture

Last updated: 2026-06-01

## Overview

Chords Lab is a client-only PWA. The app has no backend and no account system.
All learner state is stored in browser localStorage.

## Source Layout

- `src/App.tsx` - route tree.
- `src/main.tsx` - React root, router, toast provider, progress provider, PWA
  registration, and global styles.
- `src/components/` - layout, lesson utilities, course rail, lesson
  checkpoints, global toasts, home launchpad, direct practice workbenches, and
  progress bar.
- `src/content/lessons/` - MDX lessons with exported metadata.
- `src/data/` - course structure, glossary, sources, interactive goals, and
  project status.
- `src/hooks/` - reusable React state hooks for interactive practice.
- `src/lib/` - shared audio playback, instrument helpers, storage,
  export/import helpers, adaptive review, music helpers, prompt templates, and
  pure practice scoring.
- `src/lib/theory.ts` - the canonical, pure music-theory engine (see
  `docs/THEORY_ENGINE.md`).
- `src/pages/` - route-level screens.
- `src/state/` - local progress context.
- `src/styles/` - design tokens and global layout styles.
- `tests/e2e/` - Playwright browser tests.

## Rendering Model

Lessons are MDX files that export a typed `meta` object. `src/data/course.ts`
imports each lesson and combines the metadata with the lesson component. The
lesson route looks up the active lesson by slug and renders it through
`MDXProvider` with the shared lesson component map.

## Progress Model

Progress state:

```ts
type ProgressState = {
  schemaVersion: 1;
  completedLessonSlugs: string[];
  bookmarkedLessonSlugs: string[];
  lastLessonSlug?: string;
  checkResults: Record<string, { correct: number; attempted: number }>;
  practiceResults: Record<string, { correct: number; attempted: number }>;
  practiceMastery: Record<
    string,
    {
      correct: number;
      attempted: number;
      streak: number;
      lastPracticedAt?: string;
      reviewQueue: string[];
    }
  >;
  reviewPromptState: Record<string, ReviewPromptState>;
  skillMastery: Record<string, SkillMastery>;
  generatedSessionHistory: PracticeSessionHistory[];
  savedSongSketches: SongSketch[];
  sync: { enabled: boolean; provider: "none" | "cloud"; lastSyncAt?: string };
  settings: { audioEnabled: boolean; reducedMotion: boolean };
};
```

`SkillMastery` stores local adaptive review fields: `ease`, `intervalDays`,
`dueAt`, `lapses`, `lastResult`, `lastPracticedAt`, and `reviewQueue`.
`ReviewPromptState` stores the two-consecutive-correct review clearing rule for
missed prompts.
`ProgressExportBundle` wraps a full `ProgressState` for manual JSON
export/import at `/progress/export`.

Storage key:

```ts
chordslab.progress.v1
```

The progress provider normalizes malformed storage data before using it. This
keeps old or corrupted browser state from breaking the app.

The toast provider listens for custom app events from progress storage and the
audio engine. It surfaces progress-saved, offline, audio unavailable/disabled,
and review-queue feedback without introducing analytics or backend state.

## Lesson Components

MDX lessons can use:

- `Callout`
- `MicroCheck`
- `AudioExample`
- `NotationFigure`
- `KeyboardFigure`

These are intentionally small so lessons stay readable and the app can later
add stronger drill engines without rewriting the curriculum.

`LessonCheckpoint` is appended by the lesson route after MDX content and
learn-by-doing links. It generates three local practice prompts from the
lesson's topic module; two correct answers mark the lesson complete, while
missed prompts are recorded through the same practice result pipeline.

## Audio Model

`src/lib/audioEngine.ts` is the single playback layer for lessons, the home
launchpad, practice prompts, rhythm composer, and Song Lab. It accepts
`PlaybackPattern` data made from `AudioEvent` objects, starts Tone.js only after
a user gesture, schedules generated synth notes, calculates total playback
duration, exposes visible playback states, and owns stop/dispose behavior.

Components should call `playSequence`, `playChord`, `playRhythm`,
`playSongSketch`, or `playPattern` instead of creating separate Tone.js synths.
This keeps long Song Lab loops and short lesson examples from being cut off by
local guessed timeouts.

## Theory Engine

`src/lib/theory.ts` is the canonical, pure music-theory layer. It derives
music-theory facts from `tonal` (Key, RomanNumeral, Progression, Mode, Voicing,
VoiceLeading, Chord.degrees) so results are correct for every key and for both
major and minor modes, rather than hardcoded for a few keys. It adopts teoria's
pedagogical conventions: conventional interval names (`M3`, `P5`), movable-do
solfege, scale-degree detection, and frequency-to-note with cents.

`music.ts`, `theoryContext.ts`, `practiceGenerators.ts`, `instruments.ts`, and
`interactionTools.ts` all delegate their theory facts to this engine. See
`docs/THEORY_ENGINE.md` for the full module reference.

## Learning System

`src/lib/skills.ts` defines a typed skill taxonomy and connects lessons,
prompts, and adaptive review. `src/lib/learningPath.ts` rolls up local
`skillMastery` into per-skill mastery, derives soft recommendations, interleaves
review across due skills, and computes parallel learning tracks. The Home page
renders "Suggested focus" cards and a "Learning tracks" section; the Progress
page renders "Skills by area". The practice result panel offers an optional
Easy/Hard confidence rating that nudges review ease without counting a new
attempt. See `docs/SKILL_GRAPH.md` and `docs/LEARNING_TRACKS.md`.

## Theory Tools

`src/pages/ToolsPage.tsx` hosts the interactive tools at `/tools/circle` and
`/tools/progression`: `CircleOfFifths`, `ChordProgressionPlayground`,
`VoicingDiagram`, and a fretboard scale-box explorer that reuses
`FretboardWorkbench`. All tool audio is user-triggered through the shared audio
engine. `CircleOfFifths` is also registered as a lesson component.

## Instrument Model
`src/lib/instruments.ts` defines instrument profiles for piano, guitar,
bass, drums, voice, and ukulele. It centralizes chord-tone labels, scale-degree
labels, standard tunings, fretboard positions, starter chord shapes, bass
targets, drum presets, voice solfege, Song Lab track types, and loop
explanations.

`/instruments` lists the full-band learning map. `/instruments/:instrumentId`
renders one primary workbench plus a concept inspector for chord, scale,
practice, and Song Lab application. Voice remains generated reference tones
only; the app does not request microphone permissions. MIDI is represented as a
future adapter status, not shipped input behavior.

## Practice Surfaces

`HomeInteractiveLab` makes the index page interactive. It combines due review
status, Song Lab preview playback, Tonal-derived scale notes, VexFlow notation,
keyboard highlighting, rhythm toggles, staff challenge controls, and
user-triggered Tone.js playback.

`PracticeSetupPage` provides `/practice/:moduleId/setup` configuration for
difficulty, prompt count, clef, key, topic, audio replay, and seed.
`PracticePage` provides the generated `/practice/:moduleId` workspace. It uses
`practiceGenerators` for deterministic prompt sets and `usePracticeSession` for
prompt state, answer selection, checking, retry, session summary, and
next-prompt navigation. `practiceTemplates` documents prompt family coverage
and rhythm validation. Pure scoring lives in `practiceEngine`, and attempts
persist under `practiceResults`, `practiceMastery`, `skillMastery`, and
`generatedSessionHistory`.

Supported prompt kinds:

- `single`
- `multi`
- `ordered`
- `grid`
- `note-builder`
- `chord-builder`
- `listening`
- `staff-click`
- `piano-roll`
- `harmony-board`
- `analysis-board`

`DirectPracticeWorkbench` selects an accessible workbench from the prompt input
mode: staff positions, rhythm composer, piano-roll, harmony slots, or analysis
labels.

`ReviewPage` prioritizes due adaptive skills, then missed prompts from
`practiceMastery.reviewQueue`, then mixed module prompts. A missed prompt stays
queued until `reviewPromptState[promptId].consecutiveCorrect >= 2`.

`SongLabPage` is a play-first sketch surface for eight-bar drums, bass, chord,
melody, voice guide, and form blocks. Song Lab adds mute/solo, playback cursor,
regenerate, duplicate section, and explain-loop controls. `SongSketchesPage`
manages local sketches with save, duplicate, delete, export, and import. It
uses Tone.js only after a user gesture and stores no generated music
externally.
V7 adds `theoryContextForSongSketch`, which derives the active chord, scale
notes, chord tones, and safe melody notes for the current chord block.

Progress reads and writes through `localProgressRepository`; a disabled cloud
repository stub exists only to keep the future adapter boundary explicit.

`ContentReviewPage` checks lesson citation counts, outcomes, and practice links
for educator review. It does not enforce originality automatically; it provides
the handoff checklist surface.

## Testing Strategy

Unit and component tests cover:

- Course metadata validity.
- Citation presence.
- Prerequisite references.
- Progress serialization.
- Music helper output.
- Micro-check scoring.
- Glossary filtering.
- Course map rendering.
- Home practice hub interaction.
- Direct practice workbench rendering.
- Prompt-template breadth and rhythm validation.
- Adaptive review scheduling.
- Progress export/import parsing and preview.
- Practice scoring and route interaction.
- Practice mastery normalization.
- Deep-linked module practice.
- Review queue rendering.
- Song Lab controls.

Playwright covers:

- Home to lesson flow.
- Accessibility scan.
- Micro-check persistence.
- Lesson completion.
- Progress reload behavior.
- Offline app shell on desktop and mobile.
- Module practice, review, Song Lab, progress export, and content-review smoke
  flows.
