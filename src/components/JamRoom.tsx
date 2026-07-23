import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Circle,
  Keyboard,
  Music3,
  Play,
  Save,
  Shuffle,
  Sliders,
  Square,
  Volume2,
  VolumeX
} from "lucide-react";
import { Note } from "tonal";
import {
  audioPlaybackLabel,
  playLoop,
  setLiveEffects,
  stopLoop,
  triggerNote,
  triggerNoteAttack,
  triggerNoteRelease,
  releaseAllLiveNotes,
  type AudioPlaybackState,
  type LiveVoiceId,
  type LoopHandle
} from "../lib/audioEngine";
import {
  CUSTOM_SCALE_TOPICS,
  VIBES,
  createCustomVibe,
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
import { chordNotes, type KeyMode } from "../lib/theory";
import { describeChordStack, quantizeBeatPosition } from "../lib/interactionTools";
import { createSketchFromJam } from "../lib/songSketches";
import { useInstrumentHotkeys } from "../hooks/useInstrumentHotkeys";
import type { CapturedNote } from "../types/course";
import { ChordFlourish } from "./ChordFlourish";
import { useProgress } from "../state/progress";

/**
 * Jam Room: pick a vibe (or build your own progression), shape the mix and FX,
 * and play melody over a looping backing track — with mouse, touch, or the
 * computer keyboard. Highlighted keys fit the loop. A take recorder captures a
 * freely-timed melody you can save straight to Song Lab. No scoring, no timer.
 */

const WHITE_PCS = ["C", "D", "E", "F", "G", "A", "B"];
const BLACK_AFTER = new Set(["C", "D", "F", "G", "A"]);

// Mixer tracks shown as channel strips. "keys" is the player's own instrument.
const MIX_TRACKS: { id: string; label: string }[] = [
  { id: "chords", label: "Chords" },
  { id: "bass", label: "Bass" },
  { id: "drums", label: "Drums" }
];

// Timbres the player can solo with.
const PLAYER_VOICES: { id: LiveVoiceId; label: string }[] = [
  { id: "keys", label: "Piano" },
  { id: "pluck", label: "Pluck" },
  { id: "pad", label: "Pad" },
  { id: "arp", label: "Synth" },
  { id: "bass", label: "Bass" },
  { id: "voice", label: "Voice" }
];

// QWERTY → pitch-class layout (one octave + the C above), matching the piano
// mapping used elsewhere so muscle memory carries over. `offset` bumps the
// octave for the top keys.
const KEY_LAYOUT: { key: string; pc: string; offset: number }[] = [
  { key: "a", pc: "C", offset: 0 },
  { key: "w", pc: "C#", offset: 0 },
  { key: "s", pc: "D", offset: 0 },
  { key: "e", pc: "D#", offset: 0 },
  { key: "d", pc: "E", offset: 0 },
  { key: "f", pc: "F", offset: 0 },
  { key: "t", pc: "F#", offset: 0 },
  { key: "g", pc: "G", offset: 0 },
  { key: "y", pc: "G#", offset: 0 },
  { key: "h", pc: "A", offset: 0 },
  { key: "u", pc: "A#", offset: 0 },
  { key: "j", pc: "B", offset: 0 },
  { key: "k", pc: "C", offset: 1 }
];

const MAJOR_NUMERALS = ["I", "ii", "iii", "IV", "V", "V7", "vi"];
const MINOR_NUMERALS = ["i", "ii\u00B0", "III", "iv", "v", "VI", "VII"];
const KEY_CHOICES = ["C", "G", "D", "A", "E", "F", "Bb", "Eb"];

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

/** Map QWERTY keys to concrete notes for the given base octave. */
function keyNotesForOctave(octave: number): { note: string; key: string }[] {
  return KEY_LAYOUT.map(({ key, pc, offset }) => ({
    key,
    note: `${pc}${octave + offset}`
  }));
}

/** Snap a note to the nearest pitch that belongs to the soloing scale. */
function snapToScale(note: string, pitchClasses: Set<string>): string {
  if (pitchClasses.has(pitchClassOf(note))) {
    return note;
  }

  const midi = Note.midi(note);
  if (midi === null) {
    return note;
  }

  for (let distance = 1; distance <= 6; distance += 1) {
    for (const candidate of [midi - distance, midi + distance]) {
      const name = Note.fromMidi(candidate);
      if (pitchClasses.has(pitchClassOf(name))) {
        return name;
      }
    }
  }

  return note;
}

/** Root note in a low octave for a chord symbol (bass track seed). */
function bassRootFor(symbol: string): string {
  const root = chordNotes(symbol)[0] ?? "C";
  return `${pitchClassOf(root)}2`;
}

const delay = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

export function JamRoom() {
  const { progress, saveSongSketch } = useProgress();
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
  const [octave, setOctave] = useState(4);
  const [voiceId, setVoiceId] = useState<LiveVoiceId>("keys");
  const [reverb, setReverb] = useState(0);
  const [delayFx, setDelayFx] = useState(0);
  const [snap, setSnap] = useState(false);
  const [countInOn, setCountInOn] = useState(false);
  const [metronomeOn, setMetronomeOn] = useState(false);
  const [countIn, setCountInDisplay] = useState(0);
  const [showCheat, setShowCheat] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [recording, setRecording] = useState(false);
  const [captured, setCaptured] = useState<CapturedNote[]>([]);
  const [savedTitle, setSavedTitle] = useState<string | null>(null);
  const [customDraft, setCustomDraft] = useState<{
    tonic: string;
    mode: KeyMode;
    numerals: string[];
    bpm: number;
  }>({ tonic: "C", mode: "major", numerals: ["I", "V", "vi", "IV"], bpm: 96 });

  const loopRef = useRef<LoopHandle | undefined>(undefined);
  const metronomeRef = useRef(0);
  const recordStartRef = useRef(0);
  const recordingRef = useRef(false);
  const openNotesRef = useRef(new Map<string, { played: string; startBeat: number }>());

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

  const beatMs = 60000 / Math.max(40, tempo);

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

  // Push FX changes to the live effects bus.
  useEffect(() => {
    setLiveEffects({ reverb: reverb / 100, delay: delayFx / 100 });
  }, [reverb, delayFx]);

  // Stop audio when leaving the page.
  useEffect(() => {
    return () => {
      stopLoop();
      releaseAllLiveNotes();
      if (metronomeRef.current) {
        window.clearInterval(metronomeRef.current);
      }
    };
  }, []);

  // Restart the loop whenever the backing inputs change while playing.
  useEffect(() => {
    if (!isPlaying) {
      return;
    }
    void startLoop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vibe, grid, trackMix, tempo]);

  // Metronome click on each beat while playing.
  useEffect(() => {
    if (metronomeRef.current) {
      window.clearInterval(metronomeRef.current);
      metronomeRef.current = 0;
    }
    if (!isPlaying || !metronomeOn || !audioEnabled) {
      return;
    }
    metronomeRef.current = window.setInterval(() => {
      void triggerNote("C2", { voiceId: "hat", audioEnabled, velocity: 0.5 });
    }, beatMs);
    return () => {
      if (metronomeRef.current) {
        window.clearInterval(metronomeRef.current);
        metronomeRef.current = 0;
      }
    };
  }, [isPlaying, metronomeOn, beatMs, audioEnabled]);

  async function startLoop() {
    const pattern = vibeBackingPattern(vibe, grid);
    const handle = await playLoop(pattern, {
      audioEnabled,
      bpm: tempo,
      trackMix,
      onStateChange: setStatus,
      onLoop: () => {
        // Realign the recording clock to each loop origin.
        if (recordingRef.current) {
          recordStartRef.current = performance.now();
        }
      },
      onStep: (event) => {
        if (event.track === "drums" && typeof event.startBeat === "number") {
          const step = Math.round((event.startBeat % 4) / (4 / BEAT_STEPS));
          setActiveStep(step % BEAT_STEPS);
        }
      }
    });
    loopRef.current = handle;
  }

  async function runCountIn() {
    for (let beat = 4; beat >= 1; beat -= 1) {
      setCountInDisplay(beat);
      if (audioEnabled) {
        void triggerNote("C2", { voiceId: "hat", audioEnabled, velocity: 0.6 });
      }
      await delay(beatMs);
    }
    setCountInDisplay(0);
  }

  async function startPlayback() {
    if (countInOn) {
      await runCountIn();
    }
    recordStartRef.current = performance.now();
    await startLoop();
  }

  function stopPlayback() {
    stopLoop(setStatus);
    loopRef.current = undefined;
    setActiveStep(-1);
  }

  function togglePlay() {
    if (isPlaying || countIn > 0) {
      stopPlayback();
      return;
    }
    void startPlayback();
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

  function applyCustomVibe() {
    const next = createCustomVibe(customDraft);
    chooseVibe(next);
    setShowCustom(false);
  }

  function toggleDraftNumeral(numeral: string) {
    setCustomDraft((current) => {
      const exists = current.numerals.includes(numeral);
      const numerals = exists
        ? current.numerals.filter((item) => item !== numeral)
        : [...current.numerals, numeral];
      return { ...current, numerals };
    });
  }

  function chooseBeat(id: string) {
    setBeatId(id);
    setGrid(cloneDrumGrid(beatById(id)?.grid ?? []));
  }

  function toggleCell(rowIndex: number, step: number) {
    setBeatId("custom");
    setGrid((current) =>
      current.map((cells, r) =>
        r === rowIndex ? cells.map((on, s) => (s === step ? !on : on)) : cells
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

  function currentBeat(): number {
    return (performance.now() - recordStartRef.current) / beatMs;
  }

  function pressKey(rawNote: string) {
    const played = snap ? snapToScale(rawNote, soloPitchClasses) : rawNote;
    void triggerNoteAttack(played, { voiceId, audioEnabled });
    setHeld((current) => (current.includes(played) ? current : [...current, played]));

    if (recordingRef.current && !openNotesRef.current.has(rawNote)) {
      openNotesRef.current.set(rawNote, {
        played,
        startBeat: quantizeBeatPosition(Math.max(0, currentBeat()), 0.25)
      });
    }
  }

  function releaseKey(rawNote: string) {
    const open = openNotesRef.current.get(rawNote);
    const played = open?.played ?? (snap ? snapToScale(rawNote, soloPitchClasses) : rawNote);
    triggerNoteRelease(played, { voiceId });
    setHeld((current) => current.filter((item) => item !== played));

    if (open) {
      openNotesRef.current.delete(rawNote);
      const end = quantizeBeatPosition(Math.max(0, currentBeat()), 0.25);
      const durationBeats = Math.max(0.25, end - open.startBeat);
      setCaptured((current) => [
        ...current,
        { note: open.played, startBeat: open.startBeat, durationBeats }
      ]);
    }
  }

  function shiftOctave(delta: number) {
    releaseAllLiveNotes();
    openNotesRef.current.clear();
    setHeld([]);
    setOctave((current) => Math.min(6, Math.max(2, current + delta)));
  }

  function toggleRecord() {
    if (recordingRef.current) {
      recordingRef.current = false;
      setRecording(false);
      openNotesRef.current.clear();
      return;
    }
    setCaptured([]);
    setSavedTitle(null);
    openNotesRef.current.clear();
    recordingRef.current = true;
    setRecording(true);
    if (!isPlaying && countIn === 0) {
      void startPlayback();
    } else {
      recordStartRef.current = performance.now();
    }
  }

  function saveTake() {
    if (captured.length === 0) {
      return;
    }
    const title = `${vibe.label} jam`;
    const sketch = createSketchFromJam({
      title,
      key: vibe.tonic,
      mode: vibe.mode,
      bpm: tempo,
      numerals: vibe.numerals,
      bassRoots: chords.map(bassRootFor),
      capturedMelody: captured
    });
    saveSongSketch(sketch);
    setSavedTitle(title);
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

  // Global QWERTY: last-mounted instrument wins via the shared owner stack.
  const hotkeyMap = useMemo(() => {
    const map: Record<string, { label?: string; onDown?: () => void; onUp?: () => void }> = {};
    keyNotesForOctave(octave).forEach(({ key, note }) => {
      map[key] = {
        label: note,
        onDown: () => pressKey(note),
        onUp: () => releaseKey(note)
      };
    });
    map.z = { onDown: () => shiftOctave(-1) };
    map.x = { onDown: () => shiftOctave(1) };
    map["?"] = { onDown: () => setShowCheat((value) => !value) };
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [octave, voiceId, snap, soloPitchClasses]);

  useInstrumentHotkeys({ map: hotkeyMap, onReleaseAll: () => setHeld([]) });

  const keys = keyboardKeys(4).concat(keyboardKeys(5));
  const qwertyForNote = useMemo(() => {
    const lookup = new Map<string, string>();
    keyNotesForOctave(octave).forEach(({ key, note }) => lookup.set(note, key));
    return lookup;
  }, [octave]);
  const draftNumerals = customDraft.mode === "minor" ? MINOR_NUMERALS : MAJOR_NUMERALS;

  return (
    <section className="jam-room" aria-labelledby="jam-room-title">
      <header className="jam-room__head">
        <h2 id="jam-room-title">Jam Room</h2>
        <p>
          Pick a vibe and a beat, shape the mix and FX, then noodle on the keys
          with your mouse or computer keyboard. Highlighted notes fit the loop.
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
        <button
          type="button"
          className={["jam-vibe", vibe.id === "custom" ? "is-active" : ""]
            .filter(Boolean)
            .join(" ")}
          aria-pressed={showCustom}
          onClick={() => setShowCustom((value) => !value)}
        >
          <strong>Custom</strong>
          <span>Build your own progression.</span>
          <span className="jam-vibe__meta">
            <Sliders size={12} /> {showCustom ? "close" : "open"}
          </span>
        </button>
      </div>

      {showCustom && (
        <div className="jam-custom" aria-label="Custom progression builder">
          <div className="jam-custom__row">
            <label>
              Key
              <select
                value={customDraft.tonic}
                onChange={(event) =>
                  setCustomDraft((current) => ({ ...current, tonic: event.target.value }))
                }
              >
                {KEY_CHOICES.map((choice) => (
                  <option key={choice} value={choice}>
                    {choice}
                  </option>
                ))}
              </select>
            </label>
            <div className="jam-custom__mode" role="radiogroup" aria-label="Mode">
              {(["major", "minor"] as KeyMode[]).map((modeChoice) => (
                <button
                  key={modeChoice}
                  type="button"
                  role="radio"
                  aria-checked={customDraft.mode === modeChoice}
                  className={customDraft.mode === modeChoice ? "is-active" : ""}
                  onClick={() =>
                    setCustomDraft((current) => ({
                      ...current,
                      mode: modeChoice,
                      scaleTopic: CUSTOM_SCALE_TOPICS[modeChoice][0]
                    }))
                  }
                >
                  {modeChoice}
                </button>
              ))}
            </div>
            <label className="jam-tempo">
              Tempo
              <input
                type="range"
                min={60}
                max={160}
                step={1}
                value={customDraft.bpm}
                onChange={(event) =>
                  setCustomDraft((current) => ({
                    ...current,
                    bpm: Number(event.target.value)
                  }))
                }
                aria-label="Custom tempo"
              />
              <span className="jam-tempo__value">{customDraft.bpm} BPM</span>
            </label>
          </div>

          <div className="jam-custom__numerals" aria-label="Add chords">
            {draftNumerals.map((numeral) => (
              <button
                key={numeral}
                type="button"
                aria-pressed={customDraft.numerals.includes(numeral)}
                className={customDraft.numerals.includes(numeral) ? "is-active" : ""}
                onClick={() => toggleDraftNumeral(numeral)}
              >
                {numeral}
              </button>
            ))}
          </div>

          <div className="jam-custom__preview">
            <span>{customDraft.numerals.join(" · ") || "Pick some chords"}</span>
            <button
              type="button"
              className="button button--primary"
              onClick={applyCustomVibe}
              disabled={customDraft.numerals.length === 0}
            >
              Use this loop
            </button>
          </div>
        </div>
      )}

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
        <button
          type="button"
          className={["button", recording ? "is-recording" : ""].filter(Boolean).join(" ")}
          onClick={toggleRecord}
          aria-pressed={recording}
        >
          <Circle size={16} /> {recording ? "Recording…" : "Record take"}
        </button>
        <button type="button" className="button" onClick={shuffleVibe}>
          <Shuffle size={16} /> Surprise me
        </button>
        <button
          type="button"
          className="button"
          onClick={() => setShowCheat((value) => !value)}
          aria-pressed={showCheat}
        >
          <Keyboard size={16} /> Keys
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
          {countIn > 0
            ? `Count-in ${countIn}`
            : audioEnabled
              ? audioPlaybackLabel(status)
              : "Audio off"}
        </span>
      </div>

      <div className="jam-toggles">
        <label className="jam-toggle">
          <input
            type="checkbox"
            checked={countInOn}
            onChange={(event) => setCountInOn(event.target.checked)}
          />
          Count-in
        </label>
        <label className="jam-toggle">
          <input
            type="checkbox"
            checked={metronomeOn}
            onChange={(event) => setMetronomeOn(event.target.checked)}
          />
          Metronome
        </label>
        <label className="jam-toggle">
          <input
            type="checkbox"
            checked={snap}
            onChange={(event) => setSnap(event.target.checked)}
          />
          Fit to scale
        </label>
        <label className="jam-voice">
          Voice
          <select
            value={voiceId}
            onChange={(event) => setVoiceId(event.target.value as LiveVoiceId)}
          >
            {PLAYER_VOICES.map((voice) => (
              <option key={voice.id} value={voice.id}>
                {voice.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="jam-fx" aria-label="Live effects">
        <label className="jam-fx__control">
          Reverb
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={reverb}
            onChange={(event) => setReverb(Number(event.target.value))}
            aria-label="Reverb amount"
          />
          <span>{reverb}%</span>
        </label>
        <label className="jam-fx__control">
          Delay
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={delayFx}
            onChange={(event) => setDelayFx(Number(event.target.value))}
            aria-label="Delay amount"
          />
          <span>{delayFx}%</span>
        </label>
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
                  className={["jam-channel__mute", channel.muted ? "is-muted" : ""]
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

      {(recording || captured.length > 0) && (
        <div className="jam-take" role="status" aria-live="polite">
          <span className="jam-take__count">
            {recording
              ? `Recording · ${captured.length} note${captured.length === 1 ? "" : "s"}`
              : `Take ready · ${captured.length} note${captured.length === 1 ? "" : "s"}`}
          </span>
          <button
            type="button"
            className="button"
            onClick={saveTake}
            disabled={captured.length === 0}
          >
            <Save size={16} /> Save to Song Lab
          </button>
          <button type="button" className="button" onClick={sendToSongLab}>
            <Music3 size={16} /> Open Song Lab
          </button>
          {savedTitle && (
            <span className="jam-take__saved">Saved “{savedTitle}”.</span>
          )}
        </div>
      )}

      <div className="jam-keyboard-wrap">
        <div className="jam-keyboard" aria-label="Play-over keyboard">
          {keys.map((key) => {
            const pc = pitchClassOf(key.note);
            const inScale = soloPitchClasses.has(pc);
            const isHeld = held.includes(key.note);
            const hint = qwertyForNote.get(key.note);

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
              >
                {hint && <span className="jam-key__hint">{hint.toUpperCase()}</span>}
              </button>
            );
          })}
        </div>
        <p className="jam-keyboard__caption">
          Octave {octave} · press <kbd>Z</kbd>/<kbd>X</kbd> to shift · <kbd>?</kbd>{" "}
          for the key map
        </p>
      </div>

      {showCheat && (
        <div
          className="jam-cheat"
          role="dialog"
          aria-label="Keyboard shortcuts"
          aria-modal="false"
        >
          <div className="jam-cheat__head">
            <strong>Keyboard</strong>
            <button
              type="button"
              className="button button--ghost"
              onClick={() => setShowCheat(false)}
            >
              Close
            </button>
          </div>
          <ul className="jam-cheat__list">
            <li>
              <kbd>A</kbd>–<kbd>K</kbd> white keys, <kbd>W E T Y U</kbd> sharps
            </li>
            <li>
              <kbd>Z</kbd> / <kbd>X</kbd> octave down / up
            </li>
            <li>
              <kbd>?</kbd> toggle this help
            </li>
            <li>Fit to scale snaps stray notes into the vibe.</li>
          </ul>
        </div>
      )}
    </section>
  );
}
