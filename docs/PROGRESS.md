# Chords Lab Progress

Last updated: 2026-06-01

## Current Phase

V7 UX flow and interaction expansion is implemented in code. The app now has a
shared audio layer, launchpad and mission-map home entry points, global feedback
toasts, a spatial course map, generated lesson checkpoints, two-correct review
clearing, instrument lab routes, direct staff/rhythm/piano/harmony/analysis
workbenches, adaptive skill review fields, full local progress export/import,
Song Lab theory-sync, and an educator content-review route.

## Completed

- React/Vite/TypeScript project scaffold.
- PWA manifest and service worker generation.
- Self-hosted Atkinson Hyperlegible Next, Plus Jakarta Sans, and JetBrains Mono.
- CSS token layer based on `DESIGN.md`.
- Responsive app shell with primary navigation.
- Home page with resume action and an interactive launchpad for due review,
  Song Lab, scale building, rhythm tapping, and staff challenge.
- Home mission map for today's review, a new concept, and a play task.
- Global toast feedback for progress saves, offline mode, audio availability,
  and review queue changes.
- Spatial constellation course map with complete, current, available, and
  suggested-next lesson states.
- Lesson checkpoint flow with three generated prompts and 2-of-3 completion.
- Prompt-level review state that clears missed prompts only after two
  consecutive correct answers.
- `/instruments` and `/instruments/:instrumentId` routes for piano, guitar,
  bass, drums, voice guide, and ukulele.
- Focused `/practice` route with module cards for pitch, staff, scales, chords,
  rhythm, ear training, and instruments.
- `/practice/:moduleId/setup` and `/practice/:moduleId` deep links for pitch,
  staff, scales, intervals, chords, harmony, rhythm, and ear training.
- Reusable practice prompt/session primitives for single-choice, multi-select,
  ordered sequence, rhythm grid, note builder, chord builder, listening,
  feedback, retry, and next-prompt navigation.
- Direct workbench components for staff-click, rhythm composer, piano-roll,
  harmony-board, and analysis-board prompt modes.
- Staff workbench now includes a clef toggle/readout and selected-position
  preview with immediate note playback.
- Rhythm composer now supports token removal, undo, clear, overfill feedback,
  playback cursor state, and tap tempo.
- Piano-roll and harmony workbenches now show selected order, bass/slot
  context, slot replacement, and chord-symbol labels.
- Scale Auto-Correct highlights target notes and off-scale selections, and
  chord stacker feedback detects likely chord names.
- Shared practice result panel with correct answer, explanation, citation lens,
  retry, targeted interaction hint, and next prompt.
- Shared audio engine for lesson examples, home previews, practice prompt
  playback, rhythm playback, and Song Lab loops.
- Deterministic generated prompts for pitch, staff, scales, intervals, chords,
  harmony, rhythm, ear training, and instruments.
- Generated session config for difficulty, topic, key, clef, prompt count, and
  audio replay.
- Local practice mastery by module with attempts, correct count, streak-lite,
  last practiced timestamp, and review queue.
- Adaptive skill mastery with ease, interval days, due dates, lapses, and last
  result.
- `/review` mixed practice that prioritizes due skills, then missed prompts,
  then completed-lesson module prompts.
- `/lab/song` play-first eight-bar beat, bass, chord, melody, and form builder.
- Song Lab 3.0 with voice guide, mute/solo, regenerate, duplicate section,
  explain loop, and playback cursor state.
- Song Lab theory-sync panel for active key, chord tones, scale notes, and safe
  melody notes.
- `/lab/song/sketches` local save, duplicate, delete, export, and import.
- `/progress/export` full local progress export/import with preview.
- `/plan/content-review` educator QA workflow for citations, outcomes, source
  discipline, and practice-route links.
- Course map page.
- Lesson reader route with course rail, lesson body, source panel, and
  prerequisite panel.
- Twenty-three MDX lessons, including interval fluency, minor/modes, seventh
  chords in keys, cadences, common progressions, voice-leading basics, pop/rock
  harmony, form sections, and analysis lab.
- Typed lesson metadata.
- Source bibliography data.
- Glossary data and search page.
- Local progress provider and storage normalization.
- Completion, bookmark, last-lesson, micro-check, audio, and reduced-motion
  settings.
- Persisted local practice attempts.
- VexFlow notation component.
- Tone.js audio component.
- Visible audio states: Ready, Loading audio, Playing, Stopped, Audio disabled,
  and Audio unavailable.
- Lesson learn-by-doing cards for practice, hearing, Song Lab, and review.
- Instrument practice input modes and first generated full-band prompts.
- Keyboard pitch-class component.
- Project plan page at `/plan`.
- Interactive roadmap documentation and in-app module goals.
- README, plan, progress, and architecture documentation.
- Unit tests for metadata, progress storage, and music helpers.
- Component tests for micro-checks, glossary filtering, course map rendering,
  and practice route interaction.
- Unit tests for practice scoring and prompt cycling.
- Curriculum coverage test for the explicit beginner topic list.
- Playwright tests for desktop/mobile learning flow, accessibility scan, reload
  persistence, and offline app shell.
- Repository documentation.

## Verification

Latest verification commands run successfully:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
npm run e2e
```

Latest automated coverage:

- 27 unit/component/content test files passed.
- 52 unit/component/content tests passed.
- 18 Playwright tests passed across desktop and mobile projects.
- Browser e2e covers the V7 launchpad, generated practice, review, Song Lab,
  progress export/import route, content review route, accessibility scan, and
  offline app shell.

Known build note:

- Vite reports a chunk-size warning because VexFlow is large. VexFlow is already
  dynamically imported and split into its own production chunk. This is not a
  failing condition for V7.

## In Progress

- Educator review of lesson prose and musical examples.
- Deeper generated prompt coverage inside each template family.

## Planned Next

Recommended next implementation order:

1. Add more concrete prompt factories behind each generated template family.
2. Deepen instrument-specific chord-shape, scale-box, bassline, and groove tasks.
3. Add deeper cadence, progression, phrase, and harmonic-function templates.
4. Add optional MIDI adapter after privacy and reliability UX are explicit.
5. Add optional cloud sync only after account/privacy decisions are explicit.

## Risks And Open Items

- Source text must remain original. Teoria, MusicTheory.net, Ableton, and other
  references should not be copied.
- The app is local-only. Clearing browser storage removes learner progress.
- Audio playback depends on browser Web Audio support and user gesture rules.
- Staff notation layout may need per-example tuning as lessons grow.
- Future drill engines should reuse shared scoring and progress patterns instead
  of embedding one-off logic inside lessons.
