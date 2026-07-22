import { useRef, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import { normalizePitchClassForKeyboard } from "../lib/music";
import { pianoNotes } from "../lib/pianoPerformance";

type DigitalPianoProps = {
  activeNotes: string[];
  targetNotes?: string[];
  exactTargetNotes?: boolean;
  nextNote?: string | null;
  mistakeNote?: string | null;
  startOctave: number;
  octaveCount?: number;
  qwertyOctave: number;
  latch: boolean;
  noteLabels: boolean;
  onNoteOn: (note: string, velocity?: number, source?: string) => void;
  onNoteOff: (note: string, source?: string) => void;
  onToggle: (note: string, source?: string) => void;
};

const WHITE_NOTES = new Set(["C", "D", "E", "F", "G", "A", "B"]);
const QWERTY_KEYS = ["a", "w", "s", "e", "d", "f", "t", "g", "y", "h", "u", "j"];
const BLACK_POSITIONS: Record<string, number> = {
  "C#": 0.72,
  "D#": 1.72,
  "F#": 3.72,
  "G#": 4.72,
  "A#": 5.72
};

function pitchClass(note: string) {
  return note.replace(/-?\d+$/, "");
}

function keyPosition(note: string) {
  const pitch = pitchClass(note);
  const whitePosition = ["C", "D", "E", "F", "G", "A", "B"].indexOf(pitch);
  return WHITE_NOTES.has(pitch) ? whitePosition : BLACK_POSITIONS[pitch];
}

export function DigitalPiano({
  activeNotes,
  targetNotes = [],
  exactTargetNotes = false,
  nextNote = null,
  mistakeNote = null,
  startOctave,
  octaveCount = 3,
  qwertyOctave,
  latch,
  noteLabels,
  onNoteOn,
  onNoteOff,
  onToggle
}: DigitalPianoProps) {
  const heldPointers = useRef(new Set<string>());
  const activeSet = new Set(activeNotes);
  const targetSet = new Set(
    exactTargetNotes ? targetNotes : targetNotes.map(normalizePitchClassForKeyboard)
  );
  const notes = pianoNotes(startOctave, octaveCount);

  function release(note: string, pointerId: number) {
    const pointer = `${note}:${pointerId}`;
    if (heldPointers.current.delete(pointer)) {
      onNoteOff(note, `pointer:${pointerId}`);
    }
  }

  function handlePointerDown(event: PointerEvent<HTMLButtonElement>, note: string) {
    event.preventDefault();
    if (latch) {
      onToggle(note, "pointer:latch");
      return;
    }
    heldPointers.current.add(`${note}:${event.pointerId}`);
    event.currentTarget.setPointerCapture?.(event.pointerId);
    onNoteOn(note, 0.8, `pointer:${event.pointerId}`);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, note: string) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onToggle(note);
    }
  }

  function handleKeyUp(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
    }
  }

  return (
    <div className="digital-piano" role="group" aria-label="Digital piano keyboard">
      {Array.from({ length: octaveCount }, (_, offset) => {
        const octave = startOctave + offset;
        return (
          <div key={octave} className="digital-piano__octave" data-octave={octave}>
            {notes.filter((note) => note.endsWith(String(octave))).map((note, index) => {
              const pitch = pitchClass(note);
              const isBlack = !WHITE_NOTES.has(pitch);
              const isActive = activeSet.has(note);
              const isTarget = targetSet.has(exactTargetNotes ? note : pitch);
              const isNext = nextNote === note;
              const isMistake = mistakeNote === note;
              const qwertyKey = octave === qwertyOctave ? QWERTY_KEYS[index] : undefined;
              const state = [
                isActive && "active",
                isTarget && "target",
                isNext && "next",
                isMistake && "mistake"
              ].filter(Boolean).join(" ") || "idle";
              const style = { "--key-position": keyPosition(note) } as CSSProperties;

              return (
                <button
                  key={note}
                  type="button"
                  className={[
                    "digital-piano__key",
                    isBlack ? "digital-piano__key--black" : "digital-piano__key--white",
                    isActive && "is-active",
                    isTarget && "is-target",
                    isNext && "is-next",
                    isMistake && "is-mistake"
                  ].filter(Boolean).join(" ")}
                  style={style}
                  data-note={note}
                  data-key-position={keyPosition(note)}
                  data-state={state}
                  data-active={isActive}
                  data-target={isTarget}
                  data-next={isNext}
                  data-mistake={isMistake}
                  aria-label={note}
                  aria-pressed={isActive}
                  onPointerDown={(event) => handlePointerDown(event, note)}
                  onPointerUp={(event) => release(note, event.pointerId)}
                  onPointerCancel={(event) => release(note, event.pointerId)}
                  onLostPointerCapture={(event) => release(note, event.pointerId)}
                  onKeyDown={(event) => handleKeyDown(event, note)}
                  onKeyUp={handleKeyUp}
                >
                  {noteLabels ? <span>{pitch}</span> : null}
                  {qwertyKey ? <kbd>{qwertyKey.toUpperCase()}</kbd> : null}
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
