import { Hand, Mic, MicOff, Play, RefreshCw } from "lucide-react";

type CallResponseStageProps = Readonly<{
  mode: "sing" | "clap";
  isListening: boolean;
  usingTapFallback: boolean;
  onsetCount: number;
  statusText: string;
  onChooseMode: (mode: "sing" | "clap") => void;
  onHearTarget: () => void;
  onNewRound: () => void;
  onStartListening: () => void;
  onStopListening: () => void;
  onCheckClaps: () => void;
  onTap: () => void;
}>;

export function CallResponseStage({
  mode,
  isListening,
  usingTapFallback,
  onsetCount,
  statusText,
  onChooseMode,
  onHearTarget,
  onNewRound,
  onStartListening,
  onStopListening,
  onCheckClaps,
  onTap
}: CallResponseStageProps) {
  return (
    <section className="ear-games call-response" aria-labelledby="call-response-title">
      <header className="ear-games__head">
        <h2 id="call-response-title">Call and response</h2>
        <p>No score, no recording. Analysis is local, nothing leaves your device, and Stop releases the microphone.</p>
      </header>

      <div className="ear-games__tabs" role="tablist" aria-label="Call and response mode">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "sing"}
          aria-label="Sing back"
          className={`ear-games__tab ${mode === "sing" ? "is-active" : ""}`}
          onClick={() => onChooseMode("sing")}
        >
          <strong>Sing back</strong>
          <span>Hear a note, then sing it back.</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "clap"}
          aria-label="Clap back"
          className={`ear-games__tab ${mode === "clap" ? "is-active" : ""}`}
          onClick={() => onChooseMode("clap")}
        >
          <strong>Clap back</strong>
          <span>Hear a rhythm, then echo it.</span>
        </button>
      </div>

      <div className="ear-games__stage call-response__stage">
        <p className="ear-games__prompt">
          {mode === "sing" ? "Sing the note you heard." : "Clap the rhythm you heard at 120 BPM."}
        </p>
        <div className="ear-games__transport">
          <button type="button" className="button button--primary" onClick={onHearTarget}>
            <Play size={16} aria-hidden="true" />
            Hear target
          </button>
          <button type="button" className="button button--quiet" onClick={onNewRound}>
            <RefreshCw size={16} aria-hidden="true" />
            {mode === "sing" ? "New target" : "New pattern"}
          </button>
          {isListening ? (
            <button
              type="button"
              className="button button--secondary"
              onClick={mode === "clap" ? onCheckClaps : onStopListening}
            >
              <MicOff size={16} aria-hidden="true" />
              {mode === "clap" ? "Stop & check" : "Stop listening"}
            </button>
          ) : (
            <button type="button" className="button button--secondary" onClick={onStartListening}>
              <Mic size={16} aria-hidden="true" />
              Start listening
            </button>
          )}
          {usingTapFallback ? (
            <button type="button" className="button button--secondary" onClick={onTap}>
              <Hand size={16} aria-hidden="true" />
              Tap instead
            </button>
          ) : null}
          {mode === "clap" && usingTapFallback ? (
            <button type="button" className="button button--quiet" onClick={onCheckClaps}>
              Stop &amp; check
            </button>
          ) : null}
        </div>
        {mode === "clap" ? <span className="pill">{onsetCount} claps</span> : null}
        <p className="call-response__status" aria-live="polite">{statusText}</p>
      </div>
    </section>
  );
}
