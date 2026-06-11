# Chords Lab V8 Progress

Last updated: 2026-06-10

Status legend: TODO / IN PROGRESS / SHIPPED (typecheck + lint + test + build + e2e pass)

## Wave 1 — Foundation slice — SHIPPED

| # | Feature | Module | Phase | Status |
| --- | --- | --- | --- | --- |
| 1 | MIDI export (Standard MIDI File) | `src/lib/midiFile.ts` | 1.1 | SHIPPED |
| 2 | Share-by-URL codec | `src/lib/sketchShare.ts` | 3.1 | SHIPPED |
| 3 | Suggest-next-chord | `src/lib/chordSuggest.ts` | 3.3 | SHIPPED |
| 4 | Smart Session planner | `src/lib/smartSession.ts` | 2.1 | SHIPPED |
| 5 | Practice insights | `src/lib/insights.ts` | 2.2 | SHIPPED |
| 6 | FSRS-style scheduler (core lib) | `src/lib/fsrs.ts` | 5.4 | SHIPPED (not yet wired into scheduler) |
| 7 | Pitch detection core | `src/lib/pitchDetect.ts` | 1.3 | SHIPPED |
| 8 | Dark mode theming + toggle | `theme.css`, `ProgressPage` | 7.1 | SHIPPED |

### Integration (done by lead, serially)
- [x] MIDI export wired into Sketches page (per-sketch "MIDI" download).
- [x] Share-by-URL wired into Sketches page ("Share link" copy + import-on-open via `#s=`).
- [x] Suggest-next-chord + progression summary wired into Song Lab theory panel.
- [x] `/practice/smart` route + "Smart session" in nav (More menu).
- [x] Insight cards rendered on `/progress`.
- [x] `/tools/tuner` route + `TunerPanel` component (opt-in mic, local-only).
- [x] Dark mode toggle in settings; `data-theme` on `<html>`; follows OS when "system".

### New files
- `src/lib/midiFile.ts` (+ test), `src/lib/sketchShare.ts` (+ test),
  `src/lib/chordSuggest.ts` (+ test), `src/lib/smartSession.ts` (+ test),
  `src/lib/insights.ts` (+ test), `src/lib/fsrs.ts` (+ test),
  `src/lib/pitchDetect.ts` (+ test).
- `src/components/TunerPanel.tsx`, `src/pages/SmartSessionPage.tsx`.

### Touched files
- `src/types/course.ts` (ThemePreference + settings.theme).
- `src/lib/progressStorage.ts` (normalize + default theme) and its test.
- `src/state/progress.tsx` (setTheme + data-theme effect).
- `src/pages/ProgressPage.tsx` (theme select + insight cards).
- `src/pages/SongSketchesPage.tsx` (MIDI/share/import-on-open).
- `src/pages/SongLabPage.tsx` (chord suggestions).
- `src/pages/ToolsPage.tsx` (tuner tab).
- `src/App.tsx` (smart + tuner routes).
- `src/components/navItems.ts` (Smart session entry).
- `src/styles/theme.css` (dark tokens) and `src/styles/global.css` (new component styles).

## Verification gate — PASS
```
npm run typecheck   # clean
npm run lint        # clean
npm run test        # 201 tests pass (53 new across 7 modules)
npm run build       # dist built (pre-existing VexFlow chunk-size warning only)
npm run e2e         # 28 Playwright tests pass (desktop + mobile + a11y scan)
```

## Wave 2 — Scheduler + reading/ear depth — SHIPPED

| Feature | Module | Phase | Status |
| --- | --- | --- | --- |
| FSRS scheduler integrated into adaptive review | `src/lib/adaptiveReview.ts` + `fsrs.ts` | 5.4 | SHIPPED |
| Melodic + rhythmic dictation generators | `src/lib/dictationGenerators.ts` (+ test) | 2.3 | SHIPPED |
| Sight-reading generators | `src/lib/sightReadingGenerators.ts` (+ test) | 2.4 | SHIPPED |
| Reusable focused practice surface | `src/components/StudioSession.tsx` | — | SHIPPED |
| Dictation studio page + route | `src/pages/DictationPage.tsx`, `/practice/dictation` | 2.3 | SHIPPED |
| Sight-reading studio page + route | `src/pages/SightReadingPage.tsx`, `/practice/sight-reading` | 2.4 | SHIPPED |

### FSRS integration notes (migration-safe)
- `SkillMastery` gained optional `stability`/`difficulty`/`reps` fields; old saved
  progress without them is seeded from a fresh card on first review (lossless).
- `updateAdaptiveSkillState` now schedules via the simplified FSRS model while
  keeping the legacy `ease`/`intervalDays` fields in sync for older readers.
- App convention preserved: a missed prompt is still due immediately.
- `progressStorage` normalizes and persists the new fields.

### Wave 2 verification — PASS
```
npm run typecheck   # clean
npm run lint        # clean
npm run test        # 219 tests pass (+18 from dictation + sight-reading)
npm run build       # dist built (pre-existing VexFlow chunk-size warning only)
npm run e2e         # 30 Playwright tests pass (added V8 studios + dark-mode test)
```

## Wave 3 — Input/output + arrangement — SHIPPED

| Feature | Module | Phase | Status |
| --- | --- | --- | --- |
| Web MIDI input parser (pure core) | `src/lib/midiInput.ts` (+ test) | 1.2 | SHIPPED |
| Web MIDI input hook (opt-in wiring) | `src/hooks/useMidiInput.ts` | 1.2 | SHIPPED |
| MIDI keyboard panel on Instruments | `src/components/MidiInputPanel.tsx` | 1.2 | SHIPPED |
| WAV export (offline render + encoder) | `audioEngine.ts` (`renderSongSketchToWav`, `encodeWavBytes`) | 1.4 | SHIPPED |
| WAV encoder tests | `src/lib/audioEngineWav.test.ts` | 1.4 | SHIPPED |
| Multi-section arranger model (pure) | `src/lib/songArranger.ts` (+ test) | 3.2 | SHIPPED |
| Arranger page + route `/lab/arrange` | `src/pages/ArrangerPage.tsx` | 3.2 | SHIPPED |
| WAV export + Arranger link in Song Lab | `src/pages/SongLabPage.tsx` | 1.4 / 3.2 | SHIPPED |

### Wave 3 notes
- Web MIDI stays opt-in/off by default: access is requested only on "Connect a
  keyboard", listeners fully detach on disconnect/unmount, Chromium-only with a
  calm unsupported message elsewhere. Note-on plays the shared `keys` voice.
- WAV export renders one pass of the sketch via `Tone.Offline` and encodes a
  16-bit PCM WAV; the encoder is split into a pure `encodeWavBytes` for testing.
- The arranger is a pure model: sections wrap sketches and `flattenArrangement`
  concatenates them into one `SongSketch` reused by the existing player/export.

### Wave 3 verification — PASS
```
npm run typecheck   # clean
npm run lint        # clean
npm run test        # 245 tests pass (+26 from MIDI input, arranger, WAV encoder)
npm run build       # dist built (pre-existing VexFlow chunk-size warning only)
npm run e2e         # 32 Playwright tests pass (added arranger + MIDI panel test)
```

## Waves 4-7 — Repertoire, motivation, curriculum, platform — SHIPPED

| Feature | Module | Phase | Status |
| --- | --- | --- | --- |
| Public-domain repertoire library (13 songs) | `src/data/repertoire.ts` (+ test) | 4 | SHIPPED |
| Progression spotter | `src/lib/progressionSpotter.ts` (+ test) | 4 | SHIPPED |
| Repertoire page + route `/lab/repertoire` | `src/pages/RepertoirePage.tsx` | 4 | SHIPPED |
| Practice journal + weekly digest | `src/lib/practiceJournal.ts` (+ test) | 5.1 | SHIPPED |
| Routines model | `src/lib/routines.ts` (+ test) | 5.3 | SHIPPED |
| Routines page + route `/routines` | `src/pages/RoutinesPage.tsx` | 5.3 | SHIPPED |
| Journal + digest on Progress page | `src/pages/ProgressPage.tsx` | 5.1 | SHIPPED |
| Advanced harmony generators | `src/lib/advancedHarmonyGenerators.ts` (+ test) | 6 | SHIPPED |
| Advanced harmony studio `/practice/advanced-harmony` | `src/pages/AdvancedHarmonyPage.tsx` | 6 | SHIPPED |
| First-species counterpoint checker | `src/lib/counterpoint.ts` (+ test) | 6 | SHIPPED |
| Counterpoint lab `/practice/counterpoint` | `src/pages/CounterpointPage.tsx` | 6 | SHIPPED |
| Note-naming systems (English/solfège/German) | `src/lib/noteNaming.ts` (+ test) | 7 | SHIPPED |
| Note-naming + color-blind settings | `ProgressPage`, `theme.css`, provider | 7 | SHIPPED |
| Color-blind-safe palette (Okabe-Ito) | `src/styles/theme.css` | 7 | SHIPPED |

### Waves 4-7 notes
- `ProgressState.settings` gained optional `noteNaming`, `colorBlindSafe`, and
  `routines` fields; all normalized and defaulted (migration-safe).
- Color-blind palette applies via `[data-color-blind="true"]` on top of either
  light or dark theme; routines carry no streaks or loss states.
- New practice studios (advanced harmony) reuse the shared `StudioSession`;
  counterpoint uses a dedicated interactive checker page.
- More menu panel gained a max-height + scroll now that it holds more links.

### Waves 4-7 verification — PASS
```
npm run typecheck   # clean
npm run lint        # clean
npm run test        # 305 tests pass (+60 from the 7 new modules)
npm run build       # dist built (pre-existing VexFlow chunk-size warning only)
npm run e2e         # 34 Playwright tests pass (added Wave 4-7 surfaces test)
```

## Notes / constraints honored
- All new lib modules are pure (no React, no storage) and ship with a colocated
  `*.test.ts`, matching existing repo conventions.
- No new runtime dependencies: MIDI bytes, base64-url compression, WAV encoding,
  and pitch detection are hand-rolled; audio uses Tone.js (already a dependency)
  and the Web Audio AnalyserNode only.
- Microphone and MIDI input stay opt-in and off by default; they activate only
  after an explicit button press, process locally, and record nothing.
- Dark mode and every new surface derive from the existing CSS token layer, so
  theming is systematic with no per-component overrides.
