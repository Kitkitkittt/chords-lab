# Chords Lab

Chords Lab is a local-first, interactive music theory PWA for
beginner-to-early-intermediate learners. It teaches core theory through short
lessons, generated practice sessions, replayable audio, rendered notation,
playable on-screen instruments, interactive theory tools, local progress with
spaced review, and a Song Lab for building musical patterns.

The app is intentionally calm: no accounts, no timers, no autoplay, no backend,
and no analytics. Progress stays in the learner's browser.

## Highlights

- Derived music-theory engine built on Tonal (`src/lib/theory.ts`): notes,
  intervals, scales, modes, keys, Roman numerals, progressions, chord
  inversions, solfege, and voice leading — correct for every key.
- A skill graph that links lessons to skills to prompts, powering soft
  recommendations, interleaved spaced review, and parallel learning tracks.
- Playable instruments (piano, guitar, bass, drums, voice, ukulele) with
  tap-to-sound, press-and-hold sustain, distinct timbres, and instrument-as-
  answer practice.
- Interactive theory tools: a circle of fifths, a chord-progression playground
  with voice-leading, and a fretboard scale-box explorer.
- Calm momentum: in-session progress and streaks, meaningful end-of-session
  summaries, and gentle skill level-up acknowledgments (no streak pressure).
- Installable, offline-capable PWA with a crash-recovery error boundary and a
  first-run welcome tour.

## Contents

- [Highlights](#highlights)
- [What Chords Lab Does](#what-chords-lab-does)
- [Current App Status](#current-app-status)
- [Feature Tour](#feature-tour)
- [Curriculum](#curriculum)
- [Routes](#routes)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Available Scripts](#available-scripts)
- [Project Structure](#project-structure)
- [Local Progress And Privacy](#local-progress-and-privacy)
- [Testing](#testing)
- [PWA And Offline Behavior](#pwa-and-offline-behavior)
- [Deployment](#deployment)
- [Content And Source Policy](#content-and-source-policy)
- [Roadmap](#roadmap)
- [Troubleshooting](#troubleshooting)

## What Chords Lab Does

Chords Lab gives learners a guided path through practical music theory:

- Read pitch names, octaves, staffs, clefs, and keyboard positions.
- Understand rhythm, beat, meter, rests, dots, ties, triplets, and measures.
- Build scales, use accidentals, name scale degrees, and recognize key patterns.
- Measure intervals and spell triads, inversions, seventh chords, and basic
  Roman numerals.
- Practice ear-training prompts only after a user chooses to play audio.
- Save completed lessons, bookmarks, settings, check attempts, practice
  attempts, mastery summaries, and missed-prompt review queues in local storage.
- Use a play-first Song Lab to combine beat, bass, chords, melody, and form.

The product goal is a low-noise learning workspace rather than a dense textbook
or timed quiz app.

## Current App Status

This repository contains the implemented V7 local app.

Implemented:

- React app shell with route-level pages.
- MDX lesson system with typed lesson metadata.
- Twenty-three beginner-to-early-intermediate lessons across nineteen course
  modules.
- Home page with resume panel and interactive launchpad for due review, Song
  Lab, scale building, rhythm tapping, and staff challenge.
- Global UX feedback layer for progress saves, offline mode, audio availability,
  review queue updates, and success/correction feedback tones.
- Spatial constellation course map with complete, current, available, and
  suggested-next lesson states.
- Lesson checkpoint flow with three generated prompts at the end of every
  lesson; two correct answers marks the lesson complete.
- Review prompt state that clears missed prompts only after two consecutive
  correct answers.
- Focused generated practice routes for pitch, staff, scales, intervals,
  chords, harmony, rhythm, and ear training.
- Session setup for difficulty, topic, key, clef, prompt count, and audio
  replay.
- Reusable generated practice engine for choice, sequence, staff-click, rhythm-grid,
  piano-roll, listening, harmony-board, and analysis-board inputs.
- Direct workbenches for staff positions, rhythm tokens, piano-roll notes,
  harmony slots, and analysis labels.
- Tap-first refinements for staff sound preview, scale Auto-Correct
  highlighting, chord stack detection, and rhythm tap tempo.
- Shared audio engine for lesson examples, practice prompts, home previews,
  rhythm playback, and Song Lab loops with visible playback states and stop
  handling.
- Home mission map for review, a new concept, and a play task.
- Full-band Instrument Lab routes for piano, guitar, bass, drums, voice guide,
  and ukulele.
- Lesson learn-by-doing actions that route into practice, ear prompts, Song
  Lab, and review.
- Incorrect-answer hints with a selected-answer explanation and a retry route.
- Mixed review page that prioritizes due adaptive skills and missed local
  prompts.
- Full local progress export/import at `/progress/export`.
- Educator content-review workflow at `/plan/content-review`.
- Song Lab 3.0 with editable eight-bar drums, bass, chords, melody, voice guide,
  form, mute/solo, regenerate, duplicate section, explain loop, local save,
  duplicate, delete, export, and import.
- Song Lab theory-sync panel for active key, chord, chord tones, scale notes,
  and safe melody notes.
- Optional cloud preparation through disabled sync metadata and a local progress
  repository interface.
- Local progress provider and storage normalization.
- A derived music-theory engine (`src/lib/theory.ts`) built on Tonal that
  generalizes scales, keys, Roman numerals, progressions, inversions, solfege,
  and voice leading to all keys.
- A skill graph (`src/lib/skills.ts`) and learning path
  (`src/lib/learningPath.ts`) that link lessons to skills to prompts, drive
  Home "Suggested focus" cards, per-skill mastery on Progress, interleaved
  review, an optional Easy/Hard confidence rating, and parallel learning tracks.
- Interactive theory tools at `/tools/circle` and `/tools/progression`: circle
  of fifths, chord progression playground, voicing diagram, and a fretboard
  scale-box explorer.
- PWA manifest and generated service worker.
- Unit, component, content, and Playwright e2e tests.

Not included:

- Backend API.
- User accounts.
- Cloud sync.
- Analytics.
- Payments.
- Teacher dashboards.
- MIDI input.
- Microphone scoring.

## Feature Tour

### Home

The home page is both a resume screen and a hands-on practice entry point. A
learner can continue their first incomplete lesson or try quick interactive
cards for due review, Song Lab, scale building, rhythm tapping, and staff
challenge.

### Learn

The course map shows the full curriculum by module. Lesson pages render MDX
content with shared interactive components, citations, prerequisites, completion
controls, bookmark controls, and a short generated checkpoint. The map is
spatial and guided, but no future lesson is hard locked.

### Practice

The practice workspace supports eight modules:

| Module | Focus |
| --- | --- |
| Pitch | Note-name recall from staff and keyboard clues. |
| Staff | Treble, bass, ledger-line, and keyboard mapping drills. |
| Scales | Scale construction, scale degrees, and key-signature checks. |
| Intervals | Interval size, quality, inversion, and ear-linked checks. |
| Chords | Triads, inversions, seventh chords, and Roman numerals. |
| Harmony | Roman numerals, cadences, and common progressions. |
| Rhythm | Beat grids, rests, measure completion, and triplets. |
| Ear training | Replayable listening checks for intervals, triads, and scale color. |
| Instruments | Full-band application for piano, guitar, bass, drums, voice, and ukulele. |

Prompt answers are checked locally. Incorrect prompts are added to per-module
and per-skill review queues. Skill review stores ease, interval days, due date,
lapses, and last result without adding timers or penalties.

### Review

The review route reads due skills and missed prompts from local progress, then
falls back to mixed module prompts when the queue is clear. Missed prompts stay
queued until the learner answers the same prompt correctly twice in a row.

### Song Lab

Song Lab is a user-triggered sketch surface for eight bars of drums, bass,
chords, melody, voice guide, and form. Sketches can be saved locally,
duplicated, deleted, and copied as JSON. The theory context panel updates with
the active chord block so safe melody notes and chord tones are visible while
editing.

### Instruments

Instrument Lab maps the same theory material across piano octaves, guitar and
ukulele chord shapes, bass fretboard targets, drum pads, and voice solfege
reference tones. V7 does not request microphone permission, and MIDI remains a
future adapter.

### Progress

The progress page shows local lesson completion, bookmarks, practice attempts,
mastery summaries, audio settings, reduced-motion settings, reset controls, and
a link to full progress export/import.

### Glossary And Sources

The glossary gives beginner-friendly definitions. The sources page explains the
reference materials used to shape the curriculum and implementation.

### Project Plan

The `/plan` route exposes project status and planned work from app data, so the
current product scope is visible inside the app.

The `/plan/content-review` route lists lesson citation, outcome, and
practice-route checks for educator review.

## Curriculum

The app currently ships with these course modules and lessons:

| Module | Lessons |
| --- | --- |
| Foundations | Sound, Pitch, and Octaves; Staff and Keyboard |
| Rhythm | Rhythm and Meter |
| Pitch Systems | Accidentals and Steps; Scales and Keys |
| Intervals and Chords | Intervals; Triads; Review and Glossary |
| Scale Fluency | Scale Fluency |
| Triads, Sevenths, and Inversions | Sevenths and Inversions |
| Diatonic Harmony | Diatonic Harmony |
| Rhythm and Meter Lab | Rhythm and Meter Lab |
| Ear Training Basics | Ear Training Basics |
| Song Building | Song Building |
| Intervals Fluency | Intervals Fluency |
| Minor Scales and Modes | Minor Scales and Modes |
| Seventh Chords in Keys | Seventh Chords in Keys |
| Cadences and Phrases | Cadences and Phrases |
| Common Progressions | Common Progressions |
| Voice-Leading Basics | Voice-Leading Basics |
| Pop/Rock Harmony | Pop/Rock Harmony |
| Form and Song Sections | Form and Song Sections |
| Analysis Lab | Analysis Lab |

Lesson metadata includes:

- Slug.
- Title.
- Module slug.
- Level.
- Estimated minutes.
- Outcomes.
- Prerequisites.
- Citations.

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Home, resume panel, and interactive practice hub. |
| `/learn` | Course map. |
| `/learn/start` | Redirects to the first lesson. |
| `/learn/:moduleSlug/:lessonSlug` | Lesson reader. |
| `/practice` | Practice workspace, defaulting to pitch practice. |
| `/practice/:moduleId/setup` | Generated session setup. |
| `/practice/:moduleId` | Deep-linked practice module. |
| `/review` | Mixed local review session. |
| `/lab/song` | Song Lab pattern builder. |
| `/lab/song/sketches` | Saved Song Lab sketches, export, and import. |
| `/tools/circle` | Interactive theory tools (circle of fifths). |
| `/tools/progression` | Interactive theory tools (chord progression playground). |
| `/glossary` | Searchable glossary. |
| `/sources` | Source bibliography and usage notes. |
| `/about` | About and privacy (local-first model, credits). |
| `/progress` | Local progress, bookmarks, mastery, and settings. |
| `/progress/export` | Full local progress export/import with preview. |
| `/plan` | In-app project plan and status. |
| `/plan/content-review` | Educator content-review checklist. |

## Tech Stack

Runtime:

- React 19.
- React Router 7.
- TypeScript.
- Vite.
- MDX.
- Vite PWA plugin.

Music and media:

- Tone.js for user-triggered Web Audio playback.
- VexFlow for rendered notation.
- Tonal for the music theory engine (notes, intervals, scales, modes, keys,
  Roman numerals, progressions, chords, voicings, and voice leading).

Interface:

- Self-hosted Fontsource fonts.
- Lucide React icons.
- Custom CSS token layer.

Verification:

- Vitest.
- Testing Library.
- Playwright.
- axe via `@axe-core/playwright`.
- ESLint.

## Getting Started

### Prerequisites

Use a recent LTS version of Node.js and npm. This project uses `package-lock.json`,
so npm is the expected package manager.

### Install

```bash
npm install
```

### Start The Dev Server

```bash
npm run dev
```

Vite will print the local URL, usually `http://localhost:5173/`.

### Build For Production

```bash
npm run build
```

The production build is written to `dist/`.

### Preview The Production Build

```bash
npm run preview
```

## Available Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start the Vite development server. |
| `npm run build` | Run TypeScript build checks and create a production Vite build. |
| `npm run preview` | Serve the production build locally. |
| `npm run test` | Run Vitest unit, component, and content tests once. |
| `npm run test:watch` | Run Vitest in watch mode. |
| `npm run e2e` | Run Playwright browser tests. |
| `npm run lint` | Run ESLint across the repo. |
| `npm run typecheck` | Run TypeScript project checks. |

## Project Structure

```text
.
+-- docs/
|   +-- ARCHITECTURE.md
|   +-- INTERACTIVE_ROADMAP.md
|   +-- PLAN.md
|   +-- PROGRESS.md
+-- public/
|   +-- icon.svg
+-- src/
|   +-- components/
|   +-- content/lessons/
|   +-- data/
|   +-- hooks/
|   +-- lib/
|   +-- pages/
|   +-- state/
|   +-- styles/
|   +-- test/
|   +-- types/
|   +-- App.tsx
|   +-- main.tsx
+-- tests/e2e/
+-- index.html
+-- package.json
+-- playwright.config.ts
+-- vite.config.ts
+-- tsconfig.json
```

Key files:

- `src/App.tsx` defines the route tree.
- `src/main.tsx` mounts React, registers the PWA service worker, and wraps the
  app in the progress provider.
- `src/data/course.ts` imports MDX lessons and builds the course structure.
- `src/data/practice.ts` defines practice modules and generated prompt entrypoints.
- `src/lib/audioEngine.ts` contains shared Tone.js pattern playback, stop, and
  duration helpers.
- `src/lib/instruments.ts` contains full-band instrument profiles, fretboard
  mapping, chord-tone labels, scale-degree labels, and Song Lab explanations.
- `src/lib/practiceEngine.ts` contains pure prompt scoring and render specs.
- `src/lib/practiceGenerators.ts` contains deterministic prompt generators.
- `src/lib/reviewQueue.ts` contains the two-consecutive-correct review rule.
- `src/lib/theoryContext.ts` contains Song Lab key/chord/safe-note helpers.
- `src/lib/practiceTemplates.ts` contains prompt-template metadata and rhythm
  validation helpers.
- `src/lib/adaptiveReview.ts` contains local adaptive review scheduling.
- `src/lib/progressExport.ts` contains full progress export/import helpers.
- `src/lib/songSketches.ts` contains Song Lab sketch helpers.
- `src/lib/music.ts` contains beginner-facing helpers that delegate to the
  theory engine.
- `src/lib/theory.ts` is the canonical music-theory engine built on Tonal; see
  `docs/THEORY_ENGINE.md`.
- `src/lib/progressStorage.ts` reads, writes, and normalizes local progress.
- `src/state/progress.tsx` exposes progress actions through React context.
- `src/components/lessonComponentMap.ts` maps MDX lesson components.
- `docs/ARCHITECTURE.md` describes the rendering, progress, and testing model.
- `docs/THEORY_ENGINE.md` documents the theory engine and its tonal usage.

## Local Progress And Privacy

Chords Lab stores learner data only in browser `localStorage`.

Storage key:

```text
chordslab.progress.v1
```

Stored data includes:

- Completed lesson slugs.
- Bookmarked lesson slugs.
- Last opened lesson.
- Micro-check attempts.
- Practice attempts.
- Per-module practice mastery.
- Skill mastery from generated prompts.
- Adaptive review ease, due date, interval, lapse, and last-result fields.
- Generated session history.
- Saved Song Lab sketches.
- Disabled sync metadata for a future optional cloud adapter.
- Missed-prompt review queues and prompt-level consecutive-correct state.
- Audio and reduced-motion settings.

Clearing browser storage removes progress. Song sketches and full progress can
be exported/imported as JSON. Account sync is not required in V7.

## Testing

Run the main verification suite:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
npm run e2e
```

Test coverage currently includes:

- Course metadata validity.
- Required citation presence.
- Prerequisite references.
- Curriculum coverage.
- Music helper output.
- Practice scoring and deterministic prompt generation.
- Review queue two-correct clearing.
- Song Lab theory context and tap-first interaction helpers.
- Prompt-template breadth, rhythm validation, and adaptive review scheduling.
- Shared audio duration helpers and wrong-answer hint generation.
- Progress serialization and normalization.
- Full progress export/import preview and parsing.
- Micro-check scoring.
- Glossary filtering.
- Course map rendering.
- Spatial map state, lesson checkpoint, and global feedback surfaces.
- Practice route interaction.
- Rhythm builder remove, undo, clear, and overfill feedback.
- Review queue rendering.
- Content-review route rendering.
- Song Lab sketch save, duplicate, delete, export, and import controls.
- Desktop and mobile Playwright flows.
- Accessibility scan.
- Offline app shell coverage.

Playwright starts a preview server at `http://127.0.0.1:42731` using the
configuration in `playwright.config.ts`.

## PWA And Offline Behavior

The app uses `vite-plugin-pwa` with an auto-updating service worker. The PWA
manifest defines Chords Lab as a standalone app and uses `public/icon.svg` as
the install icon.

Workbox is configured with:

- `navigateFallback: "/index.html"`.
- Asset precaching for JS, CSS, HTML, SVG, PNG, and WOFF2 files.

The expected offline behavior is an app-shell load after the first successful
visit. Learner progress remains local to the browser.

## Deployment

Chords Lab is a fully static single-page app — the production build in `dist/`
is just HTML, CSS, JS, and assets, so it can be hosted on any static host or
CDN. There is no server, database, or environment configuration to set up.

Build the site:

```bash
npm run build
```

This outputs to `dist/`. Serve that directory from any static host.

### SPA routing

The app uses client-side routing (React Router). Configure the host to rewrite
all unknown paths to `/index.html` so deep links like `/practice/pitch` work on
refresh.

- Netlify: a `public/_redirects` file with `/* /index.html 200`, or the build
  config equivalent.
- Vercel: a rewrite of `/(.*)` to `/index.html`.
- Cloudflare Pages / GitHub Pages / S3+CloudFront: enable SPA fallback to
  `index.html`.

### Netlify

```bash
npx netlify deploy --build --prod
```

Build command: `npm run build`. Publish directory: `dist`.

### Vercel

```bash
npx vercel --prod
```

Framework preset: Vite. Build command: `npm run build`. Output directory:
`dist`.

### Cloudflare Pages

Build command: `npm run build`. Build output directory: `dist`.

The service worker auto-updates on deploy, so returning visitors pick up new
versions after a reload.

## Content And Source Policy

Lesson text and practice wording should remain original to this project.
External resources are used as references or dependencies, not as copied lesson
material.

Current reference and implementation sources include:

- Teoria (teoria.com tutorials) for topic sequencing and terminology.
- teoria.js for pedagogical conventions (conventional interval names, solfege,
  scale-degree detection) reimplemented on top of Tonal.
- MusicTheory.net.
- Open Music Theory.
- Ableton Learning Music.
- VexFlow.
- Tonal (the music-theory engine).
- Tone.js.

Do not copy source lesson prose, exercise wording, screenshots, diagrams, or
assets into this repo. Use source notes and citations to explain influence and
verification.

## Roadmap

Near-term priorities:

- Educator/content review revisions for lesson prose and musical examples.
- More concrete prompt factories behind each generated template category.
- Deeper cadence, phrase-ending, and harmonic-function review.
- Richer Song Lab explain-this-loop feedback and more applied theory tasks.
- Later MIDI adapter support after the on-screen instrument workbenches remain
  stable.
- Optional cloud sync only after explicit account and privacy controls exist.

Later possibilities:

- Deeper fretboard scale boxes and instrument-specific etudes.
- Optional MIDI input.
- More advanced harmony, form, modulation, counterpoint, and pop/rock harmony
  lessons.
- Explicit sync only if a future release adds accounts and privacy controls.

See:

- [`docs/PLAN.md`](docs/PLAN.md)
- [`docs/PROGRESS.md`](docs/PROGRESS.md)
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- [`docs/INTERACTIVE_ROADMAP.md`](docs/INTERACTIVE_ROADMAP.md)
- [`docs/THEORY_ENGINE.md`](docs/THEORY_ENGINE.md)
- [`docs/SKILL_GRAPH.md`](docs/SKILL_GRAPH.md)
- [`docs/LEARNING_TRACKS.md`](docs/LEARNING_TRACKS.md)

## Troubleshooting

### Audio Does Not Play

Most browsers require a user gesture before Web Audio can start. Click a play
button inside the app first. Also check the audio setting on the progress page.

### Progress Disappeared

Progress is stored in localStorage. Browser storage cleanup, private browsing,
or a different browser profile can remove or hide saved progress.

### Playwright Cannot Start

Install browsers if the local Playwright install has not done so yet:

```bash
npx playwright install
```

Then run:

```bash
npm run e2e
```

### Production Build Warns About Chunk Size

VexFlow is a large dependency. A chunk-size warning can appear during the Vite
production build. The app already uses dynamic import behavior for notation, and
the warning is not a failing condition by itself.
