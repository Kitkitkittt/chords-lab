# Chords Lab Plan

Last updated: 2026-06-05

## Product Goal

Build Chords Lab as a V7 beginner-to-early-intermediate interactive music theory
PWA for learners who need short, low-noise, repeatable study loops. The app
should feel like a calm learning workspace, not a dense textbook or timed drill
clone.

## V1 Audience

Primary audience: ADHD beginners learning core music theory concepts for the
first time.

Design implications:

- Keep one main task visible at a time.
- Prefer spacious lesson pages over dense dashboards.
- Use clear typography and stable layouts.
- Avoid timed tasks and autoplay audio.
- Let learners complete, bookmark, review, and resume without accounts.

## V7 Scope

V7 keeps the full-band V6 workspace and upgrades flow polish: spatial course
navigation, global feedback, lesson checkpoints, stricter review mastery,
tap-first workbench feedback, and Song Lab theory-sync.

Included:

- Home/resume screen.
- Global toast feedback for progress saves, offline mode, audio availability,
  and review queue changes.
- Interactive index launchpad for due review, Song Lab, scale, rhythm, and
  staff challenge modules.
- Home mission map for today's review, the next lesson concept, and a play
  task.
- Spatial `/learn` constellation map with complete, current, available, and
  suggested-next lesson states.
- Generated lesson checkpoints with three prompts and 2-of-3 completion.
- Review prompt state that clears missed prompts only after two consecutive
  correct answers.
- `/instruments` and `/instruments/:instrumentId` routes for full-band basics.
- Focused `/practice/:moduleId` routes with module cards and persisted drill
  attempts.
- `/practice/:moduleId/setup` route for difficulty, prompt count, clef, key,
  topic, audio replay, and deterministic seed.
- Practice prompt types for single choice, multi-select, ordered sequence,
  rhythm grid, note builder, chord builder, listening, staff-click,
  piano-roll, harmony-board, and analysis-board input modes.
- Direct workbenches for staff positions, rhythm composition, piano-roll
  selection, harmony slots, and analysis labels.
- Shared audio engine for lesson examples, home previews, practice prompts,
  rhythm playback, and Song Lab loops.
- Instrument profiles, chord-shape data, fretboard note maps, drum pads, and
  voice solfege reference tones.
- Staff taps preview sound, scale Auto-Correct marks target/off-scale notes,
  chord stacker detection names selected chords, and rhythm adds tap tempo.
- Rhythm builder remove, undo, clear, overfill warning, and playback cursor
  state.
- Lesson learn-by-doing cards for practice, hearing, Song Lab, and review.
- Targeted wrong-answer hints with selected-answer explanation and retry route.
- Song Lab 3.0 with voice guide, mute/solo, playback cursor, regenerate,
  duplicate section, and explain-loop controls.
- Song Lab theory context showing active key, chord tones, scale notes, and
  safe melody notes.
- Prompt-template metadata with ten categories per module.
- Local mastery fields: per-module attempts, streak-lite counts, last practiced
  timestamp, and review queue.
- Adaptive skill fields: ease, interval days, due date, lapses, and last result.
- Shared practice result panel with correct answer, explanation, citation lens,
  retry, and next-prompt actions.
- `/review` mixed practice from missed prompts and module prompts.
- `/lab/song` play-first eight-bar builder for drums, bass, chords, melody, and
  form.
- `/lab/song/sketches` local save, duplicate, delete, export, and import.
- `/progress/export` full local progress export/import with preview.
- `/plan/content-review` content QA workflow for educator review.
- Course map.
- Lesson reader with module rail and source panel.
- MDX lesson content with typed metadata.
- Twenty-three lessons from beginner essentials into intervals fluency,
  minor/modes, seventh chords in keys, cadences, progressions, voice-leading,
  pop/rock harmony, form, and analysis.
- Inline micro-checks.
- Pitch note-name practice and chord triad-builder practice.
- VexFlow staff notation examples.
- Tone.js synthesized audio examples after user gesture.
- Keyboard pitch-class visualizations.
- Glossary.
- Source bibliography.
- Local progress and settings.
- In-app project plan and progress page.
- PWA shell and offline app-shell coverage.

Not included:

- Backend services.
- Accounts or cloud sync.
- Teacher dashboards.
- Payments.
- Analytics.
- MIDI keyboard input.
- Fretboard view.
- Full Teoria-style exercise clone.
- Advanced curriculum such as modulation, counterpoint, figured bass, and
  post-tonal analysis.

## Interactive Expansion Goals

The next product direction is a fuller interactive learning workspace. The
index page is the priority surface because it can give learners immediate
touch, sound, notation, and keyboard feedback before they commit to a lesson.

Current home launchpad modules:

- Due review.
- Play Song Lab.
- Build a scale.
- Tap rhythm.
- Staff challenge.

Current focused practice modules:

- Pitch note-name drills.
- Staff treble/bass, ledger-line, and keyboard mapping prompts.
- Major/minor scale construction, scale degree, and key-signature prompts.
- Chord triad, inversion, seventh chord, and Roman numeral prompts.
- Rhythm grid, measure-completion, and triplet prompts.
- Replayable ear-training prompts.

Next goals:

- Add cadences and phrase endings.
- Add richer harmonic-function review.
- Add more generated Song Lab patterns.
- Expand concrete prompt factories behind the generated templates.
- Add optional fretboard or MIDI input after core modules are stable.

Detailed goals live in `docs/INTERACTIVE_ROADMAP.md`.

## Curriculum Plan

V1 beginner essentials:

1. Sound, pitch, octave, note names.
2. Staff, clefs, ledger lines, keyboard mapping.
3. Rhythm, beat, measures, note values, rests, dots, ties, triplets.
4. Accidentals, half steps, whole steps, enharmonics.
5. Major/minor scales, scale degrees, key signatures, circle of fifths.
6. Generic/specific intervals, interval quality, melodic/harmonic intervals,
   inversion.
7. Triads: major, minor, diminished, augmented, root position, inversions,
   basic chord symbols.
8. Review map and glossary habits.

Expansion lessons now added:

1. Scale Fluency.
2. Triads, Sevenths, and Inversions.
3. Diatonic Harmony.
4. Rhythm and Meter Lab.
5. Ear Training Basics.
6. Song Building.

Future curriculum:

- Seventh chords and extensions.
- Roman numeral analysis.
- Cadences and harmonic function.
- Common chord progressions.
- Dictation and ear training.
- More melody and bassline writing.
- More form and phrase structure.
- Counterpoint and voice-leading.
- Figured bass.
- Pop/rock harmony.
- Post-tonal basics.

## Implementation Plan

Stack:

- React, Vite, TypeScript.
- React Router for routes.
- MDX for lessons.
- Vite PWA plugin for manifest and service worker.
- VexFlow for notation.
- Tone.js for audio.
- Tonal for the derived music-theory engine (`src/lib/theory.ts`): notes,
  intervals, scales, modes, keys, Roman numerals, progressions, chords,
  voicings, and voice leading. See `docs/THEORY_ENGINE.md`.
- Fontsource for self-hosted typography.
- Vitest, Testing Library, Playwright, and axe for verification.

Data model:

- A pure music-theory engine (`src/lib/theory.ts`) derives scales, keys, Roman
  numerals, progressions, chord inversions, solfege, and voice leading from
  Tonal for all keys.
- `LessonMeta` describes slug, title, module, level, estimated minutes,
  outcomes, prerequisites, and citations.
- `ProgressState` stores completed lessons, bookmarks, last lesson, check
  results, practice results, practice mastery, prompt-level review state,
  adaptive skill mastery, session history, saved sketches, disabled sync
  metadata, review queues, and settings.
- `ProgressExportBundle` wraps full local progress for manual export/import.
- `InstrumentId`, `InstrumentProfile`, `ChordShape`, `FretboardTuning`,
  `DegreeHighlight`, `SongLabTrackType`, and `MidiAdapterStatus` describe the
  instrument layer.
- `AudioEvent` and `PlaybackPattern` describe shared generated playback.
- `InteractionHint` describes targeted retry feedback.
- `PromptTemplate` and `GeneratorFamily` describe prompt coverage families.
- `SourceEntry` stores source owner, URL, use notes, license note, and risk.
- `GlossaryTerm` stores beginner definitions and source URLs.

Persistence:

- Browser localStorage only.
- Storage key: `chordslab.progress.v1`.
- Invalid or unsupported stored state falls back to defaults.

## Acceptance Criteria

V7 is acceptable when:

- A learner can start from home and continue into the first incomplete lesson.
- The home page offers due review, Song Lab, scale, rhythm, and staff
  interactions.
- The home page offers a mission map for review, a new concept, and a play task.
- The learn page uses a spatial map while preserving list navigation.
- Every lesson has a generated checkpoint, and passing 2 of 3 marks completion.
- Missed prompts clear only after two consecutive correct review answers.
- Global toasts report progress saves, audio state, offline mode, and review
  queue updates.
- Song Lab displays active theory context for the selected chord block.
- A learner can open full-band instrument pages for piano, guitar, bass, drums,
  voice guide, and ukulele.
- A learner can open `/practice/:moduleId`, answer prompts in every module, and
  see local practice scores persist.
- Staff, rhythm, piano-roll, harmony, and analysis prompt modes have direct,
  keyboard-accessible controls.
- Rhythm practice supports remove, undo, clear, overfill feedback, and playback
  cursor state.
- Lesson pages route learners into practice, ear prompts, Song Lab, and review.
- Audio playback uses one shared engine with visible ready/loading/playing/
  stopped/disabled/error states.
- Song Lab supports voice guide, mute/solo, regenerate, duplicate section,
  explain loop, and playback cursor state.
- No microphone permission is requested, and MIDI remains a future adapter only.
- A learner can configure `/practice/:moduleId/setup` and run a generated
  session.
- A learner can use `/review` to revisit due skills and missed prompts.
- A learner can use `/lab/song` without autoplay and save sketches under
  `/lab/song/sketches`.
- A learner can export and import full local progress at `/progress/export`.
- A content reviewer can inspect citation/outcome/practice-link status at
  `/plan/content-review`.
- Lesson pages show outcomes, prerequisites, citations, completion, and
  bookmark controls.
- Micro-check attempts persist locally.
- Audio requires a user action and can be disabled.
- Notation renders from data instead of screenshots.
- The glossary and sources pages are useful without external setup.
- Progress survives reload on the same browser.
- The app shell loads offline after the first successful visit.
- Typecheck, lint, unit/component tests, production build, and Playwright
  desktop/mobile smoke tests pass.
