import {
  createPracticeSessionConfig,
  generatePracticePrompts,
  type GeneratedPracticeModuleId
} from "./practiceGenerators";
import type { PracticePrompt } from "./practiceEngine";

const moduleIds: GeneratedPracticeModuleId[] = [
  "pitch",
  "staff",
  "scales",
  "intervals",
  "chords",
  "harmony",
  "rhythm",
  "ear"
];

export function generatePlacementPrompts(seed = "placement-v1"): PracticePrompt[] {
  return moduleIds.map((moduleId) => {
    const prompt = generatePracticePrompts(
      createPracticeSessionConfig(moduleId, {
        promptCount: 1,
        seed: `${seed}-${moduleId}`
      })
    )[0];

    return { ...prompt, id: `placement-${prompt.id}` };
  });
}
