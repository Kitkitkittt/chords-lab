import { ArrowLeft, Music3, Play } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import {
  DrumPadWorkbench,
  FretboardWorkbench,
  InteractivePianoWorkbench,
  VoiceRangeWorkbench
} from "../components/InstrumentWorkbenches";
import {
  audioPlaybackLabel,
  playChord,
  playDrumKit,
  playSequence,
  releaseAllLiveNotes,
  stopAudioPlayback
} from "../lib/audioEngine";
import type { AudioPlaybackState } from "../lib/audioEngine";
import {
  bassTargetsFor,
  chordShapeFor,
  chordToneHighlights,
  drumGroovePresets,
  instrumentsById,
  isInstrumentId,
  scaleDegreeHighlights
} from "../lib/instruments";
import { useProgress } from "../state/progress";
import { describeChordStack } from "../lib/interactionTools";
import type { InstrumentId } from "../types/course";

const chordChoices = ["C", "G", "Am", "F", "G7"];
const tonicChoices = ["C", "G", "F", "A"];
const scaleChoices = ["major", "natural minor", "major pentatonic"];

function notesWithOctave(notes: string[], octave = 4) {
  return notes.map((note) => (/\d/.test(note) ? note : `${note}${octave}`));
}

export function InstrumentPage() {
  const { instrumentId } = useParams();
  const navigate = useNavigate();
  const { progress } = useProgress();
  const audioEnabled = progress.settings.audioEnabled;
  const [symbol, setSymbol] = useState("C");
  const [tonic, setTonic] = useState("C");
  const [scaleType, setScaleType] = useState("major");
  const [status, setStatus] = useState<AudioPlaybackState>("idle");
  const [drumPattern, setDrumPattern] = useState(drumGroovePresets.backbeat);
  const [drumCursor, setDrumCursor] = useState(-1);
  const [playedNotes, setPlayedNotes] = useState<string[]>([]);

  useEffect(() => {
    return () => {
      releaseAllLiveNotes();
      stopAudioPlayback();
    };
  }, []);

  if (!isInstrumentId(instrumentId)) {
    return <Navigate to="/instruments" replace />;
  }

  if (!instrumentsById.has(instrumentId)) {
    return <Navigate to="/instruments" replace />;
  }

  const profile = instrumentsById.get(instrumentId)!;
  const chordHighlights = chordToneHighlights(symbol);
  const scaleHighlights = scaleDegreeHighlights(tonic, scaleType);
  const activeChordNotes = chordHighlights.map((highlight) => highlight.note);
  const bassNotes = bassTargetsFor(symbol);
  const chordShape = chordShapeFor(profile.id, symbol);
  const freePlayDetection = describeChordStack(playedNotes);
  const freePlayChord = freePlayDetection.symbol
    ? freePlayDetection.symbol.replace(/M$/, "")
    : undefined;

  function toggleDrum(row: number, step: number) {
    setDrumPattern((current) =>
      current.map((patternRow, rowIndex) =>
        rowIndex === row
          ? patternRow.map((isActive, stepIndex) =>
              stepIndex === step ? !isActive : isActive
            )
          : patternRow
      )
    );
  }

  async function playCurrent() {
    if (status === "playing" || status === "loading") {
      stopAudioPlayback(setStatus);
      return;
    }

    if (profile.id === "drums") {
      setStatus("playing");
      await playDrumKit(drumPattern, {
        audioEnabled,
        onStep: setDrumCursor,
        onDone: () => {
          setDrumCursor(-1);
          setStatus("idle");
        }
      });
      return;
    }

    if (profile.id === "bass") {
      await playSequence("Bass targets", bassNotes, {
        audioEnabled,
        onStateChange: setStatus
      });
      return;
    }

    if (profile.id === "voice") {
      await playSequence("Voice guide", ["C4", "D4", "E4", "G4"], {
        audioEnabled,
        onStateChange: setStatus
      });
      return;
    }

    await playChord(`${symbol} ${profile.title}`, notesWithOctave(activeChordNotes), {
      audioEnabled,
      onStateChange: setStatus
    });
  }

  function renderWorkbench(id: InstrumentId) {
    if (id === "piano") {
      return (
        <InteractivePianoWorkbench
          label="Piano chord and scale map"
          highlights={[...chordHighlights, ...scaleHighlights]}
          bassNote={symbol.includes("/") ? symbol.split("/")[1] : activeChordNotes[0]}
          selectedNotes={activeChordNotes}
          audioEnabled={audioEnabled}
          onToggle={(note) =>
            setPlayedNotes((current) => {
              const pc = note.replace(/[0-9]/g, "");
              const next = [...current, pc];
              return next.slice(-6);
            })
          }
        />
      );
    }

    if ((id === "guitar" || id === "ukulele" || id === "bass") && profile.tuning) {
      return (
        <FretboardWorkbench
          instrumentId={id}
          title={`${profile.title} fretboard`}
          tuning={profile.tuning}
          activeNotes={id === "bass" ? bassNotes : activeChordNotes}
          chordShape={chordShape}
          audioEnabled={audioEnabled}
        />
      );
    }

    if (id === "drums") {
      return (
        <DrumPadWorkbench
          pattern={drumPattern}
          onToggle={toggleDrum}
          playbackCursor={drumCursor}
          audioEnabled={audioEnabled}
        />
      );
    }

    return (
      <VoiceRangeWorkbench
        activeNotes={["C4", "D4", "E4", "G4"]}
        onPlay={playCurrent}
        tonic={tonic}
        mode={scaleType.includes("minor") ? "minor" : "major"}
        audioEnabled={audioEnabled}
      />
    );
  }

  return (
    <div className="page-stack">
      <section className="section-heading">
        <Link className="text-button" to="/instruments">
          <ArrowLeft size={16} aria-hidden="true" />
          Instruments
        </Link>
        <span className="eyebrow">{profile.family}</span>
        <h1>{profile.title}</h1>
        <p>{profile.summary}</p>
      </section>

      <section className="instrument-lab-layout" aria-label={`${profile.title} lab`}>
        <aside className="instrument-inspector" aria-label="Concept inspector">
          <section>
            <h2>Chord</h2>
            <div className="segmented-control">
              {chordChoices.map((choice) => (
                <button
                  key={choice}
                  type="button"
                  aria-pressed={symbol === choice}
                  onClick={() => setSymbol(choice)}
                >
                  {choice}
                </button>
              ))}
            </div>
            <dl>
              {chordHighlights.map((highlight) => (
                <div key={`${highlight.note}-${highlight.degree}`}>
                  <dt>{highlight.degree}</dt>
                  <dd>{highlight.note}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section>
            <h2>Scale</h2>
            <div className="segmented-control">
              {tonicChoices.map((choice) => (
                <button
                  key={choice}
                  type="button"
                  aria-pressed={tonic === choice}
                  onClick={() => setTonic(choice)}
                >
                  {choice}
                </button>
              ))}
            </div>
            <select
              value={scaleType}
              onChange={(event) => setScaleType(event.currentTarget.value)}
            >
              {scaleChoices.map((choice) => (
                <option key={choice}>{choice}</option>
              ))}
            </select>
          </section>

          <section>
            <h2>Apply</h2>
            <button className="button" type="button" onClick={playCurrent}>
              <Play size={17} aria-hidden="true" />
              {status === "playing" || status === "loading" ? "Stop" : "Play"}
            </button>
            <Link className="button button--quiet" to={profile.practiceRoute}>
              Practice
            </Link>
            <Link className="button button--secondary" to="/lab/song">
              <Music3 size={17} aria-hidden="true" />
              Song Lab
            </Link>
            <p className="lab-status" role="status">
              {audioPlaybackLabel(status)}
            </p>
          </section>

          {profile.id === "piano" ? (
            <section>
              <h2>Free play</h2>
              <p className="free-play-readout" role="status">
                {playedNotes.length > 0
                  ? `${playedNotes.join(" ")} \u2192 ${freePlayDetection.label}`
                  : "Tap keys to hear what chord you are building."}
              </p>
              <button
                className="button button--quiet"
                type="button"
                onClick={() => setPlayedNotes([])}
                disabled={playedNotes.length === 0}
              >
                Clear notes
              </button>
              <button
                className="button button--secondary"
                type="button"
                disabled={!freePlayChord}
                onClick={() => {
                  if (freePlayChord) {
                    navigate("/lab/song", {
                      state: {
                        seedProgression: {
                          key: tonic,
                          mode: scaleType.includes("minor") ? "minor" : "major",
                          numerals: [freePlayChord]
                        }
                      }
                    });
                  }
                }}
              >
                <Music3 size={17} aria-hidden="true" />
                Send to Song Lab
              </button>
            </section>
          ) : null}
        </aside>

        <div className="instrument-lab-stage">
          {renderWorkbench(profile.id)}
        </div>
      </section>
    </div>
  );
}
