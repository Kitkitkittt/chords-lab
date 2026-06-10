import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Music3, Play, Shuffle, Square, Volume2, VolumeX } from "lucide-react";
import { Note } from "tonal";
import {
  audioPlaybackLabel,
  playLoop,
  stopLoop,
  triggerNote,
  triggerNoteAttack,
  triggerNoteRelease,
  releaseAllLiveNotes,
  type AudioPlaybackState,
  type LoopHandle
} from "../lib/audioEngine";
import {
  VIBES,
  vibeBackingPattern,
  vibeChords,
  vibeSoloNotes,
  type Vibe
} from "../lib/jam";
import {
  BEATS,
  BEAT_STEPS,
  DRUM_ROWS,
  beatById,
  cloneDrumGrid,
  type DrumGrid
} from "../lib/beats";
import { describeChordStack } from "../lib/interactionTools";
import { ChordFlourish } from "./ChordFlourish";
import { useProgress } from "../state/progress";

/**
 * Jam Room: pick a vibe + a beat, shape the mix, and play melody over a looping
 * backing track on a keyboard that highlights the notes that fit. No scoring,
 * no timer. The soloing scale is derived from the vibe so every highlighted key
 * is "safe". Beats are independent of vibes and the drum grid is editable.
 */

const WHITE_PCS = ["C", "D", "E", "F", "G", "A", "B"];
const BLACK_AFTER = new Set(["C", "D", "F", "G", "A"]);

// Mixer tracks shown as channel strips. "keys" is the player's own instrument.
const MIX_TRACKS: { id: string; label: string }[] = [
  { id: "chords", label: "Chords" },
  { id: "bass", label: "Bass" },
  { id: "drums", label: "Drums" }
];

type Channel = { volume: number; muted: boolean };
type Mix = Record<string, Channel>;

const DEFAULT_MIX: Mix = {
  chords: { volume: 80, muted: false },
  bass: { volume: 80, muted: false },
  drums: { volume: 90, muted: false }
};

/** Map a 0-100 slider to a Tone gain in decibels (0 = -inf, 100 = 0 dB). */
function volumeToDb(volume: number): number {
  if (volume <= 0) {
    return -60;
  }
  // Perceptual-ish curve: 100 -> 0 dB, 50 -> ~-12 dB, 0 -> muted.
  return Math.round(20 * Math.log10(volume / 100));
}

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
  const [beatId, setBeatId] = useState<string>("backbeat");
  const [grid, setGrid] = useState<DrumGrid>(() =>
    cloneDrumGrid(beatById("backbeat")?.grid ?? [])
  );
  const [mix, setMix] = useState<Mix>(DEFAULT_MIX);
  const [tempo, setTempo] = useState<number>(VIBES[0].bpm);
  const [status, setStatus] = useState<AudioPlaybackState>("idle");
  const [activeStep, setActiveStep] = useState(-1);
  const [held, setHeld] = useState<string[]>([]);
  const loopRef = useRef<LoopHandle | undefined>(undefined);

  const chords = useMemo(() => vibeChords(vibe), [vibe]);
  const soloPitchClasses = useMemo(
    () => new Set(vibeSoloNotes(vibe).map(pitchClassOf)),
    [vibe]
  );
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

  // Build the engine mixer map from the channel state.
  const trackMix = useMemo(() => {
    const result: Record<string, { volumeDb?: number; muted?: boolean }> = {};
    for (const [track, channel] of Object.entries(mix)) {
      result[track] = {
        volumeDb: volumeToDb(channel.volume),
        muted: channel.muted
      };
    }
    return result;
  }, [mix]);

  // Stop audio when leaving the page.
  useEffect(() => {
    return () => {
      stopLoop();
      releaseAllLiveNotes();
    };
  }, []);

  // Restart the loop whenever the backing inputs change while playing, so the
  // mix, beat, tempo, and vibe stay live.
  useEffect(() => {
    if (!isPlaying) {
      return;
    }
    void startLoop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vibe, grid, trackMix, tempo]);

  async function startLoop() {
    const pattern = vibeBackingPattern(vibe, grid);
    const handle = await playLoop(pattern, {
      audioEnabled,
      bpm: tempo,
      trackMix,
      onStateChange: setStatus,
      onStep: (event) => {
        if (event.track === "drums" && typeof event.startBeat === "number") {
          const step = Math.round((event.startBeat % 4) / (4 / BEAT_STEPS));
          setActiveStep(step % BEAT_STEPS);
        }
      }
    });
    loopRef.current = handle;
  }

  function togglePlay() {
    if (isPlaying) {
      stopLoop(setStatus);
      loopRef.current = undefined;
      setActiveStep(-1);
      return;
    }
    void startLoop();
  }

  function chooseVibe(next: Vibe) {
    setVibe(next);
    setTempo(next.bpm);
  }

  function shuffleVibe() {
    const others = VIBES.filter((item) => item.id !== vibe.id);
    const next = others[Math.floor(Math.random() * others.length)] ?? vibe;
    chooseVibe(next);
  }

  function chooseBeat(id: string) {
    setBeatId(id);
    setGrid(cloneDrumGrid(beatById(id)?.grid ?? []));
  }

  function toggleCell(rowIndex: number, step: number) {
    setBeatId("custom");
    setGrid((current) =>
      current.map((cells, r) =>
        r === rowIndex
          ? cells.map((on, s) => (s === step ? !on : on))
          : cells
      )
    );
  }

  function setChannelVolume(track: string, volume: number) {
    setMix((current) => ({
      ...current,
      [track]: { ...current[track], volume }
    }));
  }

  function toggleMute(track: string) {
    setMix((current) => ({
      ...current,
      [track]: { ...current[track], muted: !current[track].muted }
    }));
  }

  function previewDrum(rowIndex: number) {
    const voice = DRUM_ROWS[rowIndex]?.id ?? "kick";
    void triggerNote("C2", { voiceId: voice, audioEnabled });
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
          Pick a vibe and a beat, shape the mix, and noodle on the keys.
          Highlighted notes fit the loop, so it always sounds good.
        </p>
      </header>

      <div className="jam-vibes" role="radiogroup" aria-label="Backing vibe">
        {VIBES.map((item) => (
          <button
            key={item.id}
            type="button"
            role="radio"
            aria-checked={item.id === vibe.id}
            className={["jam-vibe", item.id === vibe.id ? "is-active" : ""]
              .filter(Boolean)
              .join(" ")}
            onClick={() => chooseVibe(item)}
          >
            <strong>{item.label}</strong>
            <span>{item.blurb}</span>
            <span className="jam-vibe__meta">
              {item.tonic} {item.mode}
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
        <label className="jam-tempo">
          Tempo
          <input
            type="range"
            min={60}
            max={140}
            step={1}
            value={tempo}
            onChange={(event) => setTempo(Number(event.target.value))}
            aria-label="Tempo in beats per minute"
          />
          <span className="jam-tempo__value">{tempo} BPM</span>
        </label>
        <span className="jam-transport__status" role="status" aria-live="polite">
          {audioEnabled ? audioPlaybackLabel(status) : "Audio off"}
        </span>
      </div>

      <ol className="jam-bars" aria-label="Progression">
        {chords.map((chord, index) => (
          <li key={`${chord}-${index}`} className="jam-bar">
            <span className="jam-bar__numeral">{vibe.numerals[index]}</span>
            <span className="jam-bar__chord">{chord}</span>
          </li>
        ))}
      </ol>

      <div className="jam-mixer">
        <div className="jam-channels" aria-label="Mixer">
          {MIX_TRACKS.map((track) => {
            const channel = mix[track.id];
            return (
              <div key={track.id} className="jam-channel">
                <span className="jam-channel__label">{track.label}</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={channel.volume}
                  onChange={(event) =>
                    setChannelVolume(track.id, Number(event.target.value))
                  }
                  aria-label={`${track.label} volume`}
                />
                <button
                  type="button"
                  className={[
                    "jam-channel__mute",
                    channel.muted ? "is-muted" : ""
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  aria-pressed={channel.muted}
                  aria-label={`${channel.muted ? "Unmute" : "Mute"} ${track.label}`}
                  onClick={() => toggleMute(track.id)}
                >
                  {channel.muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                </button>
              </div>
            );
          })}
        </div>

        <div className="jam-beats">
          <div className="jam-beats__picker" role="radiogroup" aria-label="Beat">
            {BEATS.map((beat) => (
              <button
                key={beat.id}
                type="button"
                role="radio"
                aria-checked={beat.id === beatId}
                title={beat.blurb}
                className={["jam-beat", beat.id === beatId ? "is-active" : ""]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => chooseBeat(beat.id)}
              >
                {beat.label}
              </button>
            ))}
          </div>

          <div
            className="jam-grid"
            role="grid"
            aria-label="Drum pattern (tap cells to edit)"
          >
            {grid.map((cells, rowIndex) => (
              <div key={DRUM_ROWS[rowIndex]?.id} className="jam-grid__row" role="row">
                <button
                  type="button"
                  className="jam-grid__name"
                  onClick={() => previewDrum(rowIndex)}
                  aria-label={`Preview ${DRUM_ROWS[rowIndex]?.label}`}
                >
                  {DRUM_ROWS[rowIndex]?.label}
                </button>
                {cells.map((on, step) => (
                  <button
                    key={step}
                    type="button"
                    role="gridcell"
                    aria-selected={on}
                    className={[
                      "jam-cell",
                      on ? "is-on" : "",
                      step === activeStep ? "is-step" : "",
                      step % 2 === 0 ? "is-downbeat" : ""
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    aria-label={`${DRUM_ROWS[rowIndex]?.label} step ${step + 1}`}
                    onClick={() => toggleCell(rowIndex, step)}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

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
