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
import {
  liveVoiceForInstrument,
  playChord,
  playSequence,
  triggerNote,
  triggerNoteAttack,
  triggerNoteRelease,
  type LiveVoiceId
} from "../lib/audioEngine";
import {
  useInstrumentHotkeys,
  type InstrumentHotkeyMap
} from "../hooks/useInstrumentHotkeys";

const FRETBOARD_HOTKEYS = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"];

const OCTAVE_RANGES: Record<string, number[]> = {
  low: [2, 3],
  mid: [3, 4, 5],
  high: [4, 5, 6]
};
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
  audioEnabled?: boolean;
};

export function InteractivePianoWorkbench({
  label,
  highlights,
  bassNote,
  onToggle,
  selectedNotes = [],
  audioEnabled = true
}: PianoWorkbenchProps) {
  const selectedSet = new Set(selectedNotes.map(pitchClass));
  const [range, setRange] = useState<keyof typeof OCTAVE_RANGES>("mid");
  const octaves = OCTAVE_RANGES[range];

  function press(note: string) {
    void triggerNoteAttack(note, { voiceId: "keys", audioEnabled });
  }

  function release(note: string) {
    triggerNoteRelease(note, { voiceId: "keys" });
  }

  return (
    <section className="instrument-board" aria-labelledby="piano-board-title">
      <div className="instrument-board__header">
        <Piano size={18} aria-hidden="true" />
        <div>
          <h2 id="piano-board-title">{label}</h2>
          <p>Press keys to hear them. Chord tones, degrees, and inversion bass stay visible.</p>
        </div>
      </div>
      <div className="piano-range-control" role="group" aria-label="Octave range">
        {(["low", "mid", "high"] as const).map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={range === option}
            onClick={() => setRange(option)}
          >
            {option}
          </button>
        ))}
      </div>
      <div className="interactive-piano" aria-label={label}>
        {octaves.map((octave) => (
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
                  aria-label={`${note}${octave}`}
                  onPointerDown={(event) => {
                    event.preventDefault();
                    press(fullNote);
                    onToggle?.(fullNote);
                  }}
                  onPointerUp={() => release(fullNote)}
                  onPointerLeave={() => release(fullNote)}
                  onPointerCancel={() => release(fullNote)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      void triggerNote(fullNote, { voiceId: "keys", audioEnabled });
                      onToggle?.(fullNote);
                    }
                  }}
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
  audioEnabled?: boolean;
  /** When set, pressing a fret reports the pitch class (for practice answers). */
  onSelectNote?: (pitchClass: string) => void;
};

export function FretboardWorkbench({
  instrumentId,
  title,
  tuning,
  activeNotes,
  chordShape,
  audioEnabled = true,
  onSelectNote
}: FretboardWorkbenchProps) {
  const positions = useMemo(
    () => fretboardPositions(tuning, activeNotes, chordShape?.root),
    [activeNotes, chordShape?.root, tuning]
  );
  const voiceId: LiveVoiceId = liveVoiceForInstrument(instrumentId);
  const hotkeyOctave = instrumentId === "bass" ? 2 : 3;
  const hotkeyNotes = useMemo(() => {
    const seen = new Set<string>();
    const notes: string[] = [];
    for (const note of activeNotes) {
      const pc = pitchClass(note);
      if (seen.has(pc)) {
        continue;
      }
      seen.add(pc);
      notes.push(`${pc}${hotkeyOctave}`);
    }
    return notes.slice(0, FRETBOARD_HOTKEYS.length);
  }, [activeNotes, hotkeyOctave]);
  const hotkeyMap = useMemo<InstrumentHotkeyMap>(() => {
    const map: InstrumentHotkeyMap = {};
    hotkeyNotes.forEach((note, index) => {
      const key = FRETBOARD_HOTKEYS[index];
      map[key] = {
        label: `${key.toUpperCase()} ${pitchClass(note)}`,
        onDown: () => void triggerNoteAttack(note, { voiceId, audioEnabled }),
        onUp: () => triggerNoteRelease(note, { voiceId })
      };
    });
    return map;
  }, [hotkeyNotes, voiceId, audioEnabled]);
  useInstrumentHotkeys({
    map: hotkeyMap,
    onReleaseAll: () =>
      hotkeyNotes.forEach((note) => triggerNoteRelease(note, { voiceId }))
  });

  function playFret(openNote: string, fret: number) {
    // The displayed pitch class lacks an octave; derive a sounding note from
    // the open-string octave plus the fret offset for a realistic register.
    const octave = Number(openNote.match(/\d+$/)?.[0] ?? "3");
    const baseOctave = octave + Math.floor(fret / 12);
    return { voiceId, baseOctave };
  }

  return (
    <section className="instrument-board" aria-labelledby={`${instrumentId}-fretboard-title`}>
      <div className="instrument-board__header">
        <Guitar size={18} aria-hidden="true" />
        <div>
          <h2 id={`${instrumentId}-fretboard-title`}>{title}</h2>
          <p>Press a fret to hear it. Roots, chord tones, and open strings share one map.</p>
        </div>
      </div>
      {hotkeyNotes.length > 0 ? (
        <p className="workbench-hotkey-hint">
          Keys{" "}
          {hotkeyNotes
            .map((note, index) => `${FRETBOARD_HOTKEYS[index].toUpperCase()}=${pitchClass(note)}`)
            .join("  ")}
        </p>
      ) : null}
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
          <div className="chord-shape-play" role="group" aria-label="Play chord shape">
            <button
              type="button"
              className="button button--quiet"
              onClick={() =>
                void playChord(
                  `${chordShape.symbol} block`,
                  activeNotes.map((note) => `${note}3`),
                  { audioEnabled }
                )
              }
            >
              Block
            </button>
            <button
              type="button"
              className="button button--quiet"
              onClick={() =>
                void playSequence(
                  `${chordShape.symbol} strum`,
                  activeNotes.map((note) => `${note}3`),
                  { audioEnabled }
                )
              }
            >
              Strum
            </button>
          </div>
        </>
      ) : null}
      <div
        className="fretboard-grid"
        aria-label={`${title} fretboard`}
        role="group"
      >
        <div className="fretboard-grid__frets" aria-hidden="true">
          <span />
          {Array.from({ length: tuning.fretCount + 1 }, (_, fret) => (
            <span key={fret}>{fret}</span>
          ))}
        </div>
        {positions.map((stringPositions) => {
          const openNote = stringPositions[0]?.stringName ?? "E3";

          return (
            <div key={openNote} className="fretboard-grid__string">
              <strong>{openNote.replace(/[0-9]/g, "")}</strong>
              {stringPositions.map((position) => {
                const { baseOctave } = playFret(openNote, position.fret);
                const soundingNote = `${position.note}${baseOctave}`;

                return (
                  <button
                    key={`${position.stringName}-${position.fret}`}
                    type="button"
                    className={[
                      "fretboard-cell",
                      position.isActive ? "is-active" : "",
                      position.isRoot ? "is-root" : ""
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    aria-label={`${position.note} on ${openNote.replace(/[0-9]/g, "")} string, fret ${position.fret}`}
                    onPointerDown={(event) => {
                      event.preventDefault();
                      void triggerNoteAttack(soundingNote, { voiceId, audioEnabled });
                      onSelectNote?.(position.note);
                    }}
                    onPointerUp={() => triggerNoteRelease(soundingNote, { voiceId })}
                    onPointerLeave={() => triggerNoteRelease(soundingNote, { voiceId })}
                    onPointerCancel={() => triggerNoteRelease(soundingNote, { voiceId })}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        void triggerNote(soundingNote, { voiceId, audioEnabled });
                        onSelectNote?.(position.note);
                      }
                    }}
                  >
                    {position.note}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </section>
  );
}

type DrumPadWorkbenchProps = {
  pattern: boolean[][];
  onToggle: (row: number, step: number) => void;
  playbackCursor?: number;
  audioEnabled?: boolean;
};

const drumRows = ["kick", "snare", "hat", "clap"];
const drumVoices: LiveVoiceId[] = ["kick", "snare", "hat", "clap"];
const DRUM_HOTKEYS: { key: string; voice: LiveVoiceId }[] = [
  { key: "z", voice: "kick" },
  { key: "x", voice: "snare" },
  { key: "c", voice: "hat" },
  { key: "v", voice: "clap" }
];

export function DrumPadWorkbench({
  pattern,
  onToggle,
  playbackCursor = -1,
  audioEnabled = true
}: DrumPadWorkbenchProps) {
  const hotkeyMap = useMemo<InstrumentHotkeyMap>(() => {
    const map: InstrumentHotkeyMap = {};
    DRUM_HOTKEYS.forEach(({ key, voice }) => {
      map[key] = {
        label: `${key.toUpperCase()} ${voice}`,
        onDown: () => void triggerNote("C2", { voiceId: voice, audioEnabled })
      };
    });
    return map;
  }, [audioEnabled]);
  useInstrumentHotkeys({ map: hotkeyMap });

  return (
    <section className="instrument-board" aria-labelledby="drum-pad-title">
      <div className="instrument-board__header">
        <Drum size={18} aria-hidden="true" />
        <div>
          <h2 id="drum-pad-title">Drum pads</h2>
          <p>Tap a pad to hear it and toggle it across four beat slots.</p>
        </div>
      </div>
      <p className="workbench-hotkey-hint">Keys Z=kick  X=snare  C=hat  V=clap</p>
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
                aria-label={`${drumRows[rowIndex]} beat ${stepIndex + 1}`}
                onClick={() => {
                  void triggerNote("C2", {
                    voiceId: drumVoices[rowIndex] ?? "kick",
                    audioEnabled
                  });
                  onToggle(rowIndex, stepIndex);
                }}
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
  audioEnabled?: boolean;
};

export function VoiceRangeWorkbench({
  activeNotes,
  onPlay,
  tonic = "C",
  mode = "major",
  audioEnabled = true
}: VoiceWorkbenchProps) {
  const activeSet = new Set(activeNotes);
  const ladder = useMemo(
    () => voiceDegreeLadder(tonic, mode),
    [tonic, mode]
  );
  const [selected, setSelected] = useState(ladder[0]?.note ?? "C4");
  const hotkeyMap = useMemo<InstrumentHotkeyMap>(() => {
    const map: InstrumentHotkeyMap = {};
    ladder.slice(0, 8).forEach((item, index) => {
      const key = `${index + 1}`;
      map[key] = {
        label: `${key} ${item.solfege}`,
        onDown: () => {
          setSelected(item.note);
          void triggerNoteAttack(item.note, { voiceId: "voice", audioEnabled });
        },
        onUp: () => triggerNoteRelease(item.note, { voiceId: "voice" })
      };
    });
    return map;
  }, [ladder, audioEnabled]);
  useInstrumentHotkeys({
    map: hotkeyMap,
    onReleaseAll: () =>
      ladder.forEach((item) => triggerNoteRelease(item.note, { voiceId: "voice" }))
  });

  return (
    <section className="instrument-board" aria-labelledby="voice-range-title">
      <div className="instrument-board__header">
        <Mic2 size={18} aria-hidden="true" />
        <div>
          <h2 id="voice-range-title">Voice guide</h2>
          <p>Tap a step to hear its reference tone and solfege. No microphone is used.</p>
        </div>
      </div>
      <p className="workbench-hotkey-hint">Keys 1-8 sing the solfege ladder.</p>
      <div className="voice-degree-ladder" aria-label="Voice solfege ladder">
        {ladder.map((item) => (
          <button
            key={`${item.degree}-${item.note}`}
            type="button"
            aria-pressed={selected === item.note || activeSet.has(item.note)}
            onPointerDown={(event) => {
              event.preventDefault();
              setSelected(item.note);
              void triggerNoteAttack(item.note, { voiceId: "voice", audioEnabled });
            }}
            onPointerUp={() => triggerNoteRelease(item.note, { voiceId: "voice" })}
            onPointerLeave={() => triggerNoteRelease(item.note, { voiceId: "voice" })}
            onPointerCancel={() => triggerNoteRelease(item.note, { voiceId: "voice" })}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                setSelected(item.note);
                void triggerNote(item.note, { voiceId: "voice", audioEnabled });
              }
            }}
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
