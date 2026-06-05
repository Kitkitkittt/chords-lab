import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Music3, Play, Plus, Square, Trash2 } from "lucide-react";
import {
  audioPlaybackLabel,
  playChord,
  playSequence,
  stopAudioPlayback,
  type AudioPlaybackState
} from "../lib/audioEngine";
import {
  chordNotes,
  progressionChords,
  voiceLeadProgression,
  type KeyMode
} from "../lib/theory";
import { Note } from "tonal";
import { useProgress } from "../state/progress";

/**
 * Chord progression playground: pick a key, build a Roman-numeral progression,
 * hear it, and see derived chords plus smooth voice leading. All derivations
 * come from the theory engine. Playback is user-triggered (no autoplay).
 */

const NUMERAL_CHOICES = ["I", "ii", "iii", "IV", "V", "V7", "vi", "vii\u00B0"];
const KEY_CHOICES = ["C", "G", "D", "A", "E", "F", "Bb", "Eb"];

function withOctave(notes: string[], octave = 4): string[] {
  let current = octave;
  let previousMidi = -1;

  return notes.map((note) => {
    let midi = Note.midi(`${note}${current}`) ?? previousMidi + 1;

    if (previousMidi >= 0 && midi <= previousMidi) {
      current += 1;
      midi = Note.midi(`${note}${current}`) ?? midi + 12;
    }

    previousMidi = midi;
    return `${note}${current}`;
  });
}

export function ChordProgressionPlayground() {
  const { progress } = useProgress();
  const navigate = useNavigate();
  const audioEnabled = progress.settings.audioEnabled;
  const [tonic, setTonic] = useState("C");
  const [mode, setMode] = useState<KeyMode>("major");
  const [numerals, setNumerals] = useState<string[]>(["I", "V", "vi", "IV"]);
  const [status, setStatus] = useState<AudioPlaybackState>("idle");

  const chords = useMemo(
    () => progressionChords(numerals, tonic, mode),
    [numerals, tonic, mode]
  );
  const voicing = useMemo(() => voiceLeadProgression(chords), [chords]);

  function addNumeral(numeral: string) {
    setNumerals((current) =>
      current.length >= 8 ? current : [...current, numeral]
    );
  }

  function removeAt(index: number) {
    setNumerals((current) => current.filter((_, i) => i !== index));
  }

  function clearProgression() {
    setNumerals([]);
  }

  async function playProgression() {
    if (chords.length === 0) {
      return;
    }

    // Play the voiced notes in turn for a smoother, voice-led sound.
    const flat = voicing.flatMap((step) => step.voicing);
    await playSequence("Progression", flat, {
      audioEnabled,
      onStateChange: setStatus
    });
  }

  async function playSingleChord(symbol: string) {
    await playChord(symbol, withOctave(chordNotes(symbol)), {
      audioEnabled,
      onStateChange: setStatus
    });
  }

  function stop() {
    stopAudioPlayback(setStatus);
  }

  function openInSongLab() {
    if (numerals.length === 0) {
      return;
    }

    navigate("/lab/song", {
      state: {
        seedProgression: { key: tonic, mode, numerals }
      }
    });
  }

  return (
    <section className="chord-playground" aria-labelledby="playground-title">
      <div className="chord-playground__header">
        <h2 id="playground-title">Chord progression playground</h2>
        <p>
          Build a progression with Roman numerals, then hear how it sounds and
          how the voices move. Audio plays only when you press a button.
        </p>
      </div>

      <div className="chord-playground__controls">
        <label>
          Key
          <select
            value={tonic}
            onChange={(event) => setTonic(event.currentTarget.value)}
          >
            {KEY_CHOICES.map((choice) => (
              <option key={choice} value={choice}>
                {choice}
              </option>
            ))}
          </select>
        </label>
        <label>
          Mode
          <select
            value={mode}
            onChange={(event) =>
              setMode(event.currentTarget.value === "minor" ? "minor" : "major")
            }
          >
            <option value="major">major</option>
            <option value="minor">minor</option>
          </select>
        </label>
      </div>

      <div
        className="chord-playground__palette"
        role="group"
        aria-label="Add a Roman numeral"
      >
        {NUMERAL_CHOICES.map((numeral) => (
          <button
            key={numeral}
            type="button"
            className="button button--quiet"
            onClick={() => addNumeral(numeral)}
          >
            <Plus size={15} aria-hidden="true" />
            {numeral}
          </button>
        ))}
      </div>

      <ol className="chord-playground__sequence" aria-label="Current progression">
        {numerals.map((numeral, index) => (
          <li key={`${numeral}-${index}`}>
            <button
              type="button"
              onClick={() => playSingleChord(chords[index] ?? numeral)}
              aria-label={`Play ${chords[index] ?? numeral}`}
            >
              <strong>{numeral}</strong>
              <span>{chords[index]}</span>
            </button>
            <button
              type="button"
              className="chord-playground__remove"
              onClick={() => removeAt(index)}
              aria-label={`Remove slot ${index + 1}`}
            >
              <Trash2 size={14} aria-hidden="true" />
            </button>
          </li>
        ))}
        {numerals.length === 0 ? <li className="is-empty">Add numerals to begin.</li> : null}
      </ol>

      <div className="chord-playground__voicing" aria-label="Voice leading">
        <h3>Smooth voice leading</h3>
        <ol>
          {voicing.map((step, index) => (
            <li key={`${step.chord}-${index}`}>
              <strong>{step.chord}</strong>
              <span>{step.voicing.join(" ")}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="chord-playground__actions">
        <button
          className="button button--secondary"
          type="button"
          onClick={playProgression}
          disabled={chords.length === 0}
        >
          <Play size={17} aria-hidden="true" />
          Play progression
        </button>
        <button className="button button--quiet" type="button" onClick={stop}>
          <Square size={17} aria-hidden="true" />
          Stop
        </button>
        <button
          className="button button--quiet"
          type="button"
          onClick={clearProgression}
        >
          Clear
        </button>
        <button
          className="button button--quiet"
          type="button"
          onClick={openInSongLab}
          disabled={numerals.length === 0}
        >
          <Music3 size={17} aria-hidden="true" />
          Open in Song Lab
        </button>
        <span className="chord-playground__status" aria-live="polite">
          {audioPlaybackLabel(status)}
        </span>
      </div>
    </section>
  );
}
