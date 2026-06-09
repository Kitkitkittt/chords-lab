import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Music3, Play, Shuffle, Square } from "lucide-react";
import { Note } from "tonal";
import {
  audioPlaybackLabel,
  playLoop,
  stopLoop,
  triggerNoteAttack,
  triggerNoteRelease,
  releaseAllLiveNotes,
  type AudioPlaybackState,
  type LoopHandle
} from "../lib/audioEngine";
import {
  VIBES,
  vibeBackingPattern,
  vibeBarCount,
  vibeChords,
  vibeSoloNotes,
  type Vibe
} from "../lib/jam";
import { describeChordStack } from "../lib/interactionTools";
import { ChordFlourish } from "./ChordFlourish";
import { useProgress } from "../state/progress";

/**
 * Jam Room: pick a vibe, start a calm looping backing track, and play melody
 * notes on top with a keyboard that highlights the notes that fit. No scoring,
 * no timer; just a low-pressure space to make something that sounds good. The
 * soloing scale is derived from the vibe so every highlighted key is "safe".
 */

const WHITE_PCS = ["C", "D", "E", "F", "G", "A", "B"];
const BLACK_AFTER = new Set(["C", "D", "F", "G", "A"]);

function pitchClassOf(note: string): string {
  return Note.pitchClass(note) || note.replace(/[0-9]/g, "");
}

/** Build a one-octave keyboard layout (white keys + the black keys after them). */
function keyboardKeys(octave: number): { note: string; black: boolean }[] {
  const keys: { note: string; black: boolean }[] = [];

  WHITE_PCS.forEach((pc) => {
    keys.push({ note: `${pc}${octave}`, black: false });
    if (BLACK_AFTER.has(pc)) {
      keys.push({ note: `${pc}#${octave}`, black: true });
    }
  });

  return keys;
}

export function JamRoom() {
  const { progress } = useProgress();
  const navigate = useNavigate();
  const audioEnabled = progress.settings.audioEnabled;

  const [vibe, setVibe] = useState<Vibe>(VIBES[0]);
  const [status, setStatus] = useState<AudioPlaybackState>("idle");
  const [activeBar, setActiveBar] = useState(-1);
  const [held, setHeld] = useState<string[]>([]);
  const loopRef = useRef<LoopHandle | undefined>(undefined);

  const chords = useMemo(() => vibeChords(vibe), [vibe]);
  const soloPitchClasses = useMemo(
    () => new Set(vibeSoloNotes(vibe).map(pitchClassOf)),
    [vibe]
  );
  const barCount = vibeBarCount(vibe);
  const isPlaying = status === "playing";
  const detection = useMemo(() => describeChordStack(held), [held]);
  const detail =
    held.length === 0
      ? "Play notes over the loop"
      : detection.symbol
        ? detection.quality
          ? `${detection.symbol} · ${detection.quality}`
          : detection.label
        : `${held.map(pitchClassOf).join(" ")} · keep stacking`;

  // Stop audio when leaving the page.
  useEffect(() => {
    return () => {
      stopLoop();
      releaseAllLiveNotes();
    };
  }, []);

  // Switching vibe while playing should restart the loop on the new vibe.
  useEffect(() => {
    if (!isPlaying) {
      return;
    }

    void startLoop(vibe);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vibe]);

  async function startLoop(nextVibe: Vibe) {
    const handle = await playLoop(vibeBackingPattern(nextVibe), {
      audioEnabled,
      bpm: nextVibe.bpm,
      onStateChange: setStatus,
      onLoop: () => setActiveBar(0),
      onStep: (event) => {
        if (event.track === "bass" && typeof event.startBeat === "number") {
          const bar = Math.floor(event.startBeat / 4);
          setActiveBar(bar % barCount);
        }
      }
    });
    loopRef.current = handle;
  }

  function togglePlay() {
    if (isPlaying) {
      stopLoop(setStatus);
      loopRef.current = undefined;
      setActiveBar(-1);
      return;
    }

    void startLoop(vibe);
  }

  function shuffleVibe() {
    const others = VIBES.filter((item) => item.id !== vibe.id);
    const next = others[Math.floor(Math.random() * others.length)] ?? vibe;
    setVibe(next);
  }

  function pressKey(note: string) {
    void triggerNoteAttack(note, { voiceId: "keys", audioEnabled });
    setHeld((current) =>
      current.includes(note) ? current : [...current, note]
    );
  }

  function releaseKey(note: string) {
    triggerNoteRelease(note, { voiceId: "keys" });
    setHeld((current) => current.filter((item) => item !== note));
  }

  function sendToSongLab() {
    navigate("/lab/song", {
      state: {
        seedProgression: {
          key: vibe.tonic,
          mode: vibe.mode,
          numerals: vibe.numerals
        }
      }
    });
  }

  const keys = keyboardKeys(4).concat(keyboardKeys(5));

  return (
    <section className="jam-room" aria-labelledby="jam-room-title">
      <header className="jam-room__head">
        <h2 id="jam-room-title">Jam Room</h2>
        <p>
          Pick a vibe, press play, and noodle on the keys. Highlighted notes fit
          the loop, so it always sounds good.
        </p>
      </header>

      <div className="jam-vibes" role="radiogroup" aria-label="Backing vibe">
        {VIBES.map((item) => (
          <button
            key={item.id}
            type="button"
            role="radio"
            aria-checked={item.id === vibe.id}
            className={[
              "jam-vibe",
              item.id === vibe.id ? "is-active" : ""
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={() => setVibe(item)}
          >
            <strong>{item.label}</strong>
            <span>{item.blurb}</span>
            <span className="jam-vibe__meta">
              {item.tonic} {item.mode} · {item.bpm} BPM
            </span>
          </button>
        ))}
      </div>

      <div className="jam-transport">
        <button
          type="button"
          className="button button--primary"
          onClick={togglePlay}
          aria-pressed={isPlaying}
        >
          {isPlaying ? <Square size={16} /> : <Play size={16} />}
          {isPlaying ? "Stop" : "Play loop"}
        </button>
        <button type="button" className="button" onClick={shuffleVibe}>
          <Shuffle size={16} /> Surprise me
        </button>
        <button type="button" className="button" onClick={sendToSongLab}>
          <Music3 size={16} /> Open in Song Lab
        </button>
        <span className="jam-transport__status" role="status" aria-live="polite">
          {audioEnabled ? audioPlaybackLabel(status) : "Audio off"}
        </span>
      </div>

      <ol className="jam-bars" aria-label="Progression">
        {chords.map((chord, index) => (
          <li
            key={`${chord}-${index}`}
            className={[
              "jam-bar",
              index === activeBar ? "is-active" : ""
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <span className="jam-bar__numeral">{vibe.numerals[index]}</span>
            <span className="jam-bar__chord">{chord}</span>
          </li>
        ))}
      </ol>

      <ChordFlourish
        symbol={detection.symbol}
        detail={detail}
        placeholder={held.length > 0 ? "…" : "—"}
      />

      <div className="jam-keyboard" aria-label="Play-over keyboard">
        {keys.map((key) => {
          const pc = pitchClassOf(key.note);
          const inScale = soloPitchClasses.has(pc);
          const isHeld = held.includes(key.note);

          return (
            <button
              key={key.note}
              type="button"
              className={[
                "jam-key",
                key.black ? "jam-key--black" : "jam-key--white",
                inScale ? "is-in-scale" : "",
                isHeld ? "is-held" : ""
              ]
                .filter(Boolean)
                .join(" ")}
              aria-label={`${pc}${inScale ? ", fits the loop" : ""}`}
              aria-pressed={isHeld}
              onPointerDown={(event) => {
                event.preventDefault();
                pressKey(key.note);
              }}
              onPointerUp={() => releaseKey(key.note)}
              onPointerLeave={() => releaseKey(key.note)}
              onPointerCancel={() => releaseKey(key.note)}
            />
          );
        })}
      </div>
    </section>
  );
}
