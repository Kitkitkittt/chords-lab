# Chords Lab Learning Tracks

Last updated: 2026-06-05

## Purpose

Learning tracks let a learner pursue several themed paths in parallel instead of
following one linear course. Each track is a view over the skill graph
(`docs/SKILL_GRAPH.md`), so track progress and the recommended next step are
derived, not hardcoded.

## Tracks

| Track | Skills | Focus |
| --- | --- | --- |
| Reading & Pitch (`reading-pitch`) | note-reading, staff-position, scale-spelling, interval-quality | Read notes, staff positions, scales, and intervals. |
| Harmony & Songwriting (`harmony-songwriting`) | scale-spelling, chord-spelling, roman-numerals, voice-leading, instrument-application | Build chords, progressions, voice leading, and arrangements. |
| Ear & Rhythm (`ear-rhythm`) | interval-quality, rhythm-reading, ear-training, instrument-application | Identify sounds and read rhythm with confidence. |

A skill can belong to more than one track (for example `scale-spelling` is part
of both Reading & Pitch and Harmony & Songwriting).

## Derivation

`trackProgressList(progress)` in `src/lib/learningPath.ts` computes, per track:

- `mastery` - 0..1 average of the track's skill levels
  (`new`=0, `learning`=0.33, `practiced`=0.66, `strong`=1).
- `nextSkill` - the first review-due skill, then the first not-yet-`strong`
  skill in track order.
- `hasReviewDue` - whether any skill in the track has review pending.

## Surface

The Home page renders a "Learning tracks" section with a progress bar and a
"Next" or "Review" link per track. The link routes to the practice setup for the
next skill's module. Nothing is locked; tracks are parallel suggestions.

## Active track

A learner can set one track as their focus from the Home track cards
("Set as focus" / "Clear focus"). The selection persists in
`ProgressState.settings.activeTrackId` (additive; normalized against known track
ids, dropped if unknown). When a track is active, `recommendSkills` promotes
that track's skills within the "Suggested focus" list without hiding due reviews
from other tracks.

## Future

- Track-scoped review sessions.
- Per-track milestones and gentle celebration moments.
