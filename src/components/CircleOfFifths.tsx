import { useMemo, useState } from "react";
import { keyContext, type KeyMode } from "../lib/theory";

/**
 * Interactive circle of fifths. Pure presentation built on the theory engine's
 * `keyContext`, so key signatures, relative minors, and diatonic chords are all
 * derived rather than hardcoded. Used both as a standalone tool and as a lesson
 * component.
 */

// Clockwise from C: each step is a perfect fifth up (one more sharp).
const CIRCLE_MAJOR = [
  "C",
  "G",
  "D",
  "A",
  "E",
  "B",
  "F#",
  "Db",
  "Ab",
  "Eb",
  "Bb",
  "F"
];

const RELATIVE_MINOR = [
  "Am",
  "Em",
  "Bm",
  "F#m",
  "C#m",
  "G#m",
  "D#m",
  "Bbm",
  "Fm",
  "Cm",
  "Gm",
  "Dm"
];

type CircleOfFifthsProps = {
  /** Notified when the learner selects a key (tonic + mode). */
  onSelectKey?: (tonic: string, mode: KeyMode) => void;
  /** Initial selected tonic. */
  initialTonic?: string;
  initialMode?: KeyMode;
};

function describeSignature(count: number, accidental: string): string {
  if (count === 0) {
    return "no sharps or flats";
  }

  const symbol = accidental === "b" ? "flat" : "sharp";
  return `${count} ${symbol}${count === 1 ? "" : "s"}`;
}

export function CircleOfFifths({
  onSelectKey,
  initialTonic = "C",
  initialMode = "major"
}: CircleOfFifthsProps) {
  const [tonic, setTonic] = useState(initialTonic);
  const [mode, setMode] = useState<KeyMode>(initialMode);

  const context = useMemo(() => keyContext(tonic, mode), [tonic, mode]);
  const signatureCount = Math.abs(context.alteration);

  function select(nextTonic: string, nextMode: KeyMode) {
    setTonic(nextTonic);
    setMode(nextMode);
    onSelectKey?.(nextTonic, nextMode);
  }

  return (
    <section className="circle-of-fifths" aria-labelledby="circle-title">
      <div className="circle-of-fifths__header">
        <h2 id="circle-title">Circle of fifths</h2>
        <p>
          Each step clockwise adds a sharp; each step counter-clockwise adds a
          flat. Select a key to see its signature and diatonic chords.
        </p>
      </div>

      <div
        className="circle-of-fifths__ring"
        role="group"
        aria-label="Major keys around the circle"
      >
        {CIRCLE_MAJOR.map((majorKey) => {
          const isActive = mode === "major" && majorKey === tonic;

          return (
            <button
              key={majorKey}
              type="button"
              className="circle-key circle-key--major"
              aria-pressed={isActive}
              onClick={() => select(majorKey, "major")}
            >
              {majorKey}
            </button>
          );
        })}
      </div>

      <div
        className="circle-of-fifths__ring circle-of-fifths__ring--minor"
        role="group"
        aria-label="Relative minor keys"
      >
        {RELATIVE_MINOR.map((minorKey) => {
          const minorTonic = minorKey.replace(/m$/, "");
          const isActive = mode === "minor" && minorTonic === tonic;

          return (
            <button
              key={minorKey}
              type="button"
              className="circle-key circle-key--minor"
              aria-pressed={isActive}
              onClick={() => select(minorTonic, "minor")}
            >
              {minorKey}
            </button>
          );
        })}
      </div>

      <dl className="circle-of-fifths__readout" aria-live="polite">
        <div>
          <dt>Key</dt>
          <dd>
            {tonic} {mode}
          </dd>
        </div>
        <div>
          <dt>Key signature</dt>
          <dd>{describeSignature(signatureCount, context.keySignature)}</dd>
        </div>
        <div>
          <dt>Scale</dt>
          <dd>{context.scale.join(" ")}</dd>
        </div>
        <div>
          <dt>Diatonic chords</dt>
          <dd>{context.triads.join(" ")}</dd>
        </div>
      </dl>
    </section>
  );
}
