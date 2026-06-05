# Chords Lab Skill Graph

Last updated: 2026-06-05

## Purpose

The skill graph closes the previously open learning loop. Before it, three
layers were disconnected free text:

- Lessons declared `outcomes` as prose strings.
- Practice prompts declared `skillTargets` as separate prose strings.
- Adaptive review keyed off raw prompt ids.

The skill graph introduces a typed taxonomy (`SkillId`) and connects:

```
lessons (what is taught)
  -> skills (the unit of mastery)
    -> prompts (what is practiced)
      -> adaptive review (what is scheduled)
        -> recommendations + learning tracks
```

## Files

- `src/lib/skills.ts` - the taxonomy: `SkillId`, `SkillMeta`, prerequisites,
  tracks, and the mapping functions `skillIdForTargets`, `skillIdForModule`,
  `skillsForLesson`, and `skillsForTrack`.
- `src/lib/learningPath.ts` - pure functions over local progress:
  `rollUpSkillMastery`, `recommendSkills`, `interleaveReviewQueue`,
  `overallMastery`, `trackProgressList`, and the `learningTracks` list.

## Skills

| SkillId | Module | Prerequisites |
| --- | --- | --- |
| note-reading | pitch | - |
| staff-position | staff | note-reading |
| scale-spelling | scales | note-reading |
| interval-quality | intervals | note-reading |
| chord-spelling | chords | interval-quality, scale-spelling |
| roman-numerals | harmony | chord-spelling |
| voice-leading | harmony | roman-numerals |
| rhythm-reading | rhythm | - |
| ear-training | ear | interval-quality |
| instrument-application | instruments | chord-spelling, scale-spelling |

Prerequisites are soft. Nothing is hard locked; they only shape the order of
recommendations, consistent with the app's calm, no-pressure design.

## Prompt token mapping

Practice prompts already emit free-text `skillTargets` (for example
`["chord-symbol", "triads"]`). `skillIdForTargets` maps the first recognized
token to a canonical `SkillId`. Secondary tokens (clef names, instrument ids)
are ignored for skill rollups.

## Mastery levels

`rollUpSkillMastery` aggregates raw `skillMastery` entries into one record per
`SkillId` and assigns a coarse level:

- `new` - no attempts.
- `learning` - accuracy below 60%.
- `practiced` - accuracy at or above 60%.
- `strong` - at least 4 attempts and accuracy at or above 85%.

## Recommendations

`recommendSkills` returns soft suggestions in priority order:

1. Skills with review due or a non-empty review queue.
2. Weak (`learning`) skills to shore up.
3. New skills whose prerequisites are at least `practiced`.
4. Anything not yet `strong`, to keep skills warm.

These appear on the Home page as "Suggested focus" cards linking to the
relevant practice setup.

## Confidence rating

After a correct answer, the practice result panel offers an optional
"Easy / Hard" rating. `applyConfidenceToSkillState` nudges the skill's ease and
review interval (Anki-style) without counting a new attempt. This is gentle and
fully optional.

## Interleaved review

`interleaveReviewQueue` draws prompts round-robin across all due skills instead
of draining one skill at a time, which improves retention through interleaving.
The Review page (`src/pages/ReviewPage.tsx`) uses it to order the session before
falling back to module prompts.

## Learning tracks

See `docs/LEARNING_TRACKS.md`.
