import { CheckCircle2, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { KeyboardFigure, NotationFigure } from "./LessonComponents";
import { DirectPracticeWorkbench } from "./PracticeWorkbenches";
import { PracticeResultPanel } from "./PracticeResultPanel";
import { usePracticeSession } from "../hooks/usePracticeSession";
import { playFeedbackTone } from "../lib/audioEngine";
import {
  createPracticeSessionConfig,
  generatePracticePrompts
} from "../lib/practiceGenerators";
import type { GeneratedPracticeModuleId } from "../lib/practiceGenerators";
import type { LessonCheckpointResult } from "../types/course";

type LessonCheckpointProps = {
  lessonSlug: string;
  lessonTitle: string;
  moduleId: GeneratedPracticeModuleId;
  audioEnabled: boolean;
  onAttempt: (
    promptId: string,
    moduleId: string,
    isCorrect: boolean,
    skillTargets?: string[]
  ) => void;
  onPass: (result: LessonCheckpointResult) => void;
};

export function LessonCheckpoint({
  lessonSlug,
  lessonTitle,
  moduleId,
  audioEnabled,
  onAttempt,
  onPass
}: LessonCheckpointProps) {
  const [checkpointResult, setCheckpointResult] =
    useState<LessonCheckpointResult>();
  const hasReportedResult = useRef(false);
  const prompts = useMemo(
    () =>
      generatePracticePrompts(
        createPracticeSessionConfig(moduleId, {
          promptCount: 3,
          seed: `${moduleId}-C-mixed`
        })
      ),
    [moduleId]
  );
  const session = usePracticeSession({
    prompts,
    onAttempt
  });
  const promptKind = session.prompt?.kind;

  useEffect(() => {
    hasReportedResult.current = false;
    setCheckpointResult(undefined);
  }, [lessonSlug]);

  useEffect(() => {
    if (!session.feedback.feedbackTone) {
      return;
    }

    void playFeedbackTone(session.feedback.feedbackTone, { audioEnabled });
  }, [audioEnabled, session.feedback.feedbackTone]);

  useEffect(() => {
    if (!session.isSessionComplete || hasReportedResult.current) {
      return;
    }

    hasReportedResult.current = true;
    const result: LessonCheckpointResult = {
      lessonSlug,
      correct: session.sessionResult.correct,
      attempted: session.sessionResult.attempted,
      passed: session.sessionResult.correct >= 2,
      missedPromptIds: session.sessionResult.missedPromptIds
    };

    setCheckpointResult(result);

    if (result.passed) {
      onPass(result);
    }
  }, [
    lessonSlug,
    onPass,
    session.isSessionComplete,
    session.sessionResult.attempted,
    session.sessionResult.correct,
    session.sessionResult.missedPromptIds
  ]);

  if (!session.prompt) {
    return null;
  }

  return (
    <section
      className="lesson-checkpoint"
      aria-labelledby="lesson-checkpoint-title"
      aria-label={`Checkpoint for ${lessonTitle}`}
    >
      <div className="lesson-checkpoint__header">
        <span className="eyebrow">Checkpoint</span>
        <h2 id="lesson-checkpoint-title">Lesson checkpoint</h2>
        <p>
          Answer three short prompts. Two correct answers marks the lesson
          complete; misses stay in review until two correct answers in a row.
        </p>
      </div>

      {checkpointResult ? (
        <aside
          className={
            checkpointResult.passed
              ? "checkpoint-summary is-passed"
              : "checkpoint-summary is-review"
          }
          role="status"
        >
          <CheckCircle2 size={18} aria-hidden="true" />
          <strong>
            {checkpointResult.correct}/{checkpointResult.attempted} correct
          </strong>
          <span>
            {checkpointResult.passed
              ? "Lesson complete."
              : "Review the lesson or retry the missed prompts."}
          </span>
        </aside>
      ) : null}

      <div className="practice-task">
        <div className="practice-prompt">
          <Sparkles size={20} aria-hidden="true" />
          <div>
            <span>Prompt</span>
            <p>{session.prompt.question}</p>
          </div>
        </div>

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
          audioEnabled={audioEnabled}
        />

        {session.prompt.notation ? (
          <NotationFigure
            title="Checkpoint notation"
            notation={session.prompt.notation}
            clef={session.prompt.clef}
            timeSignature={session.prompt.timeSignature ?? "1/4"}
          />
        ) : null}

        <KeyboardFigure
          label="Checkpoint keyboard"
          active={
            session.selected.length > 0
              ? session.selected
              : (session.prompt.keyboardNotes ?? [])
          }
        />

        <div className="practice-choice-grid" aria-label="Checkpoint choices">
          {session.prompt.choices.map((choice) => (
            <button
              key={choice}
              type="button"
              aria-pressed={session.selectedSet.has(choice)}
              disabled={session.isAnswered}
              onClick={() => session.choose(choice)}
            >
              {choice}
            </button>
          ))}
        </div>

        {promptKind === "ordered" || promptKind === "grid" ? (
          <div className="practice-sequence" aria-label="Checkpoint sequence">
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
            Check checkpoint
          </button>
        </div>

        <PracticeResultPanel
          feedback={session.feedback}
          prompt={session.prompt}
          onRetry={session.retry}
          onNext={session.next}
        />
      </div>
    </section>
  );
}
