# Chords Lab Theory Engine

Last updated: 2026-06-05

## Purpose

`src/lib/theory.ts` is the canonical, pure (no React, no Tone.js) music-theory
layer for Chords Lab. It derives music-theory facts from
[`tonal`](https://github.com/tonaljs/tonal) so that results are correct for
every key, instead of being hardcoded for a handful of keys.

Pedagogical conventions are borrowed from
[`teoria`](https://github.com/saebekassebil/teoria):

- Conventional interval names (`M3`, `P5`) instead of tonal's machine form
  (`3M`, `5P`).
- Movable-do solfege derived from scale degree in a key context.
- Scale-degree detection that doubles as an "is note in scale" check.
- Frequency to note conversion with cents deviation.

Chords Lab does not depend on `teoria` as a package: it overlaps heavily with
`tonal` (already a dependency) and is largely unmaintained. Instead the engine
adopts teoria's conventions on top of tonal's actively maintained modules.

## Why this layer exists

Before this engine, the same music-theory facts were duplicated and hardcoded
across several files:

- `theoryContext.ts` mapped Roman numerals to chords for only C, G, and F.
- `practiceGenerators.ts` hardcoded each progression's chords and numerals.
- Scale prompts hardcoded key signatures (for example "G major has one sharp").
- Chord inversions were written out as literal note arrays.
- Interval names were shown in tonal's machine form (`3M`).
- Enharmonics used a hand-built 26-entry lookup table.
- The solfege ladder was a static 8-row, C-major-only array.

The engine centralizes these into derivations that generalize to all 24 keys
and both major and minor modes.

## tonal modules used

| tonal module | Engine use |
| --- | --- |
| `Note` | Pitch class, chroma, enharmonic, simplify, midi, frequency. |
| `Interval` | Distance and quality for conventional interval naming. |
| `Scale` | Scale notes and scale-degree detection. |
| `Mode` | Greek modes for modal practice. |
| `Key` | Major/minor key signatures, diatonic triads, sevenths, grades. |
| `RomanNumeral` | Parse numeral step, accidental, and chord-type suffix. |
| `Progression` | Numeral to chord and chord to numeral round-trips. |
| `Chord` | Chord notes, quality/type, and degree-based inversions. |
| `Voicing` + `VoicingDictionary` | Voicing options per chord. |
| `VoiceLeading` | Smooth voice-leading strategy across a progression. |
| `Midi` | Frequency to nearest note plus cents deviation. |

## Public surface

### Intervals

- `formatInterval(tonalInterval, { verbose })` - `3M` to `M3`, or "major third".
- `intervalBetween(from, to, { verbose })` - conventional name between notes.
- `intervalSemitones(name)` - semitone span, accepting either name form.

### Notes and frequency

- `pitchClass(note)`, `noteFrequency(note)`.
- `keyboardPitchClass(note)`, `keyboardNoteForPlayback(note)`,
  `keyboardPitchClasses()` - sharp-preferred keyboard mapping derived from
  chroma.
- `enharmonicOf(note)`, `simplifyNote(note)`.
- `nearestNoteFromFrequency(hz)` - `{ note, cents }` or `null`.

### Scales and modes

- `scaleNotes(tonic, type)`, `majorScaleNotes`, `naturalMinorScaleNotes`.
- `scaleNotesForTopic(tonic, topic)` - learner topic label to concrete scale.
- `scaleDegreeOf(note, tonic, type)` - degree or 0 when out of scale.
- `modeNames()`, `modeNotes(tonic, mode)`.

### Keys, chords, and Roman numerals

- `keyContext(tonic, mode, minorForm)` - `KeyContext` with scale, key
  signature, alteration, grades, triads, sevenths, and numeral-to-chord maps.
- `romanToChord(numeral, tonic, mode, minorForm)`.
- `progressionChords(numerals, tonic, mode, minorForm)`.
- `chordsToRomanNumerals(chords, tonic)`.
- `chordNotes(symbol)`, `chordSummary(symbol)`, `chordInversion(symbol, n)`.

### Solfege

- `solfegeForKey(tonic, mode)` - movable-do steps for a key.
- `solfegeOf(note, tonic, mode)` - syllable or `null` when out of key.

### Voicings and voice leading

- `voiceLeadProgression(chords, range)` - smooth voiced sequence.
- `voicingMotion(from, to)` - total absolute semitone motion between voicings.

## Consumers

- `src/lib/music.ts` - delegates its beginner-facing helpers to the engine.
- `src/lib/theoryContext.ts` - Song Lab theory-sync; now supports minor keys and
  figured-bass inversion tokens (for example `I6`).
- `src/lib/practiceGenerators.ts` - scale, interval, chord, harmony, and the new
  voice-leading practice families.
- `src/lib/instruments.ts` - chord-tone, scale-degree, bass-target, and
  key-aware solfege ladder helpers.
- `src/lib/interactionTools.ts` - `describeChordStack` adds quality and
  cardinality labels.

## Testing

`src/lib/theory.test.ts` covers interval formatting, enharmonics, frequency
matching, key contexts for major and minor keys, Roman numeral resolution and
round-trips, chord inversions and quality, solfege, scale-degree detection, and
voice leading. Consumer tests in `music.test.ts`, `theoryContext.test.ts`,
`instruments.test.ts`, and `interactionTools.test.ts` exercise the engine
through the rest of the app.
