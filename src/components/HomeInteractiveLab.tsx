import {
  CheckCircle2,
  Drum,
  Music,
  Piano,
  Play,
  RotateCcw,
  Rows3
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  audioPlaybackLabel,
  playPattern,
  playRhythm,
  playSequence,
  stopAudioPlayback
} from "../lib/audioEngine";
import type { AudioPlaybackState, PlaybackPattern } from "../lib/audioEngine";
import { getAdaptiveReviewSummary } from "../lib/adaptiveReview";
import {
  majorScaleNotes,
  naturalMinorScaleNotes,
  normalizePitchClassForKeyboard,
  triadNotes
} from "../lib/music";
import { useProgress } from "../state/progress";
import { KeyboardFigure, NotationFigure } from "./LessonComponents";

type LabMode = "review" | "song" | "scale" | "rhythm" | "staff";
type ScaleMode = "major" | "minor";

const tonics = ["C", "D", "E", "F", "G", "A", "B"];
const staffChoices = ["C4", "D4", "E4", "F4", "G4", "A4"];
const pitchClassOrder = [
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

const labModes: Array<{
  id: LabMode;
  label: string;
  summary: string;
  path: string;
  icon: typeof Music;
}> = [
  {
    id: "review",
    label: "Due review",
    summary: "See which skills are ready to revisit.",
    path: "/review",
    icon: RotateCcw
  },
  {
    id: "song",
    label: "Play Song Lab",
    summary: "Hear a four-chord loop before opening the full sketcher.",
    path: "/lab/song",
    icon: Music
  },
  {
    id: "scale",
    label: "Build a scale",
    summary: "Pick a tonic and compare major or natural minor spelling.",
    path: "/practice/scales/setup",
    icon: Rows3
  },
  {
    id: "rhythm",
    label: "Tap rhythm",
    summary: "Toggle a beat pattern and hear the active cells.",
    path: "/practice/rhythm/setup",
    icon: Drum
  },
  {
    id: "staff",
    label: "Staff challenge",
    summary: "Choose a staff position for middle C.",
    path: "/practice/staff/setup",
    icon: Piano
  }
];

function noteWithOctave(note: string, octave = 4): string {
  return `${note}${octave}`;
}

function ascendingNotes(notes: string[], startOctave = 4): string[] {
  let octave = startOctave;
  let previousValue = -1;

  return notes.map((note) => {
    const pitchClass = normalizePitchClassForKeyboard(note);
    const value = pitchClassOrder.indexOf(pitchClass);

    if (previousValue >= 0 && value <= previousValue) {
      octave += 1;
    }

    previousValue = value;

    return noteWithOctave(note, octave);
  });
}

function notationFromNotes(notes: string[], duration = "q"): string {
  return notes.map((note) => `${note}/${duration}`).join(", ");
}

export function HomeInteractiveLab() {
  const [mode, setMode] = useState<LabMode>("scale");
  const [tonic, setTonic] = useState("C");
  const [scaleMode, setScaleMode] = useState<ScaleMode>("major");
  const [rhythmPattern, setRhythmPattern] = useState([
    true,
    false,
    true,
    true
  ]);
  const [staffAnswer, setStaffAnswer] = useState("");
  const [playbackState, setPlaybackState] =
    useState<AudioPlaybackState>("idle");
  const { progress } = useProgress();
  const reviewSummary = getAdaptiveReviewSummary(progress);

  useEffect(() => {
    return () => stopAudioPlayback();
  }, []);

  const activeMode = labModes.find((item) => item.id === mode) ?? labModes[2];
  const currentNotes = useMemo(() => {
    if (mode === "scale") {
      const notes =
        scaleMode === "major"
          ? majorScaleNotes(tonic)
          : naturalMinorScaleNotes(tonic);

      return ascendingNotes([...notes, tonic]);
    }

    if (mode === "rhythm") {
      return rhythmPattern.map((isActive, index) =>
        isActive ? noteWithOctave(index % 2 === 0 ? tonic : "G") : "Rest"
      );
    }

    if (mode === "staff") {
      return ["C4"];
    }

    if (mode === "song") {
      return ["C", "G", "Am", "F"].flatMap((symbol) =>
        ascendingNotes(triadNotes(symbol), 3)
      );
    }

    return [];
  }, [mode, rhythmPattern, scaleMode, tonic]);
  const visibleNotes = currentNotes.filter((note) => note !== "Rest");

  async function playCurrent() {
    if (playbackState === "playing" || playbackState === "loading") {
      stopAudioPlayback(setPlaybackState);
      return;
    }

    if (mode === "song") {
      const songPreview: PlaybackPattern = {
        label: "Song Lab preview",
        bpm: 92,
        meter: "4/4",
        mode: "song",
        events: ["C", "G", "Am", "F"].map((symbol, index) => ({
          note: ascendingNotes(triadNotes(symbol), 3),
          startBeat: index * 1.2,
          durationBeats: 0.95,
          velocity: 0.68,
          track: "chords"
        }))
      };
      await playPattern(songPreview, {
        audioEnabled: progress.settings.audioEnabled,
        onStateChange: setPlaybackState
      });
      return;
    }

    if (mode === "rhythm") {
      await playRhythm(
        "Home rhythm",
        rhythmPattern.map((isActive) => (isActive ? "hit" : "rest")),
        {
          audioEnabled: progress.settings.audioEnabled,
          onStateChange: setPlaybackState
        }
      );
      return;
    }

    await playSequence(activeMode.label, visibleNotes, {
      audioEnabled: progress.settings.audioEnabled,
      onStateChange: setPlaybackState
    });
  }

  function toggleBeat(index: number) {
    setRhythmPattern((current) =>
      current.map((isActive, beatIndex) =>
        beatIndex === index ? !isActive : isActive
      )
    );
  }

  return (
    <section className="interactive-lab" aria-labelledby="interactive-lab-title">
      <div className="interactive-lab__header">
        <span className="eyebrow">Interactive index</span>
        <h2 id="interactive-lab-title">Practice hub</h2>
        <p>{activeMode.summary}</p>
      </div>

      <div className="lab-launchpad" role="tablist" aria-label="Practice launchpad">
        {labModes.map((item) => {
          const Icon = item.icon;
          const metric =
            item.id === "review"
              ? `${reviewSummary.dueSkillCount} due`
              : item.id === "song"
                ? `${progress.savedSongSketches.length} saved`
                : "Try now";

          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={mode === item.id}
              className={mode === item.id ? "launchpad-card is-active" : "launchpad-card"}
              onClick={() => setMode(item.id)}
            >
              <Icon size={18} aria-hidden="true" />
              <span>
                <strong>{item.label}</strong>
                <small>{item.summary}</small>
              </span>
              <b>{metric}</b>
            </button>
          );
        })}
      </div>

      <div className="lab-workspace">
        <div className="lab-controls">
          {mode === "review" ? (
            <div className="workbench-readout">
              <strong>{reviewSummary.dueSkillCount} skill reviews due</strong>
              <span>
                {reviewSummary.missedPromptCount} missed prompt
                {reviewSummary.missedPromptCount === 1 ? "" : "s"} queued
              </span>
            </div>
          ) : null}

          {mode === "scale" || mode === "rhythm" ? (
            <div className="control-group" aria-label="Tonic note">
              <span>Tonic</span>
              <div className="segmented-control">
                {tonics.map((note) => (
                  <button
                    key={note}
                    type="button"
                    aria-pressed={tonic === note}
                    onClick={() => setTonic(note)}
                  >
                    {note}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {mode === "scale" ? (
            <div className="control-group" aria-label="Scale mode">
              <span>Scale</span>
              <div className="segmented-control">
                {(["major", "minor"] as ScaleMode[]).map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={scaleMode === value}
                    onClick={() => setScaleMode(value)}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {mode === "rhythm" ? (
            <div className="control-group" aria-label="Rhythm pattern">
              <span>Beats</span>
              <div className="rhythm-grid">
                {rhythmPattern.map((isActive, index) => (
                  <button
                    key={index}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => toggleBeat(index)}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {mode === "staff" ? (
            <div className="control-group" aria-label="Staff challenge choices">
              <span>Choose middle C</span>
              <div className="staff-mini-board">
                {staffChoices.map((choice) => (
                  <button
                    key={choice}
                    type="button"
                    aria-pressed={staffAnswer === choice}
                    onClick={() => setStaffAnswer(choice)}
                  >
                    {choice}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {mode !== "review" ? (
            <button className="button" type="button" onClick={playCurrent}>
              <Play size={18} aria-hidden="true" />
              {playbackState === "playing" || playbackState === "loading"
                ? "Stop"
                : "Play"}
            </button>
          ) : null}
          <Link className="button button--quiet" to={activeMode.path}>
            Open full module
          </Link>
          <p className="lab-status" role="status">
            {playbackState === "playing" ||
            playbackState === "loading" ||
            playbackState === "stopped" ||
            playbackState === "disabled" ||
            playbackState === "error"
              ? audioPlaybackLabel(playbackState)
              : mode === "staff"
                    ? staffAnswer === "C4"
                      ? "Correct: C4 is middle C."
                      : staffAnswer
                        ? `Selected ${staffAnswer}. Try C4.`
                        : "Current: C4"
                    : visibleNotes.length > 0
                      ? `Current: ${visibleNotes.join(" ")}`
                      : "Review is ready"}
          </p>
        </div>

        <div className="lab-visuals" aria-label="Interactive output">
          {mode === "rhythm" ? (
            <div className="rhythm-preview" aria-label="Rhythm preview">
              {rhythmPattern.map((isActive, index) => (
                <span key={index} className={isActive ? "is-active" : ""}>
                  {isActive ? "hit" : "rest"}
                </span>
              ))}
            </div>
          ) : mode === "review" ? (
            <div className="review-preview">
              <CheckCircle2 size={22} aria-hidden="true" />
              <strong>
                {reviewSummary.dueSkillIds.slice(0, 3).join(", ") ||
                  "No due skills yet"}
              </strong>
              <span>Adaptive review orders work by skill need, not a timer.</span>
            </div>
          ) : (
            <NotationFigure
              title={`${activeMode.label} notation`}
              notation={
                mode === "staff"
                  ? "C4/q"
                  : notationFromNotes(visibleNotes, mode === "scale" ? "8" : "q")
              }
              timeSignature={mode === "staff" ? "1/4" : "4/4"}
            />
          )}
          <KeyboardFigure label={`${activeMode.label} keyboard`} active={visibleNotes} />
        </div>
      </div>
    </section>
  );
}
