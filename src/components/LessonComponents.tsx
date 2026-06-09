import { Check, Headphones, Info, Piano, Play, X } from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  audioPlaybackLabel,
  playChord,
  playSequence,
  stopAudioPlayback,
  triggerNote
} from "../lib/audioEngine";
import type { AudioPlaybackState } from "../lib/audioEngine";
import { keyboardPitchClasses, normalizePitchClassForKeyboard } from "../lib/music";
import { useProgress } from "../state/progress";

type CalloutProps = {
  title?: string;
  tone?: "melody" | "rhythm" | "harmony";
  children: ReactNode;
};

type MicroCheckProps = {
  id: string;
  prompt: string;
  options: string[];
  answer: string;
  explanation: string;
};

type AudioExampleProps = {
  label: string;
  notes: string[];
  mode?: "sequence" | "chord";
};

type NotationFigureProps = {
  title: string;
  notation: string;
  clef?: "treble" | "bass";
  timeSignature?: string;
};

type KeyboardFigureProps = {
  label: string;
  active: string[];
  /** When true, keys are buttons that play their pitch on click. */
  playable?: boolean;
};

export function Callout({ title = "Focus", tone = "melody", children }: CalloutProps) {
  return (
    <aside className={`callout callout--${tone}`}>
      <Info size={18} aria-hidden="true" />
      <div>
        <strong>{title}</strong>
        <div>{children}</div>
      </div>
    </aside>
  );
}

export function MicroCheck({
  id,
  prompt,
  options,
  answer,
  explanation
}: MicroCheckProps) {
  const [selected, setSelected] = useState("");
  const [result, setResult] = useState<"idle" | "correct" | "incorrect">(
    "idle"
  );
  const { recordCheckResult } = useProgress();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selected) {
      return;
    }

    const isCorrect = selected === answer;
    setResult(isCorrect ? "correct" : "incorrect");
    recordCheckResult(id, isCorrect);
  }

  return (
    <form className="micro-check" onSubmit={submit}>
      <fieldset>
        <legend>{prompt}</legend>
        <div className="micro-check__options">
          {options.map((option) => (
            <label key={option} className="micro-check__option">
              <input
                type="radio"
                name={id}
                value={option}
                checked={selected === option}
                onChange={(event) => setSelected(event.currentTarget.value)}
              />
              <span>{option}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <button className="button button--secondary" type="submit">
        <Check size={17} aria-hidden="true" />
        Check answer
      </button>
      {result !== "idle" ? (
        <p className={`micro-check__result is-${result}`} role="status">
          {result === "correct" ? (
            <Check size={17} aria-hidden="true" />
          ) : (
            <X size={17} aria-hidden="true" />
          )}
          <span>
            <strong>
              {result === "correct" ? "Correct. " : `Not quite — the answer is ${answer}. `}
            </strong>
            {explanation}
          </span>
        </p>
      ) : null}
    </form>
  );
}

export function AudioExample({
  label,
  notes,
  mode = "sequence"
}: AudioExampleProps) {
  const [status, setStatus] = useState<"idle" | "playing" | "disabled" | "error">(
    "idle"
  );
  const [playbackState, setPlaybackState] =
    useState<AudioPlaybackState>("idle");
  const { progress } = useProgress();

  useEffect(() => {
    return () => stopAudioPlayback();
  }, []);

  async function play() {
    if (playbackState === "playing" || playbackState === "loading") {
      stopAudioPlayback(setPlaybackState);
      return;
    }

    const playFn = mode === "chord" ? playChord : playSequence;
    const nextState = await playFn(label, notes, {
      audioEnabled: progress.settings.audioEnabled,
      onStateChange: setPlaybackState
    });
    setStatus(
      nextState === "disabled"
        ? "disabled"
        : nextState === "error"
          ? "error"
          : nextState === "playing"
            ? "playing"
            : "idle"
    );
  }

  return (
    <div className="audio-example">
      <div>
        <Headphones size={18} aria-hidden="true" />
        <span>{label}</span>
        <code>{notes.join(" ")}</code>
      </div>
      <button
        className="icon-button"
        type="button"
        title={
          playbackState === "playing" || playbackState === "loading"
            ? `Stop ${label}`
            : `Play ${label}`
        }
        onClick={play}
      >
        <Play size={18} aria-hidden="true" />
        <span className="visually-hidden">
          {playbackState === "playing" || playbackState === "loading"
            ? `Stop ${label}`
            : `Play ${label}`}
        </span>
      </button>
      <span className="audio-example__status" role="status">
        {status === "disabled" || status === "error"
          ? audioPlaybackLabel(status)
          : audioPlaybackLabel(playbackState)}
      </span>
    </div>
  );
}

export function NotationFigure({
  title,
  notation,
  clef = "treble",
  timeSignature = "4/4"
}: NotationFigureProps) {
  const rawId = useId();
  const elementId = useMemo(
    () => `notation-${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}`,
    [rawId]
  );
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function renderNotation() {
      const container = containerRef.current;

      if (!container) {
        return;
      }

      container.innerHTML = "";
      container.id = elementId;

      try {
        const { Factory } = await import("vexflow");

        if (cancelled) {
          return;
        }

        const width = Math.min(container.clientWidth || 560, 760);
        const vf = new Factory({
          renderer: {
            elementId,
            width,
            height: 170
          }
        });
        const score = vf.EasyScore();
        const system = vf.System({
          x: 14,
          y: 18,
          width: width - 28,
          spaceBetweenStaves: 10
        });

        system
          .addStave({
            voices: [score.voice(score.notes(notation), { time: timeSignature })]
          })
          .addClef(clef)
          .addTimeSignature(timeSignature);
        vf.draw();
        setFailed(false);
      } catch {
        setFailed(true);
      }
    }

    renderNotation();

    return () => {
      cancelled = true;
    };
  }, [clef, elementId, notation, timeSignature]);

  return (
    <figure className="notation-figure">
      <figcaption>{title}</figcaption>
      <div ref={containerRef} className="notation-figure__stage" />
      {failed ? (
        <p role="status">Notation unavailable. Notes: {notation}</p>
      ) : null}
    </figure>
  );
}

export function KeyboardFigure({ label, active, playable }: KeyboardFigureProps) {
  const activeSet = new Set(active.map(normalizePitchClassForKeyboard));

  return (
    <figure className="keyboard-figure">
      <figcaption>
        <Piano size={18} aria-hidden="true" />
        {label}
        {playable ? (
          <span className="keyboard-figure__hint"> · tap to play</span>
        ) : null}
      </figcaption>
      <div className="keyboard-figure__keys" aria-label={label}>
        {keyboardPitchClasses().map((pitchClass) => {
          const isBlack = pitchClass.includes("#");
          const isActive = activeSet.has(pitchClass);
          const className = [
            "keyboard-figure__key",
            isBlack ? "is-black" : "is-white",
            isActive ? "is-active" : ""
          ]
            .filter(Boolean)
            .join(" ");

          if (playable) {
            return (
              <button
                key={pitchClass}
                type="button"
                className={className}
                aria-label={pitchClass}
                onClick={() =>
                  void triggerNote(`${pitchClass}4`, { voiceId: "keys" })
                }
              >
                {pitchClass}
              </button>
            );
          }

          return (
            <span key={pitchClass} className={className}>
              {pitchClass}
            </span>
          );
        })}
      </div>
    </figure>
  );
}
