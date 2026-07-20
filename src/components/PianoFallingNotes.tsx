import { useEffect, useRef, useState } from "react";
import { playSequence } from "../lib/audioEngine";
import { evaluatePianoSequence } from "../lib/pianoPerformance";

type Props = {
  lastPlayed: { note: string; id: number } | null;
  audioEnabled: boolean;
  reducedMotion: boolean;
  onTargetNotesChange: (notes: string[]) => void;
  onReleaseAll: () => void;
  onComplete: (detail: { id: string; expected: string[]; selected: string[]; question: string }) => void;
};

type Sequence = { id: string; label: string; question: string; notes: string[] };

const SEQUENCES: Sequence[] = [
  {
    id: "c-major",
    label: "C major ascending",
    question: "Play C major ascending.",
    notes: ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5"]
  },
  {
    id: "a-natural-minor",
    label: "A natural minor ascending",
    question: "Play A natural minor ascending.",
    notes: ["A3", "B3", "C4", "D4", "E4", "F4", "G4", "A4"]
  },
  {
    id: "melody",
    label: "Short melody",
    question: "Play the short melody.",
    notes: ["C4", "E4", "G4", "E4", "D4", "C4"]
  }
];

export function PianoFallingNotes({
  lastPlayed,
  audioEnabled,
  reducedMotion,
  onTargetNotesChange,
  onReleaseAll,
  onComplete
}: Props) {
  const [sequenceId, setSequenceId] = useState("c-major");
  const [mode, setMode] = useState<"step" | "beat">("step");
  const [tempo, setTempo] = useState(60);
  const [index, setIndex] = useState(0);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState("Play the current note.");
  const [summary, setSummary] = useState({ correct: 0, missed: 0 });
  const [retry, setRetry] = useState(false);
  const sequence = SEQUENCES.find(({ id }) => id === sequenceId) ?? SEQUENCES[0];
  const sequenceRef = useRef(sequence);
  const indexRef = useRef(0);
  const selectedRef = useRef<string[]>([]);
  const beatHitRef = useRef(false);
  const handledIdRef = useRef<number | null>(null);
  const completeRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  const onReleaseAllRef = useRef(onReleaseAll);
  sequenceRef.current = sequence;
  onCompleteRef.current = onComplete;
  onReleaseAllRef.current = onReleaseAll;

  const reset = (nextSequence = sequence) => {
    onReleaseAll();
    indexRef.current = 0;
    selectedRef.current = [];
    beatHitRef.current = false;
    completeRef.current = false;
    setIndex(0);
    setRunning(false);
    setStatus(nextSequence.question);
    setSummary({ correct: 0, missed: 0 });
    setRetry(false);
  };

  useEffect(() => {
    const target = retry ? null : sequence.notes[index];
    onTargetNotesChange(target ? [target] : []);
  }, [index, onTargetNotesChange, retry, sequence]);

  useEffect(() => () => onReleaseAllRef.current(), []);

  useEffect(() => {
    if (!running) {
      return;
    }
    const timer = window.setInterval(() => {
      const current = sequenceRef.current;
      const currentIndex = indexRef.current;
      const expected = current.notes[currentIndex];
      const matched = beatHitRef.current;
      if (!matched) {
        setStatus(`Missed ${expected}.`);
        setSummary((value) => ({ ...value, missed: value.missed + 1 }));
      }
      const nextIndex = currentIndex + 1;
      if (nextIndex === current.notes.length) {
        setRunning(false);
        if (matched && selectedRef.current.length === current.notes.length && !completeRef.current) {
          completeRef.current = true;
          onCompleteRef.current({
            id: current.id,
            expected: current.notes,
            selected: selectedRef.current,
            question: current.question
          });
          setStatus("Sequence complete.");
        } else {
          setRetry(true);
          setStatus("Sequence finished with misses. Try again.");
        }
        return;
      }
      indexRef.current = nextIndex;
      beatHitRef.current = false;
      setIndex(nextIndex);
    }, 60000 / tempo);
    return () => window.clearInterval(timer);
  }, [running, tempo]);

  useEffect(() => {
    if (!lastPlayed || handledIdRef.current === lastPlayed.id || retry) {
      return;
    }
    handledIdRef.current = lastPlayed.id;
    const current = sequenceRef.current;
    const expected = current.notes[indexRef.current];
    if (mode === "step") {
      const result = evaluatePianoSequence(current.notes, [...selectedRef.current, lastPlayed.note]);
      if (result.mistake) {
        setStatus(`Wrong note: ${result.mistake}. Try ${expected}.`);
        setSummary((value) => ({ ...value, missed: value.missed + 1 }));
        return;
      }
      selectedRef.current = [...selectedRef.current, lastPlayed.note];
      setSummary((value) => ({ ...value, correct: value.correct + 1 }));
      if (result.complete && !completeRef.current) {
        completeRef.current = true;
        setRetry(true);
        setStatus("Sequence complete.");
        onComplete({ id: current.id, expected: current.notes, selected: selectedRef.current, question: current.question });
        return;
      }
      indexRef.current += 1;
      setIndex(indexRef.current);
      setStatus(`Correct. Next: ${current.notes[indexRef.current]}.`);
      return;
    }
    if (!running || beatHitRef.current) {
      return;
    }
    if (evaluatePianoSequence([expected], [lastPlayed.note]).complete) {
      beatHitRef.current = true;
      selectedRef.current = [...selectedRef.current, lastPlayed.note];
      setSummary((value) => ({ ...value, correct: value.correct + 1 }));
      setStatus(`Matched ${expected}.`);
    } else {
      setStatus(`Wrong note: ${lastPlayed.note}. Try ${expected}.`);
    }
  }, [lastPlayed, mode, onComplete, retry, running]);

  const chooseSequence = (id: string) => {
    const next = SEQUENCES.find((item) => item.id === id) ?? SEQUENCES[0];
    setSequenceId(next.id);
    reset(next);
  };
  const chooseMode = (nextMode: "step" | "beat") => {
    setMode(nextMode);
    reset();
  };
  const stop = () => {
    onReleaseAll();
    reset();
    setStatus("Stopped.");
  };
  const current = sequence.notes[index];

  return (
    <section aria-labelledby="piano-falling-notes-title">
      <h2 id="piano-falling-notes-title">Falling Notes</h2>
      <label>
        Sequence
        <select value={sequenceId} onChange={(event) => chooseSequence(event.currentTarget.value)}>
          {SEQUENCES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
      </label>
      <fieldset>
        <legend>Mode</legend>
        <label><input type="radio" checked={mode === "step"} onChange={() => chooseMode("step")} />Step</label>
        <label><input type="radio" checked={mode === "beat"} onChange={() => chooseMode("beat")} />Beat</label>
      </fieldset>
      {mode === "beat" && <label>
        Tempo
        <select value={tempo} onChange={(event) => setTempo(Number(event.currentTarget.value))}>
          {[60, 80, 100].map((value) => <option key={value} value={value}>{value} BPM</option>)}
        </select>
      </label>}
      <button type="button" onClick={() => void playSequence("Piano falling notes", sequence.notes, { audioEnabled })}>Hear sequence</button>
      {mode === "beat" && <>
        <button type="button" onClick={() => setRunning((value) => !value)}>{running ? "Pause" : "Start"}</button>
        <button type="button" onClick={stop}>Stop</button>
      </>}
      {retry && <button type="button" onClick={() => reset()}>Try again</button>}
      <div
        className={reducedMotion ? "falling-notes-lane" : "falling-notes-lane falling-notes--falling"}
        data-motion={reducedMotion ? "reduced" : "falling"}
        data-testid="falling-notes-lane"
      >
        <p>Current: {current ?? "Complete"}</p>
        <ol>
          {sequence.notes.slice(index).map((note, offset) => (
            <li key={`${note}-${index + offset}`} className={offset === 0 ? "is-current" : "is-upcoming"} data-state={offset === 0 ? "current" : "upcoming"}>{note}</li>
          ))}
        </ol>
      </div>
      <p role="status" aria-live="polite">{status}</p>
      <p>Correct: {summary.correct} Missed: {summary.missed}</p>
    </section>
  );
}
