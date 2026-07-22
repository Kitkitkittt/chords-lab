import type { ProgressState } from "../types/course";
import { getDueSkillIds } from "./adaptiveReview";
import type { PracticePrompt } from "./practiceEngine";
import { skillIdForTargets, skillsForTrack } from "./skills";
import type { SkillId, SkillTrackId } from "./skills";

export function isPromptInTrack(
  prompt: Pick<PracticePrompt, "skillTargets">,
  trackId: SkillTrackId | undefined
): boolean {
  if (!trackId) {
    return true;
  }

  const skillId = skillIdForTargets(prompt.skillTargets);

  return Boolean(
    skillId && skillsForTrack(trackId).some((skill) => skill.id === skillId)
  );
}

export function dueSkillsForTrack(
  progress: ProgressState,
  trackId: SkillTrackId | undefined,
  now = new Date()
): { included: SkillId[]; elsewhere: SkillId[] } {
  const due = Array.from(
    new Set(
      getDueSkillIds(progress.skillMastery, now)
        .map((token) => skillIdForTargets([token]))
        .filter((skillId): skillId is SkillId => Boolean(skillId))
    )
  );
  const trackSkills = new Set(trackId ? skillsForTrack(trackId).map((skill) => skill.id) : []);

  return trackId
    ? {
        included: due.filter((skillId) => trackSkills.has(skillId)),
        elsewhere: due.filter((skillId) => !trackSkills.has(skillId))
      }
    : { included: due, elsewhere: [] };
}
