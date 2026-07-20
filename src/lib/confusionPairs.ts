import type { PracticePrompt } from "./practiceEngine";
import type { PracticeAttempt } from "../types/course";

export type ConfusionPair = Readonly<{
  id: string;
  tokens: readonly [string, string];
  count: number;
  latestAttemptedAt: string;
  cases: readonly PracticeAttempt[];
}>;

function isAttempt(value: unknown): value is PracticeAttempt {
  const attempt = value as Partial<PracticeAttempt>;
  return (
    attempt &&
    typeof attempt === "object" &&
    typeof attempt.promptId === "string" &&
    typeof attempt.moduleId === "string" &&
    attempt.isCorrect === false &&
    Array.isArray(attempt.expected) &&
    attempt.expected.length === 1 &&
    typeof attempt.expected[0] === "string" &&
    Array.isArray(attempt.selected) &&
    attempt.selected.length === 1 &&
    typeof attempt.selected[0] === "string" &&
    attempt.expected[0] !== attempt.selected[0] &&
    typeof attempt.question === "string" &&
    Array.isArray(attempt.skillTargets) &&
    attempt.skillTargets.every((skill) => typeof skill === "string") &&
    typeof attempt.attemptedAt === "string" &&
    !Number.isNaN(Date.parse(attempt.attemptedAt))
  );
}

function pairTokens(expected: string, selected: string): [string, string] {
  return [expected, selected].sort((left, right) => left.localeCompare(right)) as [
    string,
    string
  ];
}

function pairId(tokens: readonly [string, string]): string {
  return `confusion-${encodeURIComponent(JSON.stringify(tokens))}`;
}

function clampPromptCount(promptCount: number): number {
  return Math.min(12, Math.max(1, Math.floor(promptCount) || 1));
}

export function buildConfusionPairs(
  attempts: readonly PracticeAttempt[],
  minimumCount = 2
): readonly ConfusionPair[] {
  const minimum = Math.max(1, Math.floor(minimumCount) || 1);
  const groups = new Map<string, { tokens: [string, string]; cases: PracticeAttempt[] }>();

  attempts.filter(isAttempt).forEach((attempt) => {
    const tokens = pairTokens(attempt.expected[0], attempt.selected[0]);
    const id = pairId(tokens);
    const group = groups.get(id) ?? { tokens, cases: [] };
    group.cases.push(attempt);
    groups.set(id, group);
  });

  return Array.from(groups, ([id, group]) => {
    const cases = [...group.cases].sort((left, right) =>
      right.attemptedAt.localeCompare(left.attemptedAt)
    );
    return {
      id,
      tokens: group.tokens,
      count: cases.length,
      latestAttemptedAt: cases[0].attemptedAt,
      cases
    };
  })
    .filter((pair) => pair.count >= minimum)
    .sort(
      (left, right) =>
        right.count - left.count ||
        right.latestAttemptedAt.localeCompare(left.latestAttemptedAt) ||
        left.id.localeCompare(right.id)
    );
}

export function topConfusionPair(
  attempts: readonly PracticeAttempt[],
  minimumCount = 2
): ConfusionPair | undefined {
  return buildConfusionPairs(attempts, minimumCount)[0];
}

export function generateConfusionPairDrill(
  pair: ConfusionPair,
  promptCount = 6
): PracticePrompt[] {
  const count = clampPromptCount(promptCount);

  if (pair.cases.length === 0) {
    return [];
  }

  return Array.from({ length: count }, (_, index) => {
    const source = pair.cases[index % pair.cases.length];
    const expected = source.expected[0];
    const selected = source.selected[0];
    return {
      id: `${pair.id}-${index + 1}`,
      moduleId: source.moduleId,
      kind: "single",
      question: source.question,
      choices: [expected, selected],
      answer: [expected],
      explanation: `Compare ${expected} and ${selected}, then try again.`,
      skillTargets: source.skillTargets,
      sourceLabels: [source.promptId]
    };
  });
}
