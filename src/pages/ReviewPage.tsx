import { ArrowRight, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { KeyboardFigure } from "../components/LessonComponents";
import { DirectPracticeWorkbench } from "../components/PracticeWorkbenches";
import { PracticeResultPanel } from "../components/PracticeResultPanel";
import {
  allPracticePrompts,
  practiceModules,
  practicePromptsById
} from "../data/practice";
import { usePracticeSession } from "../hooks/usePracticeSession";
import { playFeedbackTone } from "../lib/audioEngine";
import { getDueSkillIds } from "../lib/adaptiveReview";
import { interleaveReviewQueue } from "../lib/learningPath";
import { skillsForTrack, type SkillTrackId } from "../lib/skills";
import type { PracticePrompt } from "../lib/practiceEngine";
import { useProgress } from "../state/progress";
import type { ProgressState } from "../types/course";

function isPracticePrompt(
  prompt: PracticePrompt | undefined
): prompt is PracticePrompt {
  return Boolean(prompt);
}

function modulesForCompletedLessons(completedLessonSlugs: string[]): string[] {
  const completed = new Set(completedLessonSlugs);
  const moduleIds = new Set<string>();

  if (completed.has("sound-pitch")) {
    moduleIds.add("pitch");
  }

  if (completed.has("staff-keyboard")) {
    moduleIds.add("staff");
  }

  if (completed.has("scales-keys") || completed.has("scale-fluency")) {
    moduleIds.add("scales");
  }

  if (
    completed.has("intervals") ||
    completed.has("triads") ||
    completed.has("sevenths-inversions") ||
    completed.has("diatonic-harmony")
  ) {
    moduleIds.add("intervals");
    moduleIds.add("chords");
  }

  if (completed.has("rhythm-meter") || completed.has("rhythm-meter-lab")) {
    moduleIds.add("rhythm");
  }

  if (completed.has("ear-training-basics")) {
    moduleIds.add("ear");
  }

  if (
    completed.has("diatonic-harmony") ||
    completed.has("cadences-phrases") ||
    completed.has("common-progressions")
  ) {
    moduleIds.add("harmony");
  }

  return Array.from(moduleIds);
}

function uniquePrompts(prompts: PracticePrompt[]): PracticePrompt[] {
  const seen = new Set<string>();

  return prompts.filter((prompt) => {
    if (seen.has(prompt.id)) {
      return false;
    }

    seen.add(prompt.id);
    return true;
  });
}

function reviewPromptsFromProgress(progress: ProgressState) {
  const reviewQueue = Object.values(progress.practiceMastery).flatMap(
    (mastery) => mastery.reviewQueue
  );
  const queuedPrompts = reviewQueue
    .map((promptId) => practicePromptsById.get(promptId))
    .filter(isPracticePrompt);
  const completedModuleIds = modulesForCompletedLessons(
    progress.completedLessonSlugs
  );
  const fallbackPrompts = allPracticePrompts.filter((prompt) => {
    if (completedModuleIds.length > 0) {
      return completedModuleIds.includes(prompt.moduleId);
    }

    return [
      "staff",
      "scales",
      "intervals",
      "chords",
      "harmony",
      "rhythm",
      "ear"
    ].includes(prompt.moduleId);
  });
  // When a learning track is active, surface its module prompts first so review
  // gently follows the learner's chosen focus (still soft, no exclusion).
  const activeTrackId = progress.settings.activeTrackId;
  const trackModuleIds = activeTrackId
    ? new Set(skillsForTrack(activeTrackId as SkillTrackId).map((skill) => skill.moduleId))
    : undefined;
  const trackPrompts = trackModuleIds
    ? fallbackPrompts.filter((prompt) => trackModuleIds.has(prompt.moduleId))
    : [];
  // Interleave the due-skill review queue round-robin across skills (better
  // retention than draining one skill at a time), then fill with any remaining
  // missed prompts, then module fallback prompts.
  const interleavedPromptIds = interleaveReviewQueue(progress.skillMastery);
  const interleavedPrompts = interleavedPromptIds
    .map((promptId) => practicePromptsById.get(promptId))
    .filter(isPracticePrompt);
  const dueSkillPrompts = getDueSkillIds(progress.skillMastery).flatMap(
    (skill) =>
      fallbackPrompts.filter((prompt) => prompt.skillTargets?.includes(skill))
  );

  return uniquePrompts([
    ...interleavedPrompts,
    ...dueSkillPrompts,
    ...queuedPrompts,
    ...trackPrompts,
    ...fallbackPrompts
  ]);
}

export function ReviewPage() {
  const { progress, recordPracticeResult, recordSkillConfidence } = useProgress();
  const [sessionPromptIds] = useState(() =>
    reviewPromptsFromProgress(progress).map((prompt) => prompt.id)
  );
  const reviewQueue = Object.values(progress.practiceMastery).flatMap(
    (mastery) => mastery.reviewQueue
  );
  const dueSkillIds = getDueSkillIds(progress.skillMastery);
  const prompts = useMemo(
    () =>
      sessionPromptIds
        .map((promptId) => practicePromptsById.get(promptId))
        .filter(isPracticePrompt),
    [sessionPromptIds]
  );
  const session = usePracticeSession({
    prompts,
    onAttempt: recordPracticeResult
  });
  const module = practiceModules.find(
    (item) => item.id === session.prompt?.moduleId
  );
  const promptKind = session.prompt?.kind;
  const currentReviewState = session.prompt
    ? progress.reviewPromptState[session.prompt.id]
    : undefined;

  useEffect(() => {
    if (!session.feedback.feedbackTone) {
      return;
    }

    void playFeedbackTone(session.feedback.feedbackTone, {
      audioEnabled: progress.settings.audioEnabled
    });
  }, [progress.settings.audioEnabled, session.feedback.feedbackTone]);

  return (
    <div className="page-stack">
      <section className="section-heading">
        <span className="eyebrow">Review</span>
        <h1>Mixed practice</h1>
        <p>
          Revisit missed prompts first. When the queue is clear, this rotates
          through staff, scale, chord, rhythm, and ear-training checks.
        </p>
      </section>

      <section className="practice-workbench" aria-labelledby="review-title">
        <div className="practice-workbench__header">
          <span className="eyebrow">{module?.title ?? "Practice"}</span>
          <h2 id="review-title">Review queue</h2>
          <p>
            {dueSkillIds.length} due skill
            {dueSkillIds.length === 1 ? "" : "s"} · {reviewQueue.length} missed
            prompt{reviewQueue.length === 1 ? "" : "s"}
            {currentReviewState
              ? ` · current streak ${currentReviewState.consecutiveCorrect}/2`
              : ""}
          </p>
        </div>

        {session.prompt ? (
          <div className="practice-task">
            <div className="practice-prompt">
              <Sparkles size={20} aria-hidden="true" />
              <div>
                <span>Prompt</span>
                <p>{session.prompt.question}</p>
              </div>
            </div>

            <KeyboardFigure
              label="Review keyboard"
              active={
                session.selected.length > 0
                  ? session.selected
                  : (session.prompt.keyboardNotes ?? [])
              }
            />

            <DirectPracticeWorkbench
              prompt={session.prompt}
              selected={session.selected}
              selectedSet={session.selectedSet}
              choose={session.choose}
              replaceSelected={session.replaceSelected}
              removeSelectedAt={session.removeSelectedAt}
              undoSelected={session.undoSelected}
              clearSelected={session.clearSelected}
              disabled={session.isAnswered}
              audioEnabled={progress.settings.audioEnabled}
            />

            <div className="practice-choice-grid" aria-label="Answer choices">
              {session.prompt.choices.map((choice) => (
                <button
                  key={choice}
                  type="button"
                  aria-pressed={session.selectedSet.has(choice)}
                  onClick={() => session.choose(choice)}
                >
                  {choice}
                </button>
              ))}
            </div>

            {promptKind === "ordered" || promptKind === "grid" ? (
              <div className="practice-sequence" aria-label="Selected sequence">
                {session.selected.length > 0 ? (
                  session.selected.map((item, index) => (
                    <span key={`${item}-${index}`}>
                      {index + 1}. {item}
                    </span>
                  ))
                ) : (
                  <span>Choose the answer in order.</span>
                )}
              </div>
            ) : null}

            <div className="practice-actions">
              <button
                className="button"
                type="button"
                disabled={!session.canSubmit}
                onClick={session.submit}
              >
                Check answer
              </button>
              {module ? (
                <Link className="button button--quiet" to={`/practice/${module.id}`}>
                  Open module
                  <ArrowRight size={17} aria-hidden="true" />
                </Link>
              ) : null}
            </div>

            <PracticeResultPanel
              feedback={session.feedback}
              prompt={session.prompt}
              onRetry={session.retry}
              onNext={session.next}
              onRateConfidence={(confidence) =>
                recordSkillConfidence(
                  session.prompt?.skillTargets ?? [],
                  confidence
                )
              }
            />
          </div>
        ) : (
          <p>No review prompts are available yet.</p>
        )}
      </section>
    </div>
  );
}
