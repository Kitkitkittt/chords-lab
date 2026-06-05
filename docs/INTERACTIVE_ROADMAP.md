# Interactive Roadmap

Last updated: 2026-06-05

## Direction

Chords Lab should grow from a reference-course PWA into a full interactive music
learning workspace. The priority is to keep the index page playable so a learner
can touch a concept, hear it, see it, and then continue into a focused lesson.

## Current Index Launchpad And Mission Map

The home page now includes five playable entry cards:

- Due review: shows due skill and missed-prompt counts before opening review.
- Play Song Lab: previews a generated four-chord loop.
- Build a scale: choose a tonic and switch major/minor collections.
- Tap rhythm: toggle four beat cells and play the active pattern.
- Staff challenge: answer a small staff-position prompt.

This makes `/` the practice entry point instead of only a resume page.

V5 added a lightweight mission map above the resume panel:

- Today's review: links to due adaptive review and missed prompts.
- New concept: links to the next incomplete lesson.
- Play task: links to Song Lab and shows saved local sketches.

V7 adds the UX flow layer around this launchpad:

- Global toasts for progress saves, offline mode, audio state, and review queue
  updates.
- Spatial course map states for complete, current, available, and suggested
  next lessons.
- Lesson checkpoints with three generated prompts and 2-of-3 completion.
- Review prompts clear only after two consecutive correct answers.
- Song Lab theory-sync for active key, chord tones, scale notes, and safe
  melody notes.

## Current Practice Routes

The `/practice/:moduleId/setup` and `/practice/:moduleId` routes now include:

- Module cards for Pitch, Staff, Scales, Intervals, Chords, Harmony, Rhythm,
  and Ear training.
- Generated session setup for difficulty, topic, key, clef, prompt count, and
  audio replay.
- A reusable prompt/session pattern for answer selection, checking, feedback,
  retry, and next-prompt navigation.
- Persisted local practice attempts in `chordslab.progress.v1`.
- Local mastery summaries with per-module attempts, streak-lite counts, last
  practiced timestamps, and review queues.
- Deterministic generated prompts for note reading, staff clicks, scales,
  intervals, chords, harmony boards, rhythm grids, and replayable ear training.
- Direct workbenches for staff positions, rhythm tokens, piano-roll note
  selection, Roman numeral slots, and analysis labels.
- Tap-first polish for staff note preview playback, scale Auto-Correct,
  chord-stack detection, and rhythm tap tempo.
- Prompt-template metadata with at least ten template categories per module.
- A shared audio engine for lesson, practice, rhythm, home, and Song Lab
  playback with stop support and visible state labels.
- Wrong-answer hints that show what was selected, a small retry hint, and a
  linked module route.
- Full-band Instrument Lab routes cover piano, guitar, bass, drums, voice
  guide, and ukulele.
- Song Lab includes voice guide, mute/solo, regenerate, duplicate section,
  explain loop, playback cursor state, and theory-sync context.

`/review` now prioritizes due adaptive skills, then missed prompts, then module
fallback prompts. Missed prompts stay queued until two correct answers in a row.
`/lab/song` adds a play-first eight-bar sketch space with drums, bass, chords,
melody, and form blocks plus theory-sync context. `/lab/song/sketches` manages
local save, duplicate, delete, export, and import. `/progress/export` exports or
imports the full local progress object with preview.

## Module Goals

1. Pitch module
   - Expand repeatable note-name checks.
   - Add staff-position checks for treble and bass clef.
   - Add keyboard-to-staff mapping prompts.
   - Status: direct staff challenge, staff preview sound, and generated note
     prompts are implemented; more prompt factories remain next.

2. Scale module
   - Add tonic selector with major, natural minor, harmonic minor, and melodic
     minor.
   - Add drag or tap scale-degree construction.
   - Add key-signature and circle-of-fifths feedback.
   - Status: home scale builder, sequence prompts, piano-roll workbench, and
     Auto-Correct highlighting are implemented; harmonic/melodic minor need
     deeper templates.

3. Chord module
   - Expand triad construction by root, third, and fifth.
   - Add inversion recognition.
   - Add seventh chords after triads are stable.
   - Add chord-symbol reading and spelling feedback.
   - Status: triads, inversions, sevenths, piano-roll selection, chord-stack
     detection with quality/cardinality labels, and basic Roman numeral prompts
     are implemented; inversions are now derived from `Chord.degrees` for any
     chord. Cadence depth remains next.

4. Rhythm module
   - Add beat-grid pattern builder.
   - Add note/rest duration checks.
   - Add dotted notes, ties, tuplets, and measure-completion prompts.
   - Status: rhythm composer supports hits, rests, dots, ties, tuplets,
     compound/odd meter labels, remove, undo, clear, overfill feedback,
     playback cursor state, tap tempo, and playback; dictation depth remains
     next.

5. Ear module
   - Add listen-and-identify checks for pitch direction, intervals, triads, and
     rhythm patterns.
   - Keep all ear-training prompts untimed and replayable.
   - Status: interval, triad, seventh, scale, cadence, rhythm, melody, bass,
     and progression listening categories are represented; more audio variants
     remain next.

6. Review module
   - Add mixed practice sessions that draw from completed lessons.
   - Add local mastery summaries without accounts or analytics.
   - Status: adaptive due-skill ordering, review queues, two-correct prompt
     clearing, and mixed prompt fallback are implemented.

7. Song Lab
   - Add beat, bass, chord, melody, and form pattern blocks.
   - Keep playback generated, local, and user-triggered.
   - Status: eight-bar local sketch builder, voice guide track, mute/solo,
     regenerate, duplicate section, explain loop, playback cursor, theory-sync,
     and saved sketches are implemented.

8. Instrument Lab
   - Add piano, guitar, bass, drums, voice, and ukulele workbenches.
   - Keep all input on-screen; MIDI remains a later adapter.
   - Status: instrument routes, chord/scale inspector, fretboards, drum pads,
     voice guide, and first instrument practice prompts are implemented.

9. Optional Sync
   - Add disabled sync metadata and a local repository interface.
   - Keep accounts and cloud sync out of the default experience.
   - Status: local repository and cloud stub are implemented.

10. Local Portability
   - Export and import the full progress state with preview.
   - Keep the same `chordslab.progress.v1` storage key.
   - Status: `/progress/export` is implemented.

11. Content Review
   - Flag missing citations, outcomes, and practice route links.
   - Keep source use as taxonomy only, not copied prose or assets.
   - Status: `/plan/content-review` is implemented.

## Interaction Rules

- Every practice action must have visible text labels and keyboard access.
- Audio remains user-triggered and can be disabled.
- No timed quizzes in the beginner flow.
- Diagrams are rendered from data, not screenshots.
- Scoring stays local under `chordslab.progress.v1`; export/import is manual
  and account-free.

## Implementation Order

Done:

- A derived theory engine (`src/lib/theory.ts`) now generalizes scales, keys,
  Roman numerals, progressions, inversions, solfege, and voice leading to all
  keys. See `docs/THEORY_ENGINE.md`.
- A voice-leading practice family backs the Voice-Leading lesson.
- A skill graph (`src/lib/skills.ts`) links lessons -> skills -> prompts ->
  review, powering soft recommendations and interleaved review. See
  `docs/SKILL_GRAPH.md`.
- Parallel learning tracks surfaced on Home. See `docs/LEARNING_TRACKS.md`.
- Interactive theory tools at `/tools/circle` and `/tools/progression`: circle
  of fifths, chord progression playground, voicing diagram, and a fretboard
  scale-box explorer.
- Cadence-identification and harmonic-function practice; full modal coverage in
  the scales module.
- Optional Easy/Hard confidence rating after correct answers (Practice and
  Review).
- Review interleaves due-skill prompts round-robin for better retention.
- Selectable active learning track stored in local progress, biasing Home
  suggestions.

Next:

1. Add more concrete prompt factories behind each generated template category.
2. Deepen instrument-specific chord-shape, scale-box, bassline, and groove tasks.
3. Add track-scoped review sessions and per-track milestones.
4. Add educator-reviewed lesson/example revisions.
5. Optional opt-in microphone tuner (pitch match with cents feedback) using the
   engine's `nearestNoteFromFrequency`. This would change the current
   no-microphone stance, so it is deferred behind explicit consent, an
   off-by-default setting, and local-only processing. Not built yet.
6. Add optional cloud sync only after account/privacy design is explicit.
