# Chords Lab Progress

Last updated: 2026-06-05

## Production-Readiness Pass (2026-06-05)

Made the app resilient and shareable for real use.

- Added a top-level `ErrorBoundary` (wraps the app in `main.tsx`) that catches
  render crashes and shows a calm recovery screen with reload/home actions
  instead of a blank page. Local progress is never touched.
- Enriched `index.html` with Open Graph, Twitter card, and iOS/Android PWA meta
  (`apple-mobile-web-app-*`, `apple-touch-icon`, `color-scheme`) for installable,
  shareable behavior.
- Polished the 404 page with both "Go home" and "Course map" actions.
- Tests: added `ErrorBoundary.test.tsx`. Full suite stays green (88 unit/
  component tests; 20 Playwright tests across desktop and mobile).

## Feature Pass: Tool-to-Creation & Track-Aware Review (2026-06-05)

- The Chord Progression Playground now has an "Open in Song Lab" action. It
  navigates to `/lab/song` with the current key, mode, and Roman numerals as
  router state; Song Lab seeds a fresh eight-bar sketch from that progression.
  This connects the new theory tools to the creation surface.
- The Review session now honors an active learning track: when one is set, that
  track's module prompts are surfaced ahead of general fallback prompts (still
  soft, nothing excluded).
- Tests: `ToolsPage.test.tsx` (Open-in-Song-Lab action), `SongLabPage.test.tsx`
  (seeded-from-progression sketch). Storage and routes remain
  backward-compatible (router state is optional and validated).

## Wire-up & Polish Pass (2026-06-05)

Closed integration gaps left after the interactive learning pass.

- Review now interleaves the due-skill review queue round-robin across skills
  (`interleaveReviewQueue`) before module fallback prompts, for better
  retention.
- The optional Easy/Hard confidence rating is now offered in the Review session
  too (previously Practice only); lesson checkpoints stay deliberately minimal.
- `/tools/circle` and `/tools/progression` are now distinct: `ToolsPage` shows
  in-page tabs driven by the route (Circle & keys vs Progressions) instead of
  one long stack.
- Learning tracks are now selectable: `ProgressState.settings.activeTrackId`
  (additive, normalized against known track ids) plus a `setActiveTrack` action
  and a "Set as focus / Clear focus" control on each Home track card. When a
  track is active, `recommendSkills` promotes that track's skills.
- Tests: extended `ReviewPage.test.tsx` (confidence rating), `ToolsPage.test.tsx`
  (route-driven tabs), `skills.test.ts` (track bias), and
  `progressStorage.test.ts` (active-track normalization); added a Playwright
  tools route + axe smoke.

## Interactive Learning Optimization (2026-06-05)

A five-phase pass that deepened the interactive learning experience on top of
the derived theory engine.

- Phase 1 (surface engine): chord-stacker now shows quality and cardinality via
  `describeChordStack`; Song Lab gained a key/mode selector (24 keys + minor)
  threaded through `theoryContextForSongSketch`; the voice workbench solfege
  ladder follows the active key.
- Phase 2 (skill graph): added `src/lib/skills.ts` (typed skill taxonomy linking
  lessons -> skills -> prompts) and `src/lib/learningPath.ts` (mastery rollups,
  soft recommendations, interleaved review, overall mastery). Home shows
  "Suggested focus" cards; Progress shows "Skills by area"; the practice result
  panel offers an optional Easy/Hard confidence rating that nudges review ease.
  `LessonMeta` gained an optional additive `skills` field.
- Phase 3 (interactive tools): added `/tools/circle` and `/tools/progression`
  routes via a new `ToolsPage`, with a `CircleOfFifths` widget, a
  `ChordProgressionPlayground` (key + Roman numerals + playback + voice
  leading), a `VoicingDiagram`, and a fretboard scale-box explorer. Added a
  "Tools" nav entry.
- Phase 4 (curriculum depth): added a cadence-identification practice family and
  a harmonic-function detail; expanded the scales module to all seven modes;
  registered `CircleOfFifths` as a lesson component and embedded it in the
  scales-keys lesson.
- Phase 5 (learning tracks): derived parallel learning tracks (Reading & Pitch,
  Harmony & Songwriting, Ear & Rhythm) from the skill graph and surfaced them on
  Home with per-track mastery and a next step.
- Docs: added `docs/SKILL_GRAPH.md` and `docs/LEARNING_TRACKS.md`; updated
  README, ARCHITECTURE, and INTERACTIVE_ROADMAP. The opt-in microphone tuner is
  recorded as a roadmap item only and is not built; the no-microphone stance is
  unchanged for now.
- Tests: added `src/lib/skills.test.ts` and `src/pages/ToolsPage.test.tsx`;
  storage stays backward-compatible (additive `SongSketch.key/mode` and
  `LessonMeta.skills`, normalized with defaults).

## Theory Engine Upgrade (2026-06-05)

Goal: deepen Tonal usage and adopt teoria's pedagogical conventions so theory
facts are derived and correct for every key.

- Added `src/lib/theory.ts`, a pure engine using Tonal's `Key`, `RomanNumeral`,
  `Progression`, `Mode`, `Chord`, `Voicing`, `VoiceLeading`, and `Midi` modules.
- Switched interval names from Tonal's machine form (`3M`) to the conventional
  pedagogical form (`M3`, "major third"), matching teoria and most theory texts.
- Replaced the hand-built 26-entry enharmonic table with `Note.enharmonic` /
  `Note.simplify` and chroma-based keyboard mapping.
- Replaced the C/G/F-only Roman-numeral table in `theoryContext.ts` with
  `keyContext`-derived chords. Song Lab theory-sync now supports minor keys and
  figured-bass inversion tokens (for example `I6`).
- Generalized scale, harmony, and key-signature practice generation to all 24
  keys; harmony chords are now derived from their Roman numerals so spelling can
  never drift.
- Derived instrument chord-tone, scale-degree, bass-target, and key-aware
  solfege helpers from the engine.
- Added a voice-leading practice family (`Voicing.sequence` +
  `VoiceLeading.topNoteDiff`) behind the existing Voice-Leading lesson.
- Added a key-aware movable-do solfege layer and a frequency-to-note (with
  cents) helper.
- Added chord quality/cardinality labels to the chord-stack detector via
  `describeChordStack`.
- Fixed a latent bug where interval prompts compared Tonal's `5P` answer against
  verbose choices like "perfect fifth" and could never match.
- Documentation: added `docs/THEORY_ENGINE.md`; updated `README.md`,
  `docs/ARCHITECTURE.md`, `docs/PLAN.md`, `docs/INTERACTIVE_ROADMAP.md`, and
  `src/data/sources.ts`.
- Tests: added `src/lib/theory.test.ts` (15 cases) and extended
  `interactionTools` and `music` specs; full suite passes.

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

- Unit/component/content test files pass (now including `theory.test.ts`).
- 68 unit/component/content tests passed.
- Playwright tests pass across desktop and mobile projects.
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
