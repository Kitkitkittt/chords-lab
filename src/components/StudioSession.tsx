import { Headphones, Play, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { KeyboardFigure, NotationFigure } from "./LessonComponents";
import { DirectPracticeWorkbench } from "./PracticeWorkbenches";
import { PracticeResultPanel } from "./PracticeResultPanel";
import { usePracticeSession } from "../hooks/usePracticeSession";
import {
  audioPlaybackLabel,
  playFeedbackTone,
  playPattern,
  playSequence,
  stopAudioPlayback
} from "../lib/audioEngine";
import type { AudioPlaybackState } from "../lib/audioEngine";
import type { PracticePrompt } from "../lib/practiceEngine";
import { useProgress } from "../state/progress";

type StudioSessionProps = {
  prompts: PracticePrompt[];
  label: string;
  moduleId: string;
  progressScope?: "practice" | "placement";
  onComplete?: (result: { correct: number; attempted: number; missedPromptIds: string[] }) => void;
};

/**
 * Reusable focused practice surface.
 *
 * It wraps the shared `usePracticeSession` hook and renders the same prompt,
 * workbench, notation, audio, choice, and result UI used by the main Practice
 * page, but driven by a caller-supplied prompt list. This lets new studios
 * (dictation, sight-reading) reuse the full interaction model without changing
 * the generated-module machinery. Audio stays user-triggered.
 */
export function StudioSession({
  prompts,
  label,
  moduleId,
  progressScope = "practice",
  onComplete
}: StudioSessionProps) {
  const {
    progress,
    queuePracticeReview,
    recordPlacementResult,
    recordPracticeResult,
    recordSkillConfidence
  } = useProgress();
  const completed = useRef(false);
  const [audioStatus, setAudioStatus] = useState<AudioPlaybackState>("idle");
  const [isAudioRevealed, setIsAudioRevealed] = useState(false);
  const session = usePracticeSession({
    prompts,
    onAttempt: progressScope === "placement"
      ? (promptId, _moduleId, isCorrect) => recordPlacementResult(promptId, isCorrect)
      : recordPracticeResult,
    onSkip: progressScope === "placement" ? undefined : queuePracticeReview
  });

  useEffect(() => {
    if (!session.isSessionComplete || completed.current || !onComplete) {
      return;
    }

    completed.current = true;
    onComplete(session.sessionResult);
  }, [onComplete, session.isSessionComplete, session.sessionResult]);

  const promptKind = session.prompt?.kind;
  const shouldUseSelectionAsNotes =
    promptKind === "multi" ||
    promptKind === "note-builder" ||
    promptKind === "chord-builder" ||
    (promptKind === "ordered" && moduleId !== "rhythm");
  const selectedNotes =
    shouldUseSelectionAsNotes && session.selected.length > 0
      ? session.selected
      : (session.prompt?.keyboardNotes ?? []);
  const hasPromptAudio = Boolean(
    session.prompt?.playbackPattern || session.prompt?.audioNotes?.length
  );

  useEffect(() => {
    stopAudioPlayback();
    setIsAudioRevealed(false);
    setAudioStatus("idle");
    return () => stopAudioPlayback();
  }, [session.prompt?.id]);

  useEffect(() => {
    if (!session.feedback.feedbackTone) {
      return;
    }

    void playFeedbackTone(session.feedback.feedbackTone, {
      audioEnabled: progress.settings.audioEnabled
    });
  }, [progress.settings.audioEnabled, session.feedback.feedbackTone]);

  async function playPromptAudio() {
    if (!session.prompt?.playbackPattern && !session.prompt?.audioNotes?.length) {
      return;
    }

    if (audioStatus === "playing" || audioStatus === "loading") {
      stopAudioPlayback(setAudioStatus);
      return;
    }

    if (session.prompt.playbackPattern) {
      await playPattern(session.prompt.playbackPattern, {
        audioEnabled: progress.settings.audioEnabled,
        onStateChange: setAudioStatus
      });
      return;
    }

    await playSequence(session.prompt.question, session.prompt.audioNotes ?? [], {
      audioEnabled: progress.settings.audioEnabled,
      onStateChange: setAudioStatus
    });
  }

  if (!session.prompt) {
    return (
      <div className="practice-placeholder">
        <div>
          <h2>Nothing to practice yet</h2>
          <p>Come back after generating a session.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="practice-task">
      {session.isSessionComplete ? (
        <aside className="practice-session-summary" role="status">
          <strong>
            {session.sessionResult.attempted > 0 &&
            session.sessionResult.correct / session.sessionResult.attempted >= 0.8
              ? "Nice session!"
              : "Session complete"}
          </strong>
          <span className="practice-session-summary__score">
            {session.sessionResult.correct}/{session.sessionResult.attempted}{" "}
            correct
            {session.liveStats.bestStreak > 1
              ? ` · best streak ${session.liveStats.bestStreak}`
              : ""}
          </span>
          {progressScope === "practice" ? (
            <div className="practice-session-summary__actions">
              {session.sessionResult.missedPromptIds.length > 0 ? (
                <Link className="button button--quiet" to="/review">
                  Review your misses
                </Link>
              ) : null}
            </div>
          ) : null}
        </aside>
      ) : (
        <div className="practice-session-progress" aria-live="polite">
          <div className="practice-session-progress__bar">
            <span
              style={{
                inlineSize: `${(session.liveStats.answered / Math.max(1, session.liveStats.total)) * 100}%`
              }}
            />
          </div>
          <span className="practice-session-progress__label">
            Prompt {session.liveStats.promptNumber} of {session.liveStats.total} ·{" "}
            {session.liveStats.correct} correct
            {session.liveStats.streak > 1
              ? ` · streak ${session.liveStats.streak}`
              : ""}
          </span>
        </div>
      )}

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
        audioEnabled={progress.settings.audioEnabled}
      />

      <div className="practice-visuals">
        {session.prompt.notation ? (
          <NotationFigure
            title={`${label} notation`}
            notation={session.prompt.notation}
            clef={session.prompt.clef}
            timeSignature={session.prompt.timeSignature ?? "1/4"}
          />
        ) : null}
        {hasPromptAudio ? (
          <div className="practice-audio-card">
            <Headphones size={18} aria-hidden="true" />
            <div>
              <strong>
                {session.prompt.inputMode === "listening"
                  ? "Listening prompt"
                  : "Sound check"}
              </strong>
              <span>
                {isAudioRevealed
                  ? (session.prompt.audioNotes ?? session.prompt.keyboardNotes ?? []).join(" ")
                  : "Notes hidden until reveal."}
              </span>
            </div>
            <button
              className="button button--secondary"
              type="button"
              onClick={playPromptAudio}
            >
              <Play size={17} aria-hidden="true" />
              {audioStatus === "playing" || audioStatus === "loading"
                ? "Stop prompt"
                : "Play prompt"}
            </button>
            <button
              className="button button--quiet"
              type="button"
              onClick={() => setIsAudioRevealed((current) => !current)}
            >
              {isAudioRevealed ? "Hide notes" : "Reveal notes"}
            </button>
            <p role="status">{audioPlaybackLabel(audioStatus)}</p>
          </div>
        ) : null}
        <KeyboardFigure label={`${label} keyboard`} active={selectedNotes} />
      </div>

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
        {progressScope === "practice" ? (
          <>
            <button
              className="button button--quiet"
              type="button"
              disabled={session.isAnswered}
              onClick={session.skip}
            >
              Skip
            </button>
            <button
              className="button button--quiet"
              type="button"
              onClick={session.end}
            >
              End for today
            </button>
          </>
        ) : null}
      </div>

      <PracticeResultPanel
        feedback={session.feedback}
        prompt={session.prompt}
         onRetry={session.retry}
         onNext={session.next}
         onRateConfidence={progressScope === "placement"
           ? undefined
           : (confidence) =>
               recordSkillConfidence(session.prompt.skillTargets ?? [], confidence)}
       />
    </div>
  );
}
