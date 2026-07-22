import {
  createPracticeSessionConfig,
  generatePracticePrompts
} from "./practiceGenerators";
import { generateContrastPrompts } from "./contrastPrompts";
import type { PracticePrompt } from "./practiceEngine";
import type { SmartSessionPlan } from "./smartSession";

export function generateSmartSessionPrompts(
  plan: SmartSessionPlan,
  seed = "smart-session-v1"
): PracticePrompt[] {
  const contrastBySkill = new Map(
    generateContrastPrompts(seed, 3).map((prompt) => [prompt.skillTargets?.[0], prompt])
  );

  return plan.slots.map((slot, index) => {
    const generated = generatePracticePrompts(
      createPracticeSessionConfig(slot.moduleId as Parameters<typeof createPracticeSessionConfig>[0], {
        promptCount: 1,
        seed: `${seed}-${slot.skillId}-${index}`
      })
    )[0];
    const prompt = contrastBySkill.get(slot.skillId) ?? generated;

    return {
      ...prompt,
      id: `smart-${slot.skillId}-${prompt.id}`,
      skillTargets: [slot.skillId],
      topicTags: [...(prompt.topicTags ?? []), "smart-session", slot.reason]
    };
  });
}
