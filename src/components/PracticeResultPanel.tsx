import { CheckCircle2, RefreshCw, XCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { buildInteractionHint } from "../lib/interactionHints";
import type { PracticeFeedback, PracticePrompt } from "../lib/practiceEngine";

type PracticeResultPanelProps = {
  feedback: PracticeFeedback;
  prompt: PracticePrompt;
  onRetry: () => void;
  onNext: () => void;
  onRateConfidence?: (confidence: "easy" | "hard") => void;
};

export function PracticeResultPanel({
  feedback,
  prompt,
  onRetry,
  onNext,
  onRateConfidence
}: PracticeResultPanelProps) {
  const isIdle = feedback.status === "idle";
  const Icon = feedback.status === "correct" ? CheckCircle2 : XCircle;
  const hint =
    feedback.status === "incorrect"
      ? buildInteractionHint(prompt, feedback.selected)
      : undefined;

  return (
    <aside
      className={`practice-result-panel is-${feedback.status} pulse-${feedback.pulseState}`}
      aria-label="Practice result"
      role={isIdle ? undefined : "status"}
    >
      {isIdle ? (
        <div>
          <strong>Ready when you are</strong>
          <p>Choose an answer, then check it. There is no timer.</p>
        </div>
      ) : (
        <>
          <Icon size={20} aria-hidden="true" />
          <div>
            <strong>
              {feedback.status === "correct" ? "Correct" : "Review this one"}
            </strong>
            <p>{feedback.message}</p>
            {hint ? (
              <div className="practice-hint">
                <strong>{hint.shortHint}</strong>
                <span>{hint.selectedExplanation}</span>
                <Link to={hint.linkedPracticeRoute}>{hint.retryTarget}</Link>
                {hint.linkedInstrumentRoute ? (
                  <Link to={hint.linkedInstrumentRoute}>Open instrument lab</Link>
                ) : null}
              </div>
            ) : null}
            <dl>
              <div>
                <dt>Correct answer</dt>
                <dd>{feedback.expected.join(" -> ")}</dd>
              </div>
              <div>
                <dt>Source lens</dt>
                <dd>{prompt.citationLabel ?? "Course source notes"}</dd>
              </div>
            </dl>
          </div>
        </>
      )}
      <div className="practice-result-panel__actions">
        {feedback.status === "correct" && onRateConfidence ? (
          <div
            className="practice-confidence"
            role="group"
            aria-label="How did that feel?"
          >
            <span>How did that feel?</span>
            <button
              className="button button--quiet"
              type="button"
              onClick={() => onRateConfidence("hard")}
            >
              Hard
            </button>
            <button
              className="button button--quiet"
              type="button"
              onClick={() => onRateConfidence("easy")}
            >
              Easy
            </button>
          </div>
        ) : null}
        <button
          className="button button--quiet"
          type="button"
          disabled={isIdle}
          onClick={onRetry}
        >
          <RefreshCw size={17} aria-hidden="true" />
          Retry
        </button>
        <button className="button button--secondary" type="button" onClick={onNext}>
          Next prompt
        </button>
      </div>
    </aside>
  );
}
