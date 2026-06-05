import { Headphones, Layers3, Music2, Play, Rows3, Waypoints } from "lucide-react";
import { useEffect, useState } from "react";
import {
  DrumPadWorkbench,
  FretboardWorkbench,
  InteractivePianoWorkbench,
  VoiceRangeWorkbench
} from "./InstrumentWorkbenches";
import {
  audioPlaybackLabel,
  playSequence,
  playRhythm,
  stopAudioPlayback
} from "../lib/audioEngine";
import type { AudioPlaybackState } from "../lib/audioEngine";
import { instrumentsById } from "../lib/instruments";
import {
  calculateTapTempo,
  describeChordStack,
  quantizeBeatPosition
} from "../lib/interactionTools";
import type { PracticePrompt, PracticeRenderSpec } from "../lib/practiceEngine";
import { validateRhythmMeasure } from "../lib/practiceTemplates";

type PracticeWorkbenchProps = {
  prompt: PracticePrompt;
  selected: string[];
  selectedSet: Set<string>;
  choose: (value: string) => void;
  replaceSelected: (index: number, value: string) => void;
  removeSelectedAt: (index: number) => void;
  undoSelected: () => void;
  clearSelected: () => void;
  disabled: boolean;
  audioEnabled: boolean;
};

function staffPositionsFromSpec(renderSpec: PracticeRenderSpec | undefined) {
  return renderSpec?.type === "staff" && renderSpec.positions
    ? renderSpec.positions
    : [];
}

function StaffCanvasWorkbench({
  prompt,
  selectedSet,
  choose,
  disabled,
  audioEnabled
}: PracticeWorkbenchProps) {
  const [status, setStatus] = useState<AudioPlaybackState>("idle");
  const positions = staffPositionsFromSpec(prompt.renderSpec);
  const choices = positions.length > 0
    ? positions
    : prompt.choices.map((choice, index) => ({
        note: choice,
        label: choice,
        step: index,
        clef: prompt.clef ?? "treble"
      }));
  const clefs = Array.from(new Set(choices.map((position) => position.clef)));
  const defaultClef = prompt.clef ?? clefs[0] ?? "treble";
  const [visibleClef, setVisibleClef] = useState(defaultClef);
  const visibleChoices = choices.filter((position) => position.clef === visibleClef);

  useEffect(() => {
    setVisibleClef(defaultClef);
  }, [defaultClef]);

  async function selectPosition(note: string) {
    choose(note);

    if (!disabled) {
      await playSequence(`Preview ${note}`, [note], {
        audioEnabled,
        onStateChange: setStatus
      });
    }
  }

  return (
    <section className="direct-workbench" aria-labelledby="staff-builder-title">
      <div className="direct-workbench__header">
        <Music2 size={18} aria-hidden="true" />
        <div>
          <h3 id="staff-builder-title">Staff Canvas</h3>
          <p>Choose the written position. The text buttons are the keyboard fallback.</p>
        </div>
      </div>
      <div className="staff-clef-toggle" aria-label="Clef">
        {clefs.map((clef) => (
          <button
            key={clef}
            type="button"
            aria-pressed={visibleClef === clef}
            disabled={disabled}
            onClick={() => setVisibleClef(clef)}
          >
            {clef}
          </button>
        ))}
      </div>
      <div className="staff-click-board" aria-label="Staff positions">
        <span className="staff-click-board__label">ledger</span>
        {visibleChoices.map((position) => (
          <button
            key={`${position.clef}-${position.note}`}
            type="button"
            style={{ gridRow: `${(position.step % 6) + 1}` }}
            aria-pressed={selectedSet.has(position.note)}
            disabled={disabled}
            onClick={() => selectPosition(position.note)}
          >
            <span>{position.label}</span>
          </button>
        ))}
      </div>
      <div className="workbench-readout" aria-live="polite">
        {Array.from(selectedSet)[0]
          ? `You selected ${Array.from(selectedSet)[0]}.`
          : "No staff position selected yet."}
        <span>{visibleClef} clef</span>
        <span>{audioPlaybackLabel(status)}</span>
      </div>
    </section>
  );
}

function tokenChoices(prompt: PracticePrompt) {
  if (prompt.renderSpec?.type === "rhythm" && prompt.renderSpec.tokens) {
    return prompt.renderSpec.tokens.filter((token) =>
      prompt.choices.includes(token.value)
    );
  }

  return prompt.choices.map((choice) => ({
    value: choice,
    label: choice,
    beats: choice === "hit" || choice === "rest" ? 1 : 0
  }));
}

function RhythmComposerWorkbench({
  prompt,
  selected,
  selectedSet,
  choose,
  removeSelectedAt,
  undoSelected,
  clearSelected,
  disabled,
  audioEnabled
}: PracticeWorkbenchProps) {
  const [status, setStatus] = useState<AudioPlaybackState>("idle");
  const [playbackCursor, setPlaybackCursor] = useState(-1);
  const [tapTimes, setTapTimes] = useState<number[]>([]);
  const targetBeats =
    prompt.renderSpec?.type === "rhythm" ? prompt.renderSpec.targetBeats ?? 4 : 4;
  const meter =
    prompt.renderSpec?.type === "rhythm"
      ? prompt.renderSpec.meter ?? prompt.timeSignature ?? "4/4"
      : prompt.timeSignature ?? "4/4";
  const measure = validateRhythmMeasure(selected, targetBeats);
  const choices = tokenChoices(prompt);
  const tappedBpm = calculateTapTempo(tapTimes);
  const quantizedBeat = quantizeBeatPosition(selected.length * 0.5, 0.5);

  useEffect(() => {
    setStatus("idle");
    setPlaybackCursor(-1);
    return () => stopAudioPlayback();
  }, [prompt.id]);

  async function playSelectedRhythm() {
    if (status === "playing" || status === "loading") {
      stopAudioPlayback((state) => {
        setStatus(state);
        setPlaybackCursor(-1);
      });
      return;
    }

    setPlaybackCursor(-1);
    await playRhythm("Rhythm composer", selected, {
      audioEnabled,
      onStateChange: (state) => {
        setStatus(state);
        if (state !== "playing" && state !== "loading") {
          setPlaybackCursor(-1);
        }
      },
      onEvent: (_, index) => setPlaybackCursor(index)
    });
  }

  function tapTempo() {
    setTapTimes((current) => [...current.slice(-5), Date.now()]);
  }

  return (
    <section className="direct-workbench" aria-labelledby="rhythm-composer-title">
      <div className="direct-workbench__header">
        <Rows3 size={18} aria-hidden="true" />
        <div>
          <h3 id="rhythm-composer-title">Rhythm Composer</h3>
          <p>
            {meter} target: {targetBeats} beat{targetBeats === 1 ? "" : "s"}.
            Current total: {measure.totalBeats.toFixed(2)}.
          </p>
        </div>
      </div>
      <div className="rhythm-token-row" aria-label="Rhythm tokens">
        {choices.map((token) => (
          <button
            key={token.value}
            type="button"
            aria-pressed={selectedSet.has(token.value)}
            disabled={disabled}
            onClick={() => choose(token.value)}
          >
            <strong>{token.label}</strong>
            <span>{token.beats} beat{token.beats === 1 ? "" : "s"}</span>
          </button>
        ))}
      </div>
      <div className="tap-tempo-strip">
        <button type="button" className="button button--quiet" onClick={tapTempo}>
          Tap tempo
        </button>
        <strong>{tappedBpm ? `${tappedBpm} BPM` : "Tap twice"}</strong>
        <span>Next grid point: beat {quantizedBeat.toFixed(1)}</span>
      </div>
      <div className="rhythm-builder-strip" aria-label="Selected rhythm tokens">
        {selected.length > 0 ? (
          selected.map((token, index) => (
            <button
              key={`${token}-${index}`}
              type="button"
              className={playbackCursor === index ? "is-playing" : ""}
              disabled={disabled}
              onClick={() => removeSelectedAt(index)}
            >
              {index + 1}. {token}
            </button>
          ))
        ) : (
          <span>Select rhythm tokens.</span>
        )}
      </div>
      <div className={measure.totalBeats > targetBeats ? "workbench-readout is-warning" : "workbench-readout"} aria-live="polite">
        {selected.length > 0 ? selected.join(" + ") : "Select rhythm tokens."}
        {selected.length > 0 ? (
          <span>
            {measure.valid
              ? "Measure filled"
              : measure.totalBeats > targetBeats
                ? "Measure overfilled"
                : "Keep building"}
          </span>
        ) : null}
      </div>
      <div className="workbench-tools">
        <button type="button" className="button button--quiet" disabled={selected.length === 0 || disabled} onClick={undoSelected}>
          Undo
        </button>
        <button type="button" className="button button--quiet" disabled={selected.length === 0 || disabled} onClick={clearSelected}>
          Clear
        </button>
      </div>
      <button
        className="button button--secondary"
        type="button"
        disabled={selected.length === 0}
        onClick={playSelectedRhythm}
      >
        <Play size={17} aria-hidden="true" />
        {status === "playing" || status === "loading" ? "Stop rhythm" : "Play rhythm"}
      </button>
      <p className="lab-status" role="status">
        {audioPlaybackLabel(status)}
      </p>
    </section>
  );
}

const romanChordSymbols: Record<string, Record<string, string>> = {
  C: { I: "C", ii: "Dm", iii: "Em", IV: "F", V: "G", vi: "Am", "vii°": "Bdim" },
  G: { I: "G", ii: "Am", iii: "Bm", IV: "C", V: "D", vi: "Em", "vii°": "F#dim" },
  F: { I: "F", ii: "Gm", iii: "Am", IV: "Bb", V: "C", vi: "Dm", "vii°": "Edim" },
  D: { I: "D", ii: "Em", iii: "F#m", IV: "G", V: "A", vi: "Bm", "vii°": "C#dim" },
  A: { I: "A", ii: "Bm", iii: "C#m", IV: "D", V: "E", vi: "F#m", "vii°": "G#dim" }
};

function PianoRollWorkbench({
  prompt,
  selected,
  selectedSet,
  choose,
  removeSelectedAt,
  disabled
}: PracticeWorkbenchProps) {
  const [autoCorrect, setAutoCorrect] = useState(false);
  const warnings =
    prompt.renderSpec?.type === "keyboard"
      ? prompt.renderSpec.enharmonicWarnings ?? []
      : [];
  const mode = prompt.renderSpec?.type === "keyboard" ? prompt.renderSpec.mode : "free";
  const targetNotes =
    prompt.renderSpec?.type === "keyboard"
      ? new Set(prompt.renderSpec.notes)
      : new Set(prompt.answer);
  const selectedOffScale = selected.filter((note) => !targetNotes.has(note));
  const chordDescription =
    mode === "chord" || prompt.kind === "chord-builder"
      ? describeChordStack(selected)
      : undefined;
  const chordLabel = chordDescription?.label;
  const chordQuality =
    chordDescription && chordDescription.quality && chordDescription.cardinality
      ? `${chordDescription.quality} ${chordDescription.cardinality}`
      : undefined;

  return (
    <section className="direct-workbench" aria-labelledby="piano-roll-title">
      <div className="direct-workbench__header">
        <Layers3 size={18} aria-hidden="true" />
        <div>
          <h3 id="piano-roll-title">Scale and Chord Piano Roll</h3>
          <p>Toggle notes for chords, or press scale notes in order.</p>
        </div>
      </div>
      {mode === "scale" ? (
        <div className="auto-correct-toggle">
          <button
            type="button"
            aria-pressed={autoCorrect}
            onClick={() => setAutoCorrect((current) => !current)}
          >
            Auto-Correct
          </button>
          <span>
            {autoCorrect
              ? "Scale tones are highlighted; off-scale selections stay visible."
              : "Turn on to mark scale tones before checking."}
          </span>
        </div>
      ) : null}
      <div className="piano-roll-builder" aria-label="Piano roll choices">
        {prompt.choices.map((choice) => (
          <button
            key={choice}
            type="button"
            className={[
              choice.includes("#") || choice.includes("b") ? "is-black" : "",
              autoCorrect && targetNotes.has(choice) ? "is-scale-tone" : "",
              autoCorrect && selectedSet.has(choice) && !targetNotes.has(choice)
                ? "is-off-scale"
                : ""
            ]
              .filter(Boolean)
              .join(" ")}
            aria-pressed={selectedSet.has(choice)}
            disabled={disabled}
            onClick={() => choose(choice)}
          >
            {choice}
          </button>
        ))}
      </div>
      <div className="piano-roll-lanes" aria-label="Selected note order">
        {selected.length > 0 ? (
          selected.map((note, index) => (
            <button
              key={`${note}-${index}`}
              type="button"
              disabled={disabled}
              onClick={() => removeSelectedAt(index)}
            >
              <span>{index + 1}</span>
              <strong>{note}</strong>
              <em>{index === 0 && prompt.question.includes("/") ? "bass" : "tone"}</em>
            </button>
          ))
        ) : (
          <span>No notes selected yet.</span>
        )}
      </div>
      <div className="workbench-readout" aria-live="polite">
        {selected.length > 0 ? selected.join(" ") : "No notes selected yet."}
        {chordLabel ? <span>Detected: {chordLabel}</span> : null}
        {chordQuality ? <span>Quality: {chordQuality}</span> : null}
        {selectedOffScale.length > 0 && autoCorrect ? (
          <span>Off scale: {selectedOffScale.join(" ")}</span>
        ) : null}
        {warnings.map((warning) => (
          <span key={warning}>{warning}</span>
        ))}
      </div>
    </section>
  );
}

function HarmonyBoardWorkbench({
  prompt,
  selected,
  selectedSet,
  choose,
  replaceSelected,
  disabled
}: PracticeWorkbenchProps) {
  const isAnalysis = prompt.inputMode === "analysis-board";
  const [activeSlot, setActiveSlot] = useState(0);
  const slots =
    prompt.renderSpec?.type === "harmony" && prompt.renderSpec.slots
      ? prompt.renderSpec.slots
      : prompt.answer.map((_, index) => `Slot ${index + 1}`);
  const keyName = prompt.renderSpec?.type === "harmony" ? prompt.renderSpec.key : "C";
  const chordSymbols = romanChordSymbols[keyName] ?? romanChordSymbols.C;

  return (
    <section className="direct-workbench" aria-labelledby="harmony-board-title">
      <div className="direct-workbench__header">
        {isAnalysis ? (
          <Headphones size={18} aria-hidden="true" />
        ) : (
          <Waypoints size={18} aria-hidden="true" />
        )}
        <div>
          <h3 id="harmony-board-title">
            {isAnalysis ? "Analysis Board" : "Harmony Board"}
          </h3>
          <p>
            {isAnalysis
              ? "Label the musical role of each short excerpt area."
              : "Place Roman numerals into the progression slots."}
          </p>
        </div>
      </div>
      <div className="harmony-slots" aria-label="Harmony slots">
        {slots.map((slot, index) => (
          <button
            key={`${slot}-${index}`}
            type="button"
            className={activeSlot === index ? "is-active" : ""}
            disabled={disabled}
            onClick={() => setActiveSlot(index)}
          >
            {slot}
            <strong>{selected[index] ?? "..."}</strong>
            {!isAnalysis && selected[index] ? (
              <em>{chordSymbols[selected[index]] ?? selected[index]}</em>
            ) : null}
          </button>
        ))}
      </div>
      <div className="rhythm-token-row" aria-label="Harmony choices">
        {prompt.choices.map((choice) => (
          <button
            key={choice}
            type="button"
            aria-pressed={selectedSet.has(choice)}
            disabled={disabled}
            onClick={() => {
              if (activeSlot < selected.length || selected.length >= prompt.answer.length) {
                replaceSelected(activeSlot, choice);
              } else {
                choose(choice);
              }
              setActiveSlot((current) =>
                Math.min(current + 1, Math.max(0, prompt.answer.length - 1))
              );
            }}
          >
            <strong>{choice}</strong>
            <span>{isAnalysis ? "label" : "function"}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function InstrumentPromptWorkbench({
  prompt,
  selected,
  choose,
  disabled,
  audioEnabled
}: PracticeWorkbenchProps) {
  const [status, setStatus] = useState<AudioPlaybackState>("idle");

  if (prompt.renderSpec?.type !== "instrument") {
    return null;
  }

  const profile = instrumentsById.get(prompt.renderSpec.instrumentId);

  if (!profile) {
    return null;
  }

  async function playReference() {
    if (status === "playing" || status === "loading") {
      stopAudioPlayback(setStatus);
      return;
    }

    await playSequence(prompt.question, prompt.audioNotes ?? [], {
      audioEnabled,
      onStateChange: setStatus
    });
  }

  if (
    (prompt.renderSpec.instrumentId === "guitar" ||
      prompt.renderSpec.instrumentId === "bass" ||
      prompt.renderSpec.instrumentId === "ukulele") &&
    profile.tuning
  ) {
    return (
      <FretboardWorkbench
        instrumentId={prompt.renderSpec.instrumentId}
        title={`${profile.title} application`}
        tuning={profile.tuning}
        activeNotes={prompt.renderSpec.highlightedNotes}
        chordShape={prompt.renderSpec.chordShape}
      />
    );
  }

  if (prompt.renderSpec.instrumentId === "drums") {
    const rhythm = prompt.renderSpec.rhythmPattern ?? ["hit", "rest", "hit", "rest"];
    const pattern = [
      rhythm.map((token) => token === "hit"),
      rhythm.map((_, index) => index === 1 || index === 3),
      rhythm.map(() => true),
      rhythm.map(() => false)
    ];

    return (
      <DrumPadWorkbench
        pattern={pattern}
        onToggle={(_, step) => {
          if (!disabled) {
            choose(rhythm[step] === "hit" ? "rest" : "hit");
          }
        }}
      />
    );
  }

  if (prompt.renderSpec.instrumentId === "voice") {
    return (
      <VoiceRangeWorkbench
        activeNotes={prompt.renderSpec.highlightedNotes}
        onPlay={playReference}
      />
    );
  }

  return (
    <>
      <InteractivePianoWorkbench
        label={`${profile.title} application`}
        highlights={
          prompt.renderSpec.degreeLabels ?? prompt.renderSpec.scalePattern ?? []
        }
        bassNote={prompt.renderSpec.highlightedNotes[0]}
        selectedNotes={selected.length > 0 ? selected : prompt.renderSpec.highlightedNotes}
      />
      <p className="lab-status" role="status">
        {audioPlaybackLabel(status)}
      </p>
    </>
  );
}

export function DirectPracticeWorkbench(props: PracticeWorkbenchProps) {
  if (props.prompt.inputMode === "staff-click") {
    return <StaffCanvasWorkbench {...props} />;
  }

  if (props.prompt.inputMode === "rhythm-grid") {
    return <RhythmComposerWorkbench {...props} />;
  }

  if (
    props.prompt.inputMode === "piano-roll" ||
    props.prompt.inputMode === "sequence"
  ) {
    return <PianoRollWorkbench {...props} />;
  }

  if (
    props.prompt.inputMode === "harmony-board" ||
    props.prompt.inputMode === "analysis-board"
  ) {
    return <HarmonyBoardWorkbench {...props} />;
  }

  if (
    props.prompt.inputMode === "instrument-board" ||
    props.prompt.inputMode === "fretboard" ||
    props.prompt.inputMode === "drum-pad" ||
    props.prompt.inputMode === "voice-range" ||
    props.prompt.inputMode === "song-arranger"
  ) {
    return <InstrumentPromptWorkbench {...props} />;
  }

  return null;
}
