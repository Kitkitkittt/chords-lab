# Chords Lab Progress

Last updated: 2026-06-05

# Chords Lab Progress

Last updated: 2026-06-09

## Learning Experience - Phase 5: De-fragilize Mappings (2026-06-09)

Removed a class of drift bugs by centralizing lesson connections.

- New `src/data/lessonLinks.ts` is the single source of truth for each lesson's
  practice route, checkpoint module, and review modules. Replaced the two
  duplicated hand-maintained maps in `LessonPage` (`lessonPracticeRoutes`,
  `lessonCheckpointModules`) and the long `modulesForCompletedLessons` ladder in
  `ReviewPage` with `lessonLinkFor` and `reviewModulesForCompletedLessons`.
- Tests: `lessonLinks.test.ts` asserts every lesson resolves to a valid module
  and route (no orphans/drift). Suite: 109 unit/component tests, 24 Playwright
  tests.

## Learning Experience - Phase 4: Calm Motivation (2026-06-09)

Added gentle, opt-in acknowledgments consistent with the no-pressure ethos.

- Skill level-up acknowledgment: when a canonical skill crosses a level boundary
  (new -> learning -> practiced -> strong) the app emits a
  `chordslab:skill-levelup` event and the toast layer shows a calm note (e.g.
  "Interval quality reached strong - keep going at your own pace"). Detection
  uses new `skillLevelMap` + `SKILL_LEVEL_RANK` helpers in `learningPath.ts`.
- Home's "Today's review" card now reads as a gentle daily goal: "All clear -
  nothing due today" when the queue is empty, otherwise the due/missed counts.
- No streaks-as-pressure, no XP, no badges; all acknowledgments are dismissible
  toasts.
- Tests: `skills.test.ts` covers level-up detection. Suite: 106 unit/component
  tests, 24 Playwright tests.

## Learning Experience - Phase 3: Lesson Experience (2026-06-09)

Made lessons more hands-on and the completion flow clearer.

- The lesson checkpoint copy now frames it as the calm primary completion path
  ("Two correct marks the lesson complete, any misses join your review queue. No
  timer, no penalty").
- The final lesson pager step now recommends the next still-incomplete lesson
  (via `getFirstIncompleteLesson`) instead of dead-ending on /progress, and shows
  "You finished the course" only when everything is done.
- `KeyboardFigure` gained an optional `playable` mode: keys become buttons that
  play their pitch through the live-voice engine, so lessons can be hands-on
  inline.
- `MicroCheck` now gives distinct feedback - "Correct." vs "Not quite - the
  answer is X" - instead of the same explanation for right and wrong.
- Tests: `MicroCheck.test.tsx` asserts the incorrect-answer reveal. Suite: 105
  unit/component tests, 24 Playwright tests.

## Learning Experience - Phase 2: Ear Training Depth (2026-06-09)

Made ear training train hearing rather than memorization.

- Chord-quality and interval ear prompts now play as block chords (mode
  "chord") instead of always arpeggiating; scales/cadences/melodies stay
  sequenced.
- Seed-driven transposition: transposable prompts are shifted by a per-seed
  semitone offset so the same relationship is heard in different registers and
  cannot be memorized by fixed pitch (determinism preserved via the seed).
- "Reveal notes" is gated for listening prompts until an answer is submitted, so
  the reveal no longer short-circuits the exercise.
- Tests: `practiceGenerators.test.ts` asserts seed transposition and block-chord
  playback. Suite: 104 unit/component tests, 24 Playwright tests.

## Learning Experience - Phase 1: Session Momentum & Payoff (2026-06-09)

Gave practice sessions a sense of progress and a real ending.

- `usePracticeSession` now exposes `liveStats` (prompt number, total, answered,
  running correct, current streak, best streak) and tracks streaks on submit.
- In-session header shows a progress bar plus "Prompt X of N - N correct -
  streak N" (text-first, still no timer).
- The end-of-session summary is now meaningful: an encouraging title for strong
  sessions (>=80%), correct/attempted with best streak, review-queue size, and
  clear CTAs - "Review your misses", "Practice again", and "Next: <module>". A
  calm success tone plays once at the end of a strong session.
- Tests: `PracticePage.test.tsx` asserts the in-session progress indicator.
  Suite: 103 unit/component tests, 24 Playwright tests.

## Interactive Instruments - Phase C & D: Expression & Connections (2026-06-07)

Added expressive controls and connected instruments to the rest of the app.

- Piano gained a low/mid/high octave-range control so learners can play in a
  register that suits the material.
- Guitar/ukulele chord shapes gained Block (strum-as-chord) and Strum
  (arpeggiated sequence) play buttons.
- Press/hit transitions on keys, frets, and pads, all gated by
  `prefers-reduced-motion`.
- The piano free-play panel now has "Send to Song Lab": the detected chord
  seeds a new Song Lab sketch (literal chord symbols pass through
  `theoryContextForChord`), extending the existing tool-to-creation pattern.
- Verified: typecheck, lint, full unit suite, build, and Playwright e2e all
  green.

## Interactive Instruments - Phase B: Instrument-as-Practice (2026-06-07)

Made the instrument itself an answer surface and added free-play analysis.

- The generated `/practice/instruments` flow can now be answered by playing the
  real instrument: piano key taps and fretboard fret taps feed the prompt
  answer (piano notes are normalized to pitch classes). Wired through
  `InstrumentPromptWorkbench` via the piano `onToggle` and a new fretboard
  `onSelectNote` callback; the prompt is disabled after submission.
- New "play chords" instrument topic (`generateInstrumentBuildPrompt`): prompts
  like "Play the notes of C on the piano" are scored as chord-builder answers
  against the chord's pitch classes, deepening applied theory on the instrument.
- Free-play chord detector on the piano instrument page: tapped notes are shown
  with the detected chord name via `describeChordStack`, with a clear control.
- Tests: extended `practiceGenerators.test.ts` (play-on-instrument prompts).
  Suite: 102 unit/component tests, 24 Playwright tests.

## Interactive Instruments - Phase A: Playable Audio (2026-06-07)

Turned the read-only instrument maps into genuinely playable instruments.

- Audio engine gained a live-voice layer (`src/lib/audioEngine.ts`):
  `triggerNoteAttack`/`triggerNoteRelease` (press-and-hold sustain),
  `triggerNote` (one-shot for keyboard activation and drum hits),
  `releaseAllLiveNotes`/`disposeLiveVoices` for cleanup, `playDrumKit` (all rows),
  and `liveVoiceForInstrument`. Distinct lazily-created Tone.js timbres: keys
  (Synth), pluck (PluckSynth) for guitar/uke, bass (triangle PolySynth), voice
  (AMSynth), and kick/snare/hat/clap percussion (Membrane/Noise synths). Voices
  are cached and reused across taps.
- Piano keys now sound on pointer-down and sustain until release; Enter/Space
  plays a one-shot. Keys are labeled and keyboard operable.
- Fretboard cells became real buttons that play the fretted note (octave derived
  from the open string + fret), fixing the prior non-interactive scroll region.
- Drum pads preview their own voice on tap; the instrument "Play" now sequences
  all four rows with a moving cursor (was kick-only).
- Voice ladder steps play their reference pitch on tap.
- `InstrumentPage` threads the `audioEnabled` setting and releases live voices on
  unmount. Press states and reduced-motion handled in CSS.
- Tests: `InstrumentWorkbenches.test.tsx` (timbre mapping + press wiring for all
  four instruments); wrapped `InstrumentsPage` route test in `ProgressProvider`.
  Suite: 101 unit/component tests, 24 Playwright tests.

## Navigation Redesign (2026-06-07)

Replaced the cramped 12-item flat nav with a clear, responsive hierarchy.

- Information architecture: 5 always-visible primaries (Home, Learn, Practice,
  Tools, More). Secondary destinations are grouped under "More": Practice & play
  (Review, Instruments, Song Lab), Reference (Glossary, Sources), and Your data
  & info (Progress, About, Plan). Shared nav data lives in
  `src/components/navItems.ts`.
- New `MoreMenu` component: an accessible disclosure (button with
  `aria-expanded`/`aria-haspopup`/`aria-controls`) that renders as a popover on
  desktop and a bottom sheet on mobile. Closes on outside click, Escape (returns
  focus to the button), and route change. Unique panel ids per instance.
- Mobile gets a fixed bottom tab bar with the 5 primaries (icon + label, >=44px
  targets, safe-area inset padding). The top primary bar is hidden on mobile;
  the old icon-only tablet rule and the horizontal scroll strip were removed so
  labels always show.
- The footer now carries grouped "More pages" quick-links as a secondary path on
  desktop.
- Tests: added `AppLayout.test.tsx` (primaries, More open/Escape, bottom nav) and
  an e2e "More menu" navigation test (desktop + mobile). Suite: 96 unit/component
  tests, 24 Playwright tests.
- No route or `ProgressState` changes; purely presentational and accessibility.

## Launch Polish Pass (2026-06-05)

Rounded the app out for real-world use.

- Generated real PNG app icons (192, 512, and a dedicated 512 maskable with a
  full-bleed brand background) from the SVG via `scripts/generate-icons.mjs`
  (sharp, dev-only). Updated the PWA manifest to reference them with correct
  `purpose` values and the `apple-touch-icon`.
- Added an `/about` page covering the local-first privacy model (no accounts,
  no tracking, offline, storage key, no microphone), credits, and links to
  progress export and sources. Added an "About" nav entry.
- Added a calm, dismissible first-run welcome tour (`WelcomeTour`) shown once
  per browser via its own `chordslab.tour.v1` key (separate from progress), with
  reduced-motion support.
- Tests: added `AboutPage.test.tsx`, `WelcomeTour.test.tsx`, and a Playwright
  tour test; existing e2e pre-seeds the tour-seen flag so flows are unaffected.
  Suite: 92 unit/component tests, 22 Playwright tests (desktop + mobile).

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
