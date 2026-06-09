import { useState } from "react";
import { Play, RefreshCw } from "lucide-react";
import {
  playChord,
  playSequence,
  type AudioPlaybackState
} from "../lib/audioEngine";
import {
  EAR_GAMES,
  nextEarGameRound,
  type EarGameId,
  type EarGameRound
} from "../lib/earGames";
import { useProgress } from "../state/progress";

/**
 * Casual ear games for the Play hub. Pick a game, hear a round, tap a guess,
 * see the answer right away. No scoring and nothing saved — just play. The
 * graded ear-training drill still lives in Practice for learners who want it.
 */
export function EarGames() {
  const { progress } = useProgress();
  const audioEnabled = progress.settings.audioEnabled;

  const [game, setGame] = useState<EarGameId>("interval");
  const [round, setRound] = useState<EarGameRound>(() =>
    nextEarGameRound("interval")
  );
  const [guess, setGuess] = useState<string | null>(null);
  const [status, setStatus] = useState<AudioPlaybackState>("idle");

  const revealed = guess !== null;
  const correct = revealed && guess === round.answerId;

  function playRound(current: EarGameRound = round) {
    if (current.play === "chord") {
      void playChord("Ear game", current.notes, {
        audioEnabled,
        onStateChange: setStatus
      });
    } else {
      void playSequence("Ear game", current.notes, {
        audioEnabled,
        onStateChange: setStatus
      });
    }
  }

  function startRound(nextGame: EarGameId = game) {
    const next = nextEarGameRound(nextGame);
    setRound(next);
    setGuess(null);
    playRound(next);
  }

  function chooseGame(nextGame: EarGameId) {
    setGame(nextGame);
    startRound(nextGame);
  }

  function submitGuess(optionId: string) {
    if (revealed) {
      return;
    }
    setGuess(optionId);
  }

  return (
    <section className="ear-games" aria-labelledby="ear-games-title">
      <header className="ear-games__head">
        <h2 id="ear-games-title">Ear games</h2>
        <p>Quick listening games. No score, just play and check.</p>
      </header>

      <div className="ear-games__tabs" role="tablist" aria-label="Ear game">
        {EAR_GAMES.map((meta) => (
          <button
            key={meta.id}
            type="button"
            role="tab"
            aria-selected={meta.id === game}
            className={[
              "ear-games__tab",
              meta.id === game ? "is-active" : ""
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={() => chooseGame(meta.id)}
          >
            <strong>{meta.label}</strong>
            <span>{meta.blurb}</span>
          </button>
        ))}
      </div>

      <div className="ear-games__stage">
        <div className="ear-games__transport">
          <button
            type="button"
            className="button button--primary"
            onClick={() => playRound()}
          >
            <Play size={16} /> Hear it
          </button>
          <button
            type="button"
            className="button"
            onClick={() => startRound()}
          >
            <RefreshCw size={16} /> New round
          </button>
          <span role="status" aria-live="polite" className="ear-games__status">
            {audioEnabled ? "" : "Audio off"}
          </span>
        </div>

        <p className="ear-games__prompt">{round.prompt}</p>

        <div className="ear-games__options">
          {round.options.map((option) => {
            const isAnswer = option.id === round.answerId;
            const isGuess = option.id === guess;
            const className = [
              "ear-games__option",
              revealed && isAnswer ? "is-answer" : "",
              revealed && isGuess && !isAnswer ? "is-wrong" : ""
            ]
              .filter(Boolean)
              .join(" ");

            return (
              <button
                key={option.id}
                type="button"
                className={className}
                aria-pressed={isGuess}
                disabled={revealed}
                onClick={() => submitGuess(option.id)}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        {revealed ? (
          <div
            className={[
              "ear-games__reveal",
              correct ? "is-correct" : "is-soft"
            ].join(" ")}
            role="status"
            aria-live="polite"
          >
            <strong>{correct ? "Nice ear!" : "Good guess."}</strong>{" "}
            <span>{round.reveal}</span>
            <button
              type="button"
              className="button button--secondary"
              onClick={() => startRound()}
            >
              Next round
            </button>
          </div>
        ) : null}
      </div>
      <p className="ear-games__status" aria-hidden="true">
        {status === "playing" ? "Playing…" : ""}
      </p>
    </section>
  );
}
