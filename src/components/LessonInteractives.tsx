import { useMemo, useState } from "react";
import { Music3, Play } from "lucide-react";
import { Note } from "tonal";
import {
  playChord,
  playSequence,
  triggerNote,
  type AudioPlaybackState
} from "../lib/audioEngine";
import {
  chordNotes,
  intervalBetween,
  intervalSemitones,
  progressionChords,
  type KeyMode
} from "../lib/theory";
import { useProgress } from "../state/progress";

/**
 * Extra interactive blocks available to lessons via MDX. These reuse the
 * theory engine and audio engine so harmony/interval content can be explored
 * by ear and touch, not just read. All playback is user-triggered (no autoplay)
 * and gated by the audio setting.
 */

function withOctaves(pitchClasses: string[], octave = 4): string[] {
  let current = octave;
  let previousMidi = -1;
  return pitchClasses.map((pc) => {
    let midi = Note.midi(`${pc}${current}`) ?? previousMidi + 1;
    if (previousMidi >= 0 && midi <= previousMidi) {
      current += 1;
      midi = Note.midi(`${pc}${current}`) ?? midi + 12;
    }
    previousMidi = midi;
    return `${pc}${current}`;
  });
}

type PlayableProgressionProps = {
  /** Roman-numeral progression, e.g. ["I", "V", "vi", "IV"]. */
  numerals: string[];
  tonic?: string;
  mode?: KeyMode;
  label?: string;
};

/**
 * A compact progression player for harmony lessons: shows each Roman numeral
 * with its concrete chord, plays the whole loop, and lets the learner audition
 * a single chord by tapping it.
 */
export function PlayableProgression({
  numerals,
  tonic = "C",
  mode = "major",
  label
}: PlayableProgressionProps) {
  const { progress } = useProgress();
  const audioEnabled = progress.settings.audioEnabled;
  const [status, setStatus] = useState<AudioPlaybackState>("idle");
  const [activeIndex, setActiveIndex] = useState(-1);

  const chords = useMemo(
    () => progressionChords(numerals, tonic, mode),
    [numerals, tonic, mode]
  );

  const heading = label ?? `${tonic} ${mode}`;

  async function playAll() {
    const sequence: string[] = [];
    chords.forEach((symbol) => {
      sequence.push(...withOctaves(chordNotes(symbol), 3));
    });
    await playSequence(`${heading} progression`, sequence, {
      audioEnabled,
      onStateChange: setStatus
    });
  }

  function playOne(symbol: string, index: number) {
    setActiveIndex(index);
    void playChord(symbol, withOctaves(chordNotes(symbol), 3), {
      audioEnabled,
      onStateChange: setStatus
    });
  }

  return (
    <div className="playable-progression">
      <div className="playable-progression__head">
        <Music3 size={18} aria-hidden="true" />
        <span>{heading}</span>
        <button
          type="button"
          className="button button--secondary"
          onClick={playAll}
        >
          <Play size={16} aria-hidden="true" /> Play loop
        </button>
        <span className="playable-progression__status" role="status">
          {audioEnabled ? "" : "Audio off"}
        </span>
      </div>
      <ol className="playable-progression__chords">
        {chords.map((symbol, index) => (
          <li key={`${symbol}-${index}`}>
            <button
              type="button"
              className={[
                "playable-progression__chip",
                index === activeIndex ? "is-active" : ""
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => playOne(symbol, index)}
            >
              <span className="playable-progression__numeral">
                {numerals[index]}
              </span>
              <span className="playable-progression__symbol">{symbol}</span>
            </button>
          </li>
        ))}
      </ol>
      <span className="visually-hidden" role="status">
        {status === "playing" ? "Playing" : ""}
      </span>
    </div>
  );
}

const INTERVAL_LADDER = [
  { semitones: 0, from: "C4", to: "C4" },
  { semitones: 2, from: "C4", to: "D4" },
  { semitones: 4, from: "C4", to: "E4" },
  { semitones: 5, from: "C4", to: "F4" },
  { semitones: 7, from: "C4", to: "G4" },
  { semitones: 9, from: "C4", to: "A4" },
  { semitones: 11, from: "C4", to: "B4" },
  { semitones: 12, from: "C4", to: "C5" }
];

type IntervalExplorerProps = {
  /** Base note to measure intervals from. */
  root?: string;
};

/**
 * Tap any note above a fixed root to hear the interval and see its conventional
 * name + size. Great for interval lessons — turns a static table into a quick
 * "hear the distance" tool.
 */
export function IntervalExplorer({ root = "C4" }: IntervalExplorerProps) {
  const { progress } = useProgress();
  const audioEnabled = progress.settings.audioEnabled;
  const [target, setTarget] = useState<string | null>(null);

  const targets = useMemo(() => {
    const rootMidi = Note.midi(root) ?? 60;
    return INTERVAL_LADDER.map((step) => {
      const note = Note.fromMidi(rootMidi + step.semitones);
      return { note, semitones: step.semitones };
    });
  }, [root]);

  const readout = target
    ? `${intervalBetween(root, target, { verbose: true })} · ${intervalSemitones(
        intervalBetween(root, target)
      )} semitones`
    : "Tap a note to hear the interval from " + root;

  function choose(note: string) {
    setTarget(note);
    void playSequence(`${root} to ${note}`, [root, note], {
      audioEnabled,
      onStateChange: () => {}
    });
    void triggerNote(note, { voiceId: "keys", audioEnabled, durationMs: 600 });
  }

  return (
    <div className="interval-explorer">
      <div className="interval-explorer__readout" role="status" aria-live="polite">
        {readout}
      </div>
      <div className="interval-explorer__notes">
        {targets.map((item) => (
          <button
            key={item.note}
            type="button"
            className={[
              "interval-explorer__note",
              item.note === target ? "is-active" : ""
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={() => choose(item.note)}
          >
            {Note.pitchClass(item.note)}
          </button>
        ))}
      </div>
    </div>
  );
}
