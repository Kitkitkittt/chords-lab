import { ArrowRight, Headphones, Play, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { KeyboardFigure } from "../components/LessonComponents";
import { DirectPracticeWorkbench } from "../components/PracticeWorkbenches";
import { PracticeResultPanel } from "../components/PracticeResultPanel";
import {
  allPracticePrompts,
  practiceModules,
  practicePromptsById
} from "../data/practice";
import { reviewModulesForCompletedLessons } from "../data/lessonLinks";
import { usePracticeSession } from "../hooks/usePracticeSession";
import {
  audioPlaybackLabel,
  chordPattern,
  playFeedbackTone,
  playPattern,
  rhythmPattern,
  sequencePattern,
  stopAudioPlayback
} from "../lib/audioEngine";
import type { AudioPlaybackState } from "../lib/audioEngine";
import { getDueSkillIds } from "../lib/adaptiveReview";
import { interleaveReviewQueue } from "../lib/learningPath";
import { type SkillTrackId } from "../lib/skills";
import { dueSkillsForTrack, isPromptInTrack } from "../lib/reviewScope";
import type { PracticePrompt } from "../lib/practiceEngine";
import { useProgress } from "../state/progress";
import type { ProgressState, StoredReviewPrompt } from "../types/course";

function isPracticePrompt(
  prompt: PracticePrompt | undefined
): prompt is PracticePrompt {
  return Boolean(prompt);
}

function promptFromProgress(
  progress: ProgressState,
  promptId: string
): PracticePrompt | undefined {
  const stored = progress.reviewPrompts[promptId];
  const canonical = practicePromptsById.get(promptId);
  return stored
    ? practicePromptFromStored(stored)
    : canonical
      ? { ...canonical, reviewPromptId: promptId }
      : undefined;
}

function practicePromptFromStored(prompt: StoredReviewPrompt): PracticePrompt {
  if (prompt.audioMode === "rhythm") {
    return {
      ...prompt,
      reviewPromptId: prompt.id,
      playbackPattern: rhythmPattern(
        prompt.question,
        prompt.rhythmTokens ?? prompt.answer
      )
    };
  }

  if (!prompt.audioNotes?.length) {
    return { ...prompt, reviewPromptId: prompt.id };
  }

  const playbackPattern = prompt.audioMode === "chord"
    ? chordPattern(prompt.question, prompt.audioNotes)
    : sequencePattern(prompt.question, prompt.audioNotes);

  return { ...prompt, reviewPromptId: prompt.id, playbackPattern };
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

function reviewPromptsFromProgress(progress: ProgressState, thisTrack = false) {
  const reviewQueue = Object.values(progress.practiceMastery).flatMap(
    (mastery) => mastery.reviewQueue
  );
  const queuedPrompts = reviewQueue
    .map((promptId) => promptFromProgress(progress, promptId))
    .filter(isPracticePrompt);
  const completedModuleIds = reviewModulesForCompletedLessons(
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
  const activeTrackId = progress.settings.activeTrackId as SkillTrackId | undefined;
  const trackPrompts = activeTrackId
    ? fallbackPrompts.filter((prompt) => isPromptInTrack(prompt, activeTrackId))
    : [];
  // Interleave the due-skill review queue round-robin across skills (better
  // retention than draining one skill at a time), then fill with any remaining
  // missed prompts, then module fallback prompts.
  const interleavedPromptIds = interleaveReviewQueue(progress.skillMastery);
  const interleavedPrompts = interleavedPromptIds
    .map((promptId) => promptFromProgress(progress, promptId))
    .filter(isPracticePrompt);
  const dueSkillPrompts = getDueSkillIds(progress.skillMastery).flatMap(
    (skill) =>
      fallbackPrompts.filter((prompt) => prompt.skillTargets?.includes(skill))
  );

  const prompts = uniquePrompts([
    ...interleavedPrompts,
    ...dueSkillPrompts,
    ...queuedPrompts,
    ...trackPrompts,
    ...fallbackPrompts
  ]);

  return thisTrack && activeTrackId
    ? prompts.filter((prompt) => isPromptInTrack(prompt, activeTrackId))
    : prompts;
}

export function ReviewPage() {
  const { progress, recordPracticeResult, recordSkillConfidence } = useProgress();
  const [scope, setScope] = useState<"mixed" | "track">("mixed");
  const [prompts, setPrompts] = useState(() => reviewPromptsFromProgress(progress));
  const [audioStatus, setAudioStatus] = useState<AudioPlaybackState>("idle");
  const [isAudioRevealed, setIsAudioRevealed] = useState(false);

  function changeScope(nextScope: "mixed" | "track") {
    setScope(nextScope);
    setPrompts(reviewPromptsFromProgress(progress, nextScope === "track"));
  }
  const reviewQueue = Object.values(progress.practiceMastery).flatMap(
    (mastery) => mastery.reviewQueue
  );
  const dueSkillIds = getDueSkillIds(progress.skillMastery);
  const activeTrackId = progress.settings.activeTrackId as SkillTrackId | undefined;
  const scopedDue = dueSkillsForTrack(progress, activeTrackId);
  const visibleDueSkillIds = scope === "track" ? scopedDue.included : dueSkillIds;
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

  useEffect(() => {
    stopAudioPlayback();
    setAudioStatus("idle");
    setIsAudioRevealed(false);
    return () => stopAudioPlayback();
  }, [session.prompt?.id]);

  async function playPromptAudio() {
    if (!session.prompt?.playbackPattern) {
      return;
    }

    if (audioStatus === "playing" || audioStatus === "loading") {
      stopAudioPlayback(setAudioStatus);
      return;
    }

    await playPattern(session.prompt.playbackPattern, {
      audioEnabled: progress.settings.audioEnabled,
      onStateChange: setAudioStatus
    });
  }

  return (
    <div className="page-stack">
      <section className="section-heading">
        <span className="eyebrow">Review</span>
        <h1>Mixed practice</h1>
        <p>Revisit missed prompts first, then mix practical checks without a timer.</p>
        <div className="practice-actions" role="group" aria-label="Review scope">
          <button className="button button--quiet" type="button" aria-pressed={scope === "mixed"} onClick={() => changeScope("mixed")}>Mixed</button>
          <button className="button button--quiet" type="button" aria-pressed={scope === "track"} disabled={!progress.settings.activeTrackId} onClick={() => changeScope("track")}>This track</button>
        </div>
        {scope === "track" && scopedDue.elsewhere.length > 0 ? <p>Also due elsewhere: {scopedDue.elsewhere.length} skill{scopedDue.elsewhere.length === 1 ? "" : "s"}.</p> : null}
      </section>

      <section className="practice-workbench" aria-labelledby="review-title">
        <div className="practice-workbench__header">
          <span className="eyebrow">{module?.title ?? "Practice"}</span>
          <h2 id="review-title">Review queue</h2>
          <p>
            {visibleDueSkillIds.length} due skill
            {visibleDueSkillIds.length === 1 ? "" : "s"} · {reviewQueue.length} missed
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

            {session.prompt.playbackPattern ? (
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
                      ? (session.prompt.audioNotes ?? []).join(" ")
                      : session.prompt.inputMode === "listening" &&
                          !session.isAnswered
                        ? "Listen and answer first; notes reveal after."
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
                  disabled={
                    session.prompt.inputMode === "listening" &&
                    !session.isAnswered &&
                    !isAudioRevealed
                  }
                  onClick={() => setIsAudioRevealed((current) => !current)}
                >
                  {isAudioRevealed ? "Hide notes" : "Reveal notes"}
                </button>
                <p role="status">{audioPlaybackLabel(audioStatus)}</p>
              </div>
            ) : null}

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
