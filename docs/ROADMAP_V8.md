# Chords Lab V8 Roadmap — Local-First Expansion

Last updated: 2026-06-10

## Direction

V8 grows Chords Lab from a reference-course PWA into a full interactive music
**workspace** while preserving the core identity: local-first, no accounts, no
backend, no analytics, calm/ADHD-first, audio user-triggered, no streak
pressure. Every feature below works offline and stores nothing off-device.

Scope decision for this roadmap (confirmed with the product owner): keep
local-first, but all directions are open within it — MIDI input/output, opt-in
local microphone, new labs, and deeper curriculum are all in scope. Backend,
accounts, and cloud sync remain out of scope.

## Phases

### Phase 1 — Input & Output Revolution
- **1.1 MIDI export** — Standard MIDI File from a Song Lab sketch. *(Wave 1)*
- **1.2 Web MIDI input adapter** — play prompts/instruments with a real
  keyboard; record into Song Lab. Feature-detected, off by default.
- **1.3 Opt-in microphone tuner** — local-only pitch detection + cents needle at
  `/tools/tuner`; explicit consent, off by default. *(Wave 1: DSP core)*
- **1.4 WAV export** via `Tone.Offline`.

### Phase 2 — Practice Depth
- **2.1 Smart Session composer** — one-tap session from due/weak/new skills using
  the skill graph + adaptive review data. *(Wave 1: pure planner)*
- **2.2 Error-pattern insights** — confusion pairs and per-key weakness from
  practice attempts, rendered as calm cards on `/progress`. *(Wave 1: pure)*
- **2.3 Melodic & rhythmic dictation** — hear then rebuild on existing surfaces.
- **2.4 Sight-reading trainer** — VexFlow melody, play at your own pace.

### Phase 3 — Song Lab 4.0
- **3.1 Share-by-URL** — compress sketch into a URL fragment, import on open. No
  backend. *(Wave 1: pure codec)*
- **3.2 Multi-section arranger**, per-track instruments, velocity lane, humanize.
- **3.3 Theory-guided composition assists** — suggest-next-chord, melody critique,
  reharmonize. *(Wave 1: pure suggest-next-chord)*
- **3.4 MIDI / WAV / printable lead-sheet export.**

### Phase 4 — Repertoire & Real Music
- Public-domain song library, progression spotter, analysis challenges, etudes.

### Phase 5 — Calm Motivation & Learning Science
- **5.1 Practice journal** (local), weekly gentle digest.
- **5.2 Skill constellation v2.**
- **5.3 Routines & tiny-wins ledger** (no streak loss states).
- **5.4 FSRS-style scheduler** + daily review-load smoothing. *(Wave 1: pure lib)*
- **5.5 Focus mode** — one-prompt-per-screen, dimmed chrome.

### Phase 6 — Curriculum Expansion (toward intermediate)
- Modulation, secondary dominants/borrowed chords, counterpoint basics, figured
  bass primer, melody writing, jazz/extended harmony, transposition, blues.
- Optional placement quick-check; per-track milestone certificates.

### Phase 7 — Platform & Polish
- **7.1 Dark mode ("Night practice")** from existing tokens. *(Wave 1)*
- IndexedDB migration behind the repository interface; versioned migrations.
- i18n + alternate note-naming systems (fixed-do, German H/B).
- Color-blind-safe palette; left-handed fretboard; File Handling + Share Target.

## Interaction Rules (unchanged, enforced for every new feature)
- Every action has visible text labels and keyboard access.
- Audio stays user-triggered and can be disabled.
- No timed quizzes in the beginner flow.
- Diagrams render from data, not screenshots.
- Scoring stays local; export/import stays manual and account-free.
- New permissions (MIDI, microphone) are opt-in and off by default.

## Wave 1 (this iteration)

Shipping a foundation slice of pure, well-tested modules plus their UI wiring:

1. **MIDI export** (`src/lib/midiFile.ts`) — Phase 1.1
2. **Share-by-URL codec** (`src/lib/sketchShare.ts`) — Phase 3.1
3. **Suggest-next-chord** (`src/lib/chordSuggest.ts`) — Phase 3.3
4. **Smart Session planner** (`src/lib/smartSession.ts`) — Phase 2.1
5. **Practice insights** (`src/lib/insights.ts`) — Phase 2.2
6. **FSRS-style scheduler** (`src/lib/fsrs.ts`) — Phase 5.4
7. **Pitch detection core** (`src/lib/pitchDetect.ts`) — Phase 1.3
8. **Dark mode** theming + toggle — Phase 7.1

See `PROGRESS_V8.md` for live status.
