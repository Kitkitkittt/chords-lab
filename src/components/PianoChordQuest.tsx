import { useEffect, useMemo, useRef, useState } from "react";
import { playChord } from "../lib/audioEngine";
import {
  bandLayerCount,
  evaluatePianoChord,
  progressionChordNotes
} from "../lib/pianoPerformance";

type PianoChordQuestProps = {
  activeNotes: string[];
  audioEnabled: boolean;
  onTargetNotesChange: (notes: string[]) => void;
  onReleaseAll: () => void;
  onComplete: (detail: {
    id: string;
    expected: string[];
    selected: string[];
    question: string;
  }) => void;
};

type Quest = { id: string; symbol: string; question: string; notes: string[] };

const QUEST_SYMBOLS = ["C", "Am", "F", "G7", "Dm", "Em"];
const BAND_LAYERS = ["Drums", "Bass", "Harmony", "Melody"];
const QUESTS: Quest[] = QUEST_SYMBOLS.map((symbol) => ({
  id: symbol.toLowerCase(),
  symbol,
  question: `Build ${symbol}.`,
  notes: progressionChordNotes([symbol])[0] ?? []
}));

export function PianoChordQuest({
  activeNotes,
  audioEnabled,
  onTargetNotesChange,
  onReleaseAll,
  onComplete
}: PianoChordQuestProps) {
  const [questIndex, setQuestIndex] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const completedIds = useRef(new Set<string>());
  const quest = QUESTS[questIndex];
  const evaluation = useMemo(
    () => evaluatePianoChord(quest.notes, activeNotes),
    [activeNotes, quest]
  );
  const completedLayers = bandLayerCount(completedCount);

  useEffect(() => {
    onTargetNotesChange(quest.notes);
  }, [onTargetNotesChange, quest]);

  useEffect(() => {
    if (!evaluation.complete || completedIds.current.has(quest.id)) {
      return;
    }

    completedIds.current.add(quest.id);
    setCompletedCount(completedIds.current.size);
    onComplete({
      id: quest.id,
      expected: quest.notes,
      selected: activeNotes,
      question: quest.question
    });
  }, [activeNotes, evaluation.complete, onComplete, quest]);

  function nextQuest() {
    onReleaseAll();
    setQuestIndex((current) => (current + 1) % QUESTS.length);
  }

  function playTarget() {
    void playChord(quest.symbol, quest.notes, { audioEnabled });
  }

  return (
    <section aria-labelledby="piano-chord-quest-title">
      <h2 id="piano-chord-quest-title">Chord Quest</h2>
      <p>Quest: {quest.symbol}</p>
      <p>{quest.question}</p>
      <p role="status" aria-live="polite">
        Missing: {evaluation.missing.join(", ") || "None"}
      </p>
      <p>Extra: {evaluation.extra.join(", ") || "None"}</p>
      <p>Inversion: {evaluation.inversion}</p>
      {evaluation.complete ? <p>Quest complete.</p> : null}

      <button type="button" onClick={playTarget}>
        Play target
      </button>
      <button type="button" onClick={nextQuest}>
        Next quest
      </button>

      <ul aria-label="Calm band layers">
        {BAND_LAYERS.map((layer, index) => {
          const active = index < completedLayers;
          return (
            <li
              key={layer}
              data-active={active}
              aria-current={active ? "true" : undefined}
            >
              {layer}: {active ? "active" : "locked"}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
