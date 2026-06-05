import { Drum, Guitar, Mic2, Piano, Play } from "lucide-react";
import { useMemo, useState } from "react";
import type {
  ChordShape,
  DegreeHighlight,
  FretboardTuning,
  InstrumentId
} from "../types/course";
import {
  fretboardPositions,
  pitchClass,
  voiceDegreeLadder
} from "../lib/instruments";

const pianoOctaves = [3, 4, 5];
const pianoPitchClasses = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B"
];

function highlightFor(note: string, highlights: DegreeHighlight[]) {
  return highlights.find((highlight) => pitchClass(highlight.note) === pitchClass(note));
}

type PianoWorkbenchProps = {
  label: string;
  highlights: DegreeHighlight[];
  bassNote?: string;
  onToggle?: (note: string) => void;
  selectedNotes?: string[];
};

export function InteractivePianoWorkbench({
  label,
  highlights,
  bassNote,
  onToggle,
  selectedNotes = []
}: PianoWorkbenchProps) {
  const selectedSet = new Set(selectedNotes.map(pitchClass));

  return (
    <section className="instrument-board" aria-labelledby="piano-board-title">
      <div className="instrument-board__header">
        <Piano size={18} aria-hidden="true" />
        <div>
          <h2 id="piano-board-title">{label}</h2>
          <p>Chord tones, degrees, octaves, and inversion bass are visible together.</p>
        </div>
      </div>
      <div className="interactive-piano" aria-label={label}>
        {pianoOctaves.map((octave) => (
          <div key={octave} className="interactive-piano__octave">
            <span>Oct {octave}</span>
            {pianoPitchClasses.map((note) => {
              const fullNote = `${note}${octave}`;
              const highlight = highlightFor(note, highlights);
              const isBass = bassNote && pitchClass(bassNote) === pitchClass(note);
              const isSelected = selectedSet.has(pitchClass(note)) || Boolean(highlight);

              return (
                <button
                  key={fullNote}
                  type="button"
                  className={[
                    note.includes("#") ? "is-black" : "is-white",
                    isSelected ? "is-active" : "",
                    isBass ? "is-bass" : ""
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  aria-pressed={isSelected}
                  onClick={() => onToggle?.(fullNote)}
                >
                  <strong>{note}</strong>
                  <span>{highlight?.degree ?? (isBass ? "bass" : "")}</span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}

type FretboardWorkbenchProps = {
  instrumentId: Extract<InstrumentId, "guitar" | "bass" | "ukulele">;
  title: string;
  tuning: FretboardTuning;
  activeNotes: string[];
  chordShape?: ChordShape;
};

export function FretboardWorkbench({
  instrumentId,
  title,
  tuning,
  activeNotes,
  chordShape
}: FretboardWorkbenchProps) {
  const positions = useMemo(
    () => fretboardPositions(tuning, activeNotes, chordShape?.root),
    [activeNotes, chordShape?.root, tuning]
  );

  return (
    <section className="instrument-board" aria-labelledby={`${instrumentId}-fretboard-title`}>
      <div className="instrument-board__header">
        <Guitar size={18} aria-hidden="true" />
        <div>
          <h2 id={`${instrumentId}-fretboard-title`}>{title}</h2>
          <p>Roots, chord tones, open strings, muted strings, and fret targets share one map.</p>
        </div>
      </div>
      {chordShape ? (
        <>
          <div className="workbench-readout">
            <strong>{chordShape.name}</strong>
            <span>{chordShape.symbol} shape</span>
          </div>
          <div className="chord-shape-strip" aria-label={`${chordShape.name} shape`}>
            {chordShape.frets.map((fret, index) => (
              <span key={`${chordShape.id}-${index}`}>
                <strong>{tuning.strings[index]?.replace(/[0-9]/g, "")}</strong>
                <em>{fret === "x" ? "mute" : fret === 0 ? "open" : `fret ${fret}`}</em>
                <b>{chordShape.fingers[index] || ""}</b>
              </span>
            ))}
          </div>
        </>
      ) : null}
      <div
        className="fretboard-grid"
        aria-label={`${title} fretboard`}
        role="group"
        tabIndex={0}
      >
        <div className="fretboard-grid__frets" aria-hidden="true">
          <span />
          {Array.from({ length: tuning.fretCount + 1 }, (_, fret) => (
            <span key={fret}>{fret}</span>
          ))}
        </div>
        {positions.map((stringPositions) => (
          <div key={stringPositions[0]?.stringName} className="fretboard-grid__string">
            <strong>{stringPositions[0]?.stringName.replace(/[0-9]/g, "")}</strong>
            {stringPositions.map((position) => (
              <span
                key={`${position.stringName}-${position.fret}`}
                className={[
                  position.isActive ? "is-active" : "",
                  position.isRoot ? "is-root" : ""
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {position.note}
              </span>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

type DrumPadWorkbenchProps = {
  pattern: boolean[][];
  onToggle: (row: number, step: number) => void;
  playbackCursor?: number;
};

const drumRows = ["kick", "snare", "hat", "clap"];

export function DrumPadWorkbench({
  pattern,
  onToggle,
  playbackCursor = -1
}: DrumPadWorkbenchProps) {
  return (
    <section className="instrument-board" aria-labelledby="drum-pad-title">
      <div className="instrument-board__header">
        <Drum size={18} aria-hidden="true" />
        <div>
          <h2 id="drum-pad-title">Drum pads</h2>
          <p>Build a groove by toggling instrument rows across four beat slots.</p>
        </div>
      </div>
      <div className="drum-pad-grid" aria-label="Drum groove editor">
        {pattern.map((row, rowIndex) => (
          <div key={drumRows[rowIndex]} className="drum-pad-grid__row">
            <strong>{drumRows[rowIndex]}</strong>
            {row.map((isActive, stepIndex) => (
              <button
                key={`${rowIndex}-${stepIndex}`}
                type="button"
                className={playbackCursor === stepIndex ? "is-playing" : ""}
                aria-pressed={isActive}
                onClick={() => onToggle(rowIndex, stepIndex)}
              >
                {stepIndex + 1}
              </button>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

type VoiceWorkbenchProps = {
  activeNotes: string[];
  onPlay: () => void;
  /** Optional movable-do key context; defaults to C major. */
  tonic?: string;
  mode?: "major" | "minor";
};

export function VoiceRangeWorkbench({
  activeNotes,
  onPlay,
  tonic = "C",
  mode = "major"
}: VoiceWorkbenchProps) {
  const activeSet = new Set(activeNotes);
  const ladder = useMemo(
    () => voiceDegreeLadder(tonic, mode),
    [tonic, mode]
  );
  const [selected, setSelected] = useState(ladder[0]?.note ?? "C4");

  return (
    <section className="instrument-board" aria-labelledby="voice-range-title">
      <div className="instrument-board__header">
        <Mic2 size={18} aria-hidden="true" />
        <div>
          <h2 id="voice-range-title">Voice guide</h2>
          <p>Use reference tones and solfege labels without microphone scoring.</p>
        </div>
      </div>
      <div className="voice-degree-ladder" aria-label="Voice solfege ladder">
        {ladder.map((item) => (
          <button
            key={`${item.degree}-${item.note}`}
            type="button"
            aria-pressed={selected === item.note || activeSet.has(item.note)}
            onClick={() => setSelected(item.note)}
          >
            <strong>{item.solfege}</strong>
            <span>{item.degree}</span>
            <em>{item.note}</em>
          </button>
        ))}
      </div>
      <button className="button button--secondary" type="button" onClick={onPlay}>
        <Play size={17} aria-hidden="true" />
        Play reference
      </button>
    </section>
  );
}
