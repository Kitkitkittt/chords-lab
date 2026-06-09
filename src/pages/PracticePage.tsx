import {
  Drum,
  Ear,
  GitCompareArrows,
  Guitar,
  Headphones,
  Layers3,
  Music2,
  Piano,
  Play,
  Scale,
  Sparkles,
  Waypoints
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { KeyboardFigure, NotationFigure } from "../components/LessonComponents";
import { DirectPracticeWorkbench } from "../components/PracticeWorkbenches";
import { PracticeResultPanel } from "../components/PracticeResultPanel";
import { practiceModules, getPracticePrompts } from "../data/practice";
import type { PracticeModuleId } from "../data/practice";
import { usePracticeSession } from "../hooks/usePracticeSession";
import {
  audioPlaybackLabel,
  playFeedbackTone,
  playPattern,
  playSequence,
  stopAudioPlayback
} from "../lib/audioEngine";
import type { AudioPlaybackState } from "../lib/audioEngine";
import {
  createPracticeSessionConfig,
  generatePracticePrompts
} from "../lib/practiceGenerators";
import { formatPracticeScore } from "../lib/practiceEngine";
import { useProgress } from "../state/progress";

const moduleIcons = {
  pitch: Music2,
  staff: Piano,
  scales: Scale,
  intervals: GitCompareArrows,
  chords: Layers3,
  harmony: Waypoints,
  rhythm: Drum,
  ear: Ear,
  instruments: Guitar
};

function isPracticeModuleId(value: string | undefined): value is PracticeModuleId {
  return practiceModules.some((module) => module.id === value);
}

function moduleScore(
  moduleId: PracticeModuleId,
  results: Record<string, { correct: number; attempted: number }>
) {
  return getPracticePrompts(moduleId).reduce(
    (total, prompt) => {
      const result = results[prompt.id];

      return {
        correct: total.correct + (result?.correct ?? 0),
        attempted: total.attempted + (result?.attempted ?? 0)
      };
    },
    { correct: 0, attempted: 0 }
  );
}

export function PracticePage() {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const recordedSessionId = useRef("");
  const [audioStatus, setAudioStatus] = useState<
    AudioPlaybackState
  >("idle");
  const [isAudioRevealed, setIsAudioRevealed] = useState(false);
  const { progress, recordPracticeResult, recordPracticeSession, recordSkillConfidence } = useProgress();
  const activeModuleId = isPracticeModuleId(params.moduleId)
    ? params.moduleId
    : "pitch";
  const activeModule =
    practiceModules.find((module) => module.id === activeModuleId) ??
    practiceModules[0];
  const sessionConfig = useMemo(
    () =>
      createPracticeSessionConfig(activeModuleId, {
        difficulty:
          searchParams.get("difficulty") === "early-intermediate"
            ? "early-intermediate"
            : "beginner",
        promptCount: Number(searchParams.get("count") ?? 10),
        clef:
          searchParams.get("clef") === "bass"
            ? "bass"
            : searchParams.get("clef") === "mixed"
              ? "mixed"
              : "treble",
        key: searchParams.get("key") ?? "C",
        topic: searchParams.get("topic") ?? "mixed",
        audioEnabled: searchParams.get("audio") !== "off",
        seed: searchParams.get("seed") ?? undefined
      }),
    [activeModuleId, searchParams]
  );
  const prompts = useMemo(
    () => generatePracticePrompts(sessionConfig),
    [sessionConfig]
  );
  const session = usePracticeSession({
    prompts,
    onAttempt: recordPracticeResult
  });
  const promptKind = session.prompt?.kind;
  const shouldUseSelectionAsNotes =
    promptKind === "multi" ||
    promptKind === "note-builder" ||
    promptKind === "chord-builder" ||
    (promptKind === "ordered" && activeModuleId !== "rhythm");
  const selectedNotes =
    shouldUseSelectionAsNotes && session.selected.length > 0
      ? session.selected
      : (session.prompt?.keyboardNotes ?? []);
  const hasPromptAudio = Boolean(
    session.prompt?.playbackPattern || session.prompt?.audioNotes?.length
  );
  const activeScore = moduleScore(activeModuleId, progress.practiceResults);
  const activeModuleIndex = practiceModules.findIndex(
    (module) => module.id === activeModuleId
  );
  const nextModule =
    practiceModules[(activeModuleIndex + 1) % practiceModules.length];
  const sessionId = `${activeModuleId}:${sessionConfig.seed}:${sessionConfig.promptCount}:${sessionConfig.topic}`;

  useEffect(() => {
    recordedSessionId.current = "";
  }, [sessionId]);

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

  useEffect(() => {
    if (!session.isSessionComplete || recordedSessionId.current === sessionId) {
      return;
    }

    recordedSessionId.current = sessionId;
    recordPracticeSession({
      id: `${sessionId}:${Date.now()}`,
      moduleId: activeModuleId,
      configSummary: `${sessionConfig.difficulty}, ${sessionConfig.promptCount} prompts, ${sessionConfig.key}, ${sessionConfig.topic}`,
      correct: session.sessionResult.correct,
      attempted: session.sessionResult.attempted,
      missedPromptIds: session.sessionResult.missedPromptIds,
      completedAt: new Date().toISOString()
    });

    // A calm success tone at the end of a strong session (no pressure, no timer).
    if (
      session.sessionResult.attempted > 0 &&
      session.sessionResult.correct / session.sessionResult.attempted >= 0.8
    ) {
      void playFeedbackTone("success", {
        audioEnabled: progress.settings.audioEnabled
      });
    }
  }, [
    activeModuleId,
    recordPracticeSession,
    progress.settings.audioEnabled,
    session.isSessionComplete,
    session.sessionResult.attempted,
    session.sessionResult.correct,
    session.sessionResult.missedPromptIds,
    sessionConfig.difficulty,
    sessionConfig.key,
    sessionConfig.promptCount,
    sessionConfig.topic,
    sessionId
  ]);

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

  return (
    <div className="page-stack">
      <section className="section-heading">
        <span className="eyebrow">Practice</span>
        <h1>Interactive modules</h1>
        <p>
          Short untimed drills for naming, building, checking, and moving to
          the next prompt when ready.
        </p>
      </section>

      <section className="practice-layout" aria-label="Practice workspace">
        <div className="practice-module-list" aria-label="Practice modules">
          {practiceModules.map((module) => {
            const Icon = moduleIcons[module.id];
            const score = moduleScore(module.id, progress.practiceResults);
            const isActive = activeModuleId === module.id;

            return (
              <button
                key={module.id}
                type="button"
                className={
                  isActive
                    ? "practice-module-card is-active"
                    : "practice-module-card"
                }
                aria-pressed={isActive}
                onClick={() => navigate(`/practice/${module.id}`)}
              >
                <Icon size={19} aria-hidden="true" />
                <span>
                  <strong>{module.title}</strong>
                  <small>{module.summary}</small>
                  <em>{module.status}</em>
                </span>
                <b>{formatPracticeScore(score)}</b>
              </button>
            );
          })}
        </div>

        <article className="practice-workbench" aria-labelledby="practice-title">
          <div className="practice-workbench__header">
            <span className="eyebrow">{activeModule.title}</span>
            <h2 id="practice-title">{activeModule.goal}</h2>
            <p>
              {formatPracticeScore(activeScore)} · {sessionConfig.promptCount}{" "}
              generated prompts · {sessionConfig.topic}
            </p>
            <Link
              className="button button--quiet"
              to={`/practice/${activeModuleId}/setup`}
            >
              Configure session
            </Link>
          </div>

          {session.prompt ? (
            <div className="practice-task">
              {session.isSessionComplete ? (
                <aside className="practice-session-summary" role="status">
                  <strong>
                    {session.sessionResult.attempted > 0 &&
                    session.sessionResult.correct /
                      session.sessionResult.attempted >=
                      0.8
                      ? "Nice session!"
                      : "Session complete"}
                  </strong>
                  <span className="practice-session-summary__score">
                    {session.sessionResult.correct}/
                    {session.sessionResult.attempted} correct
                    {session.liveStats.bestStreak > 1
                      ? ` · best streak ${session.liveStats.bestStreak}`
                      : ""}
                  </span>
                  <span>
                    Review queue:{" "}
                    {session.sessionResult.missedPromptIds.length} prompt
                    {session.sessionResult.missedPromptIds.length === 1
                      ? ""
                      : "s"}
                  </span>
                  <div className="practice-session-summary__actions">
                    {session.sessionResult.missedPromptIds.length > 0 ? (
                      <Link className="button button--quiet" to="/review">
                        Review your misses
                      </Link>
                    ) : null}
                    <Link
                      className="button button--quiet"
                      to={`/practice/${activeModuleId}/setup`}
                    >
                      Practice again
                    </Link>
                    <Link
                      className="button button--secondary"
                      to={`/practice/${nextModule.id}/setup`}
                    >
                      Next: {nextModule.title}
                    </Link>
                  </div>
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
                    Prompt {session.liveStats.promptNumber} of{" "}
                    {session.liveStats.total} · {session.liveStats.correct}{" "}
                    correct
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
                    title={`${activeModule.title} notation`}
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
                    <p role="status">
                      {audioPlaybackLabel(audioStatus)}
                    </p>
                  </div>
                ) : null}
                {session.prompt.visualLabel ? (
                  <div className="practice-sequence" aria-label={session.prompt.visualLabel}>
                    {(session.selected.length > 0
                      ? session.selected
                      : session.prompt.answer
                    ).map((item, index) => (
                      <span key={`${item}-${index}`}>{item}</span>
                    ))}
                  </div>
                ) : null}
                <KeyboardFigure
                  label={`${activeModule.title} keyboard`}
                  active={selectedNotes}
                />
              </div>

              <div className="practice-choice-grid" aria-label="Answer choices">
                {session.prompt.choices.map((choice) => (
                  <button
                    key={choice}
                    type="button"
                    aria-pressed={session.selectedSet.has(choice)}
                    onClick={() => session.choose(choice)}
                  >
                    {session.prompt?.inputMode === "staff-click" ? (
                      <span className="choice-kicker">Staff</span>
                    ) : null}
                    {choice}
                  </button>
                ))}
              </div>

              {promptKind === "ordered" ||
              promptKind === "grid" ||
              session.prompt.inputMode === "harmony-board" ? (
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
              </div>

              <PracticeResultPanel
                feedback={session.feedback}
                prompt={session.prompt}
                onRetry={session.retry}
                onNext={session.next}
                onRateConfidence={(confidence) =>
                  recordSkillConfidence(
                    session.prompt.skillTargets ?? [],
                    confidence
                  )
                }
              />
            </div>
          ) : (
            <div className="practice-placeholder">
              <div>
                <h2>{activeModule.title} is planned</h2>
                <p>{activeModule.goal}</p>
              </div>
            </div>
          )}
        </article>
      </section>
    </div>
  );
}
