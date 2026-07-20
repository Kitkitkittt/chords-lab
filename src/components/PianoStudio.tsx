import { useRef, useState } from "react";
import { DigitalPiano } from "./DigitalPiano";
import { PianoChordQuest } from "./PianoChordQuest";
import { PianoFallingNotes } from "./PianoFallingNotes";
import { PianoProgressionJam } from "./PianoProgressionJam";
import { usePianoInput } from "../hooks/usePianoInput";
import { progressionSymbolsToNumerals } from "../lib/pianoPerformance";

type StudioMode = "chord-quest" | "falling-notes" | "progression-jam";

type CompletionDetail = {
  id: string;
  expected: string[];
  selected: string[];
  question: string;
};

type PianoStudioProps = {
  audioEnabled: boolean;
  reducedMotion: boolean;
  onComplete: (mode: StudioMode, detail: CompletionDetail) => void;
  onSendProgression: (numerals: string[]) => void;
};

const MODES: { id: StudioMode; label: string; summary: string }[] = [
  { id: "chord-quest", label: "Chord Quest", summary: "Build chords and explore inversions." },
  { id: "falling-notes", label: "Falling Notes", summary: "Practice scales, melodies, and note recognition." },
  { id: "progression-jam", label: "Progression Jam", summary: "Connect chords at your own pace or with a groove." }
];

export function PianoStudio({
  audioEnabled,
  reducedMotion,
  onComplete,
  onSendProgression
}: PianoStudioProps) {
  const [mode, setMode] = useState<StudioMode>("chord-quest");
  const [targetNotes, setTargetNotes] = useState<string[]>([]);
  const [lastPlayed, setLastPlayed] = useState<{ note: string; id: number } | null>(null);
  const playedId = useRef(0);
  const piano = usePianoInput({
    audioEnabled,
    onNoteOn: (note) => {
      playedId.current += 1;
      setLastPlayed({ note, id: playedId.current });
    }
  });
  const startOctave = Math.min(5, Math.max(1, piano.octave - 1));
  const selectedMode = MODES.find(({ id }) => id === mode) ?? MODES[0];

  function chooseMode(nextMode: StudioMode) {
    piano.releaseAll();
    setTargetNotes([]);
    setLastPlayed(null);
    setMode(nextMode);
  }

  return (
    <section className="piano-studio" aria-labelledby="piano-studio-title">
      <header className="piano-studio__header">
        <div>
          <span className="eyebrow">Digital Piano Studio</span>
          <h2 id="piano-studio-title">One piano, three ways to practice</h2>
          <p>{selectedMode.summary} No timer, lives, or forced playback.</p>
        </div>
        <div className="piano-studio__transport" aria-label="Piano controls">
          <button type="button" onClick={() => piano.shiftOctave(-1)} aria-label="Shift octave down">Z −</button>
          <strong>QWERTY octave {piano.octave}</strong>
          <button type="button" onClick={() => piano.shiftOctave(1)} aria-label="Shift octave up">X +</button>
          <button type="button" onClick={piano.releaseAll}>Panic</button>
        </div>
      </header>

      <div className="piano-studio__modes" role="tablist" aria-label="Piano studio mode">
        {MODES.map((choice) => (
          <button
            key={choice.id}
            type="button"
            role="tab"
            aria-selected={mode === choice.id}
            aria-controls={`piano-mode-${choice.id}`}
            onClick={() => chooseMode(choice.id)}
          >
            {choice.label}
          </button>
        ))}
      </div>

      <div
        className="piano-studio__keybed"
        tabIndex={0}
        aria-label="Piano input area. Use A through J to play, Z and X to shift octave, and Space for sustain."
        {...piano.keyboardHandlers}
      >
        <DigitalPiano
          activeNotes={piano.activeNotes}
          targetNotes={targetNotes}
          nextNote={mode === "falling-notes" ? targetNotes[0] : null}
          startOctave={startOctave}
          qwertyOctave={piano.octave}
          latch={mode !== "falling-notes"}
          noteLabels
          onNoteOn={piano.noteOn}
          onNoteOff={piano.noteOff}
          onToggle={piano.toggleNote}
        />
        <div className="piano-studio__input-status" aria-live="polite">
          <span>{piano.activeNotes.length > 0 ? `Playing: ${piano.activeNotes.join(", ")}` : "Keys ready"}</span>
          <span>{piano.sustain ? "Sustain on" : "Sustain off"}</span>
          <label>
            <input
              type="checkbox"
              checked={piano.keyboardEnabled}
              onChange={(event) => piano.setKeyboardEnabled(event.currentTarget.checked)}
            />
            QWERTY input
          </label>
          {piano.midi.isSupported ? (
            <button
              type="button"
              onClick={piano.midi.status === "connected" ? piano.midi.disconnect : piano.midi.connect}
            >
              {piano.midi.status === "connected" ? "Disconnect MIDI" : piano.midi.status === "connecting" ? "Connecting MIDI…" : "Connect MIDI"}
            </button>
          ) : <span>Web MIDI unavailable</span>}
        </div>
      </div>

      <div className="piano-studio__activity" id={`piano-mode-${mode}`} role="tabpanel">
        {mode === "chord-quest" ? (
          <PianoChordQuest
            activeNotes={piano.activeNotes}
            audioEnabled={audioEnabled}
            onTargetNotesChange={setTargetNotes}
            onReleaseAll={piano.releaseAll}
            onComplete={(detail) => onComplete(mode, detail)}
          />
        ) : mode === "falling-notes" ? (
          <PianoFallingNotes
            lastPlayed={lastPlayed}
            audioEnabled={audioEnabled}
            reducedMotion={reducedMotion}
            onTargetNotesChange={setTargetNotes}
            onReleaseAll={piano.releaseAll}
            onComplete={(detail) => onComplete(mode, detail)}
          />
        ) : (
          <PianoProgressionJam
            activeNotes={piano.activeNotes}
            audioEnabled={audioEnabled}
            onTargetNotesChange={setTargetNotes}
            onReleaseAll={piano.releaseAll}
            onComplete={(detail) => onComplete(mode, detail)}
            onSendProgression={(symbols) => onSendProgression(progressionSymbolsToNumerals(symbols))}
          />
        )}
      </div>
    </section>
  );
}
