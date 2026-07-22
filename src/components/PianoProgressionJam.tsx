import { useEffect, useMemo, useRef, useState } from "react";
import { playLoop, stopLoop, type PlaybackPattern } from "../lib/audioEngine";
import {
  bandLayerCount,
  evaluatePianoChord,
  pianoMaterialForKey,
  progressionChordNotes
} from "../lib/pianoPerformance";

type Progression = { id: string; symbols: string[] };
type PianoProgressionJamProps = {
  activeNotes: string[];
  audioEnabled: boolean;
  tonic?: string;
  onTargetNotesChange: (notes: string[]) => void;
  onReleaseAll: () => void;
  onComplete: (detail: {
    id: string;
    expected: string[];
    selected: string[];
    question: string;
    isCorrect: boolean;
  }) => void;
  onSendProgression: (symbols: string[]) => void;
};

function progressionsForKey(tonic: string): Progression[] {
  return pianoMaterialForKey(tonic).progressions.map((symbols) => ({
    id: symbols.join("-").toLowerCase(),
    symbols
  }));
}

function label(symbols: string[]) {
  return symbols.join(" – ");
}

function groovePattern(symbols: string[], notes: string[][], completedBars: number): PlaybackPattern {
  const layers = bandLayerCount(completedBars);
  const events = symbols.flatMap((_, index) => {
    const startBeat = index * 4;
    const root = notes[index]?.[0] ?? "C4";
    const bass = `${root.replace(/[0-9]/g, "")}2`;
    return [
      { note: "C2", startBeat, durationBeats: 0.12, track: "drums", voice: "kick" as const },
      { note: "C2", startBeat: startBeat + 2, durationBeats: 0.12, track: "drums", voice: "kick" as const },
       ...(layers > 0 ? [{ note: bass, startBeat, durationBeats: 1, track: "bass" }] : []),
       ...(layers > 1 ? [{ note: notes[index], startBeat, durationBeats: 4, track: "pad" }] : [])
    ];
  });
  return { label: `${label(symbols)} groove`, bpm: 88, meter: "4/4", mode: "song", events };
}

export function PianoProgressionJam({
  activeNotes,
  audioEnabled,
  tonic = "C",
  onTargetNotesChange,
  onReleaseAll,
  onComplete,
  onSendProgression
}: PianoProgressionJamProps) {
  const progressions = useMemo(() => progressionsForKey(tonic), [tonic]);
  const [progression, setProgression] = useState(() => progressions[0]);
  const [mode, setMode] = useState<"untimed" | "groove">("untimed");
  const [targetIndex, setTargetIndex] = useState(0);
  const [completedBars, setCompletedBars] = useState(0);
  const [missedBars, setMissedBars] = useState(0);
  const [message, setMessage] = useState("");
  const [grooveRunning, setGrooveRunning] = useState(false);
  const completed = useRef(false);
  const failureRecorded = useRef(false);
  const barStarted = useRef(false);
  const barMatched = useRef(false);
  const cycle = useRef<boolean[]>([]);
  const targetIndexRef = useRef(0);
  const sessionRef = useRef(0);
  const completionRef = useRef({ progression, expected: [] as string[], activeNotes: [] as string[] });
  const targets = useMemo(() => progressionChordNotes(progression.symbols), [progression]);
  const expected = useMemo(() => targets[targetIndex] ?? [], [targetIndex, targets]);
  const evaluation = useMemo(
    () => evaluatePianoChord(expected, activeNotes),
    [activeNotes, expected]
  );

  useEffect(() => {
    targetIndexRef.current = targetIndex;
    completionRef.current = { progression, expected, activeNotes };
    onTargetNotesChange(expected);
  }, [activeNotes, expected, onTargetNotesChange, progression, targetIndex]);

  useEffect(() => {
    if (mode === "groove" && grooveRunning && evaluation.complete) {
      barMatched.current = true;
    }
  }, [evaluation.complete, grooveRunning, mode]);

  useEffect(() => () => {
    sessionRef.current += 1;
    stopLoop();
  }, []);

  function reset(nextMode = mode) {
    sessionRef.current += 1;
    stopLoop();
    onReleaseAll();
     completed.current = false;
     failureRecorded.current = false;
     barStarted.current = false;
    barMatched.current = false;
    cycle.current = [];
    targetIndexRef.current = 0;
    setMode(nextMode);
    setTargetIndex(0);
    setCompletedBars(0);
    setMissedBars(0);
    setMessage("");
    setGrooveRunning(false);
  }

  function finish() {
    if (completed.current) {
      return;
    }

    completed.current = true;
    sessionRef.current += 1;
    stopLoop();
    setGrooveRunning(false);
    const completion = completionRef.current;
    onComplete({
      id: completion.progression.id,
      expected: completion.expected,
      selected: completion.activeNotes,
      question: `Play ${label(completion.progression.symbols)}`,
      isCorrect: true
    });
    setMessage("Progression complete.");
  }

  function nextChord() {
    if (!evaluation.complete) {
      return;
    }
    onReleaseAll();
    if (targetIndex === progression.symbols.length - 1) {
      finish();
      return;
    }
    setTargetIndex((index) => index + 1);
  }

  function settleBar() {
    const matched = barMatched.current;
    cycle.current.push(matched);
    if (matched) {
      setCompletedBars((count) => count + 1);
    } else {
      setMissedBars((count) => count + 1);
    }
    barMatched.current = false;
    if (cycle.current.length !== progression.symbols.length) {
      return;
    }
    if (cycle.current.every(Boolean)) {
      finish();
      return;
    }
    if (!failureRecorded.current) {
      failureRecorded.current = true;
      const completion = completionRef.current;
      onComplete({
        id: completion.progression.id,
        expected: completion.expected,
        selected: completion.activeNotes,
        question: `Play ${label(completion.progression.symbols)}`,
        isCorrect: false
      });
    }
    cycle.current = [];
    setMessage("Try again. Keep playing; no penalty for a missed bar.");
  }

  function startGroove() {
    stopLoop();
    const session = sessionRef.current + 1;
    sessionRef.current = session;
    onReleaseAll();
    barStarted.current = false;
    barMatched.current = false;
    cycle.current = [];
    setGrooveRunning(true);
    setMessage("");
    void playLoop(groovePattern(progression.symbols, targets, completedBars), {
      audioEnabled,
      onStep: (event) => {
        if (
          session !== sessionRef.current ||
          event.track !== "drums" ||
          event.startBeat % 4 !== 0
        ) {
          return;
        }
        const next = Math.floor(event.startBeat / 4) % progression.symbols.length;
        if (barStarted.current) {
          settleBar();
        }
        barStarted.current = true;
        targetIndexRef.current = next;
        setTargetIndex(next);
      }
    });
  }

  function stopGroove() {
    sessionRef.current += 1;
    stopLoop();
    onReleaseAll();
    setGrooveRunning(false);
    setMessage("Groove stopped.");
  }

  const feedback = `Missing: ${evaluation.missing.join(", ") || "none"}. Extra: ${evaluation.extra.join(", ") || "none"}.`;

  return (
    <section aria-labelledby="piano-progression-jam-title">
      <h2 id="piano-progression-jam-title">Progression Jam</h2>
      <p>Current chord: {progression.symbols[targetIndex]}</p>
      <p aria-live="polite">{feedback}</p>
      {mode === "groove" ? <p>Missed bars: {missedBars}</p> : null}
      {message ? <p aria-live="polite">{message}</p> : null}
      <div role="group" aria-label="Jam mode">
        <button type="button" aria-pressed={mode === "untimed"} onClick={() => reset("untimed")}>Untimed</button>
        <button type="button" aria-pressed={mode === "groove"} onClick={() => reset("groove")}>Groove</button>
      </div>
      <div role="group" aria-label="Progression choice">
        {progressions.map((choice) => (
          <button key={choice.id} type="button" onClick={() => { setProgression(choice); reset(); }}>
            {label(choice.symbols)}
          </button>
        ))}
      </div>
      {mode === "untimed" ? (
        <button type="button" disabled={!evaluation.complete || completed.current} onClick={nextChord}>
          {targetIndex === progression.symbols.length - 1 ? "Complete jam" : "Next chord"}
        </button>
      ) : grooveRunning ? (
        <button type="button" onClick={stopGroove}>Stop groove</button>
      ) : (
        <button type="button" onClick={startGroove}>Start groove</button>
      )}
      <button type="button" onClick={() => onSendProgression(progression.symbols)}>Send progression</button>
    </section>
  );
}
