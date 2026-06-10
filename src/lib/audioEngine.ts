import { normalizeNoteForPlayback } from "./music";
import type { InstrumentId, SongSketch } from "../types/course";

export type AudioPlaybackState =
  | "idle"
  | "loading"
  | "playing"
  | "stopped"
  | "disabled"
  | "error";

export type AudioUnlockStatus = "unknown" | "unlocked" | "blocked";

export type AudioEvent = {
  note?: string | string[];
  rest?: boolean;
  startBeat: number;
  durationBeats: number;
  velocity?: number;
  track?: string;
  /**
   * Optional explicit timbre for looped playback. When set, the loop engine
   * routes this event to that voice (e.g. a drum row's "kick"/"snare"). When
   * omitted, the loop maps the event's `track` to a default voice.
   */
  voice?: LiveVoiceId;
};

export type PlaybackPattern = {
  bpm: number;
  meter: string;
  events: AudioEvent[];
  mode: "sequence" | "chord" | "rhythm" | "song";
  label: string;
  instrumentId?: InstrumentId;
};

type PlaybackOptions = {
  audioEnabled: boolean;
  onStateChange?: (state: AudioPlaybackState) => void;
  onEvent?: (event: AudioEvent, index: number) => void;
};

type ManagedSynth = {
  triggerAttackRelease: (
    notes: string | string[],
    duration: number | string,
    time?: number,
    velocity?: number
  ) => void;
  releaseAll?: () => void;
  dispose: () => void;
};

type ActivePlayback = {
  id: number;
  synth: ManagedSynth;
  stateTimeout: number;
  eventTimeouts: number[];
  onStateChange?: (state: AudioPlaybackState) => void;
};

export const romanChordNotes: Record<string, string[]> = {
  I: ["C4", "E4", "G4"],
  vi: ["A3", "C4", "E4"],
  IV: ["F3", "A3", "C4"],
  V: ["G3", "B3", "D4"],
  ii: ["D3", "F3", "A3"],
  V7: ["G3", "B3", "D4", "F4"],
  I6: ["E3", "G3", "C4"],
  iii: ["E3", "G3", "B3"]
};

let activePlayback: ActivePlayback | undefined;
let playbackId = 0;
let audioUnlockStatus: AudioUnlockStatus = "unknown";

function emitAudioState(state: AudioPlaybackState): void {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent("chordslab:audio-state", { detail: state }));
}

function beatMs(pattern: PlaybackPattern): number {
  return 60000 / Math.max(30, pattern.bpm);
}

function isRest(event: AudioEvent): boolean {
  return event.rest || !event.note || event.note === "Rest";
}

function normalizePlayableNotes(note: string | string[]): string | string[] {
  return Array.isArray(note)
    ? note.map(normalizeNoteForPlayback)
    : normalizeNoteForPlayback(note);
}

export function getPlaybackDurationMs(pattern: PlaybackPattern): number {
  const endBeat = pattern.events.reduce(
    (end, event) => Math.max(end, event.startBeat + event.durationBeats),
    0
  );

  return Math.ceil(endBeat * beatMs(pattern) + 650);
}

export function sequencePattern(
  label: string,
  notes: string[],
  bpm = 96
): PlaybackPattern {
  return {
    label,
    bpm,
    meter: "4/4",
    mode: "sequence",
    events: notes.map((note, index) => ({
      note,
      rest: note === "Rest",
      startBeat: index * 0.7,
      durationBeats: note === "Rest" ? 0.35 : 0.5,
      velocity: 0.76,
      track: "melody"
    }))
  };
}

export function chordPattern(
  label: string,
  notes: string[],
  bpm = 84
): PlaybackPattern {
  return {
    label,
    bpm,
    meter: "4/4",
    mode: "chord",
    events: [
      {
        note: notes,
        startBeat: 0,
        durationBeats: 2,
        velocity: 0.7,
        track: "chord"
      }
    ]
  };
}

export function rhythmPattern(
  label: string,
  tokens: string[],
  bpm = 92
): PlaybackPattern {
  return {
    label,
    bpm,
    meter: tokens.length === 6 ? "6/8" : tokens.length === 5 ? "5/4" : "4/4",
    mode: "rhythm",
    events: tokens.map((token, index) => ({
      note: index % 2 === 0 ? "C4" : "G4",
      rest: token === "Rest" || token === "rest" || token.includes("rest") || token === "tie",
      startBeat: index * 0.5,
      durationBeats: token === "dotted-quarter" ? 0.75 : 0.35,
      velocity: 0.88,
      track: "rhythm"
    }))
  };
}

export function songSketchPattern(sketch: SongSketch): PlaybackPattern {
  const secondsPerBeat = 60 / Math.max(30, sketch.bpm);
  const beatsPerBar = Number(sketch.meter.split("/")[0]) || 4;
  const beatStep = 0.5;
  const events: AudioEvent[] = [];
  const activeTrack = (track: keyof SongSketch["tracks"]) =>
    sketch.soloTracks.length > 0
      ? sketch.soloTracks.includes(track)
      : !sketch.mutedTracks.includes(track);

  sketch.form.forEach((_, barIndex) => {
    const barStart = barIndex * beatsPerBar;
    const chord = sketch.tracks.chords[barIndex] ?? "I";

    if (activeTrack("chords")) {
      events.push({
        note: romanChordNotes[chord] ?? romanChordNotes.I,
        startBeat: barStart,
        durationBeats: Math.max(1.6, beatsPerBar * 0.55),
        velocity: 0.55,
        track: "chords"
      });
    }

    if (activeTrack("drums")) {
      sketch.tracks.drums[barIndex]?.forEach((isActive, beatIndex) => {
        if (isActive) {
          events.push({
            note: "C3",
            startBeat: barStart + beatIndex * beatStep,
            durationBeats: 0.12,
            velocity: 0.95,
            track: "drums"
          });
        }
      });
    }

    if (activeTrack("bass")) {
      events.push({
        note: sketch.tracks.bass[barIndex] ?? "C2",
        startBeat: barStart + 0.15,
        durationBeats: 0.4,
        velocity: 0.8,
        track: "bass"
      });
    }

    if (activeTrack("melody")) {
      events.push({
        note: sketch.tracks.melody[barIndex] ?? "E4",
        startBeat: barStart + 0.75,
        durationBeats: 0.35,
        velocity: 0.72,
        track: "melody"
      });
    }

    if (activeTrack("voiceGuide")) {
      const voiceNote = sketch.tracks.voiceGuide[barIndex];

      if (voiceNote && voiceNote !== "rest") {
        events.push({
          note: voiceNote,
          startBeat: barStart + 1.25,
          durationBeats: 0.45,
          velocity: 0.66,
          track: "voiceGuide"
        });
      }
    }
  });

  return {
    label: sketch.title,
    bpm: Math.round(60 / secondsPerBeat),
    meter: sketch.meter,
    mode: "song",
    events
  };
}

export function audioPlaybackLabel(state: AudioPlaybackState): string {
  const labels: Record<AudioPlaybackState, string> = {
    idle: "Ready",
    loading: "Loading audio",
    playing: "Playing",
    stopped: "Stopped",
    disabled: "Audio disabled",
    error: "Audio unavailable"
  };

  return labels[state];
}

export function getAudioUnlockStatus(): AudioUnlockStatus {
  return audioUnlockStatus;
}

export function stopAudioPlayback(
  onStateChange?: (state: AudioPlaybackState) => void
): void {
  if (!activePlayback) {
    onStateChange?.("stopped");
    return;
  }

  window.clearTimeout(activePlayback.stateTimeout);
  activePlayback.eventTimeouts.forEach((timeoutId) => window.clearTimeout(timeoutId));
  activePlayback.synth.releaseAll?.();
  activePlayback.synth.dispose();
  activePlayback.onStateChange?.("stopped");
  if (onStateChange && onStateChange !== activePlayback.onStateChange) {
    onStateChange("stopped");
  }
  activePlayback = undefined;
}

export async function playPattern(
  pattern: PlaybackPattern,
  options: PlaybackOptions
): Promise<AudioPlaybackState> {
  if (!options.audioEnabled) {
    options.onStateChange?.("disabled");
    emitAudioState("disabled");
    return "disabled";
  }

  stopAudioPlayback();
  options.onStateChange?.("loading");

  try {
    const Tone = await import("tone");
    await Tone.start();
    audioUnlockStatus = "unlocked";
    const synth = new Tone.PolySynth(Tone.Synth).toDestination() as ManagedSynth;
    const id = playbackId + 1;
    playbackId = id;
    const now = Tone.now() + 0.04;
    const secondsPerBeat = 60 / Math.max(30, pattern.bpm);

    pattern.events.forEach((event) => {
      if (isRest(event) || !event.note) {
        return;
      }

      synth.triggerAttackRelease(
        normalizePlayableNotes(event.note),
        Math.max(0.04, event.durationBeats * secondsPerBeat),
        now + event.startBeat * secondsPerBeat,
        event.velocity ?? 0.72
      );
    });

    const eventTimeouts = pattern.events.map((event, index) =>
      window.setTimeout(() => {
        if (activePlayback?.id === id) {
          options.onEvent?.(event, index);
        }
      }, Math.max(0, event.startBeat * beatMs(pattern)))
    );

    const stateTimeout = window.setTimeout(() => {
      if (activePlayback?.id !== id) {
        return;
      }

      synth.dispose();
      activePlayback = undefined;
      options.onStateChange?.("idle");
    }, getPlaybackDurationMs(pattern));

    activePlayback = {
      id,
      synth,
      stateTimeout,
      eventTimeouts,
      onStateChange: options.onStateChange
    };
    options.onStateChange?.("playing");
    return "playing";
  } catch {
    audioUnlockStatus = "blocked";
    options.onStateChange?.("error");
    emitAudioState("error");
    return "error";
  }
}

export async function playFeedbackTone(
  kind: "success" | "correction",
  options: Pick<PlaybackOptions, "audioEnabled" | "onStateChange"> = {
    audioEnabled: true
  }
): Promise<AudioPlaybackState> {
  if (!options.audioEnabled) {
    options.onStateChange?.("disabled");
    emitAudioState("disabled");
    return "disabled";
  }

  options.onStateChange?.("loading");

  try {
    const Tone = await import("tone");
    await Tone.start();
    audioUnlockStatus = "unlocked";
    const synth = new Tone.Synth().toDestination();
    const now = Tone.now() + 0.02;

    if (kind === "success") {
      synth.triggerAttackRelease("E5", 0.08, now, 0.38);
      synth.triggerAttackRelease("G5", 0.1, now + 0.09, 0.34);
    } else {
      synth.triggerAttackRelease("C4", 0.12, now, 0.32);
      synth.triggerAttackRelease("B3", 0.12, now + 0.12, 0.28);
    }

    options.onStateChange?.("playing");
    window.setTimeout(() => {
      synth.dispose();
      options.onStateChange?.("idle");
    }, kind === "success" ? 360 : 440);
    return "playing";
  } catch {
    audioUnlockStatus = "blocked";
    options.onStateChange?.("error");
    emitAudioState("error");
    return "error";
  }
}

export function playSequence(
  label: string,
  notes: string[],
  options: PlaybackOptions
): Promise<AudioPlaybackState> {
  return playPattern(sequencePattern(label, notes), options);
}

export function playChord(
  label: string,
  notes: string[],
  options: PlaybackOptions
): Promise<AudioPlaybackState> {
  return playPattern(chordPattern(label, notes), options);
}

export function playRhythm(
  label: string,
  tokens: string[],
  options: PlaybackOptions
): Promise<AudioPlaybackState> {
  return playPattern(rhythmPattern(label, tokens), options);
}

export function playSongSketch(
  sketch: SongSketch,
  options: PlaybackOptions
): Promise<AudioPlaybackState> {
  return playPattern(songSketchPattern(sketch), options);
}

// --------------------------------------------------------------------------
// Looping backing playback (Jam Room)
// --------------------------------------------------------------------------

export type LoopHandle = {
  /** Stop the loop and release its voice. */
  stop: () => void;
};

type LoopOptions = {
  audioEnabled: boolean;
  /** Beats-per-minute override; defaults to the pattern's own bpm. */
  bpm?: number;
  /**
   * Per-track mixer settings. Keys are track names found on the pattern's
   * events (e.g. "chords", "bass", "drums"). Missing tracks play at full level.
   */
  trackMix?: Record<string, { volumeDb?: number; muted?: boolean }>;
  onStateChange?: (state: AudioPlaybackState) => void;
  /** Fired at the start of each loop iteration with the 0-based count. */
  onLoop?: (iteration: number) => void;
  /** Fired for each non-rest event within an iteration. */
  onStep?: (event: AudioEvent, index: number) => void;
};

/** Map a logical track name to the voice used for looped playback. */
function loopVoiceForTrack(track: string | undefined): LiveVoiceId {
  switch (track) {
    case "bass":
      return "bass";
    case "drums":
      return "kick"; // overridden per-event by AudioEvent.voice for snare/hat/clap
    case "melody":
    case "arp":
      return "arp";
    case "pad":
      return "pad";
    case "chords":
    default:
      return "keys";
  }
}

let activeLoop: { id: number; dispose: () => void } | undefined;
let loopId = 0;

/** Stop any running backing loop. Safe to call when nothing is playing. */
export function stopLoop(onStateChange?: (state: AudioPlaybackState) => void): void {
  if (activeLoop) {
    activeLoop.dispose();
    activeLoop = undefined;
  }

  onStateChange?.("stopped");
}

/**
 * Play a pattern on repeat as a backing track, routing each event to a voice
 * chosen by its `voice` field or its `track`. Supports a per-track mixer
 * (volume + mute). Returns a handle to stop it. Each iteration reschedules its
 * own events so timing stays aligned to the grid.
 */
export async function playLoop(
  pattern: PlaybackPattern,
  options: LoopOptions
): Promise<LoopHandle> {
  const noop: LoopHandle = { stop: () => {} };

  if (!options.audioEnabled) {
    options.onStateChange?.("disabled");
    emitAudioState("disabled");
    return noop;
  }

  stopLoop();
  stopAudioPlayback();
  options.onStateChange?.("loading");

  try {
    const Tone = await import("tone");
    await Tone.start();
    audioUnlockStatus = "unlocked";

    const bpm = Math.max(40, options.bpm ?? pattern.bpm);
    const secondsPerBeat = 60 / bpm;
    const perBeatMs = 60000 / bpm;
    const loopBeats = pattern.events.reduce(
      (end, event) => Math.max(end, event.startBeat + event.durationBeats),
      0
    );
    const loopMs = Math.max(perBeatMs, loopBeats * perBeatMs);
    const id = loopId + 1;
    loopId = id;

    // Build one voice per distinct timbre used by this pattern.
    const neededVoices = new Set<LiveVoiceId>();
    pattern.events.forEach((event) => {
      neededVoices.add(event.voice ?? loopVoiceForTrack(event.track));
    });

    const loopVoices = new Map<LiveVoiceId, LiveVoice>();
    for (const voiceId of neededVoices) {
      const voice = createVoice(Tone, voiceId);
      loopVoices.set(voiceId, voice);
    }

    const mixForTrack = (track: string | undefined) =>
      (track && options.trackMix?.[track]) || undefined;

    const timeouts: number[] = [];
    let intervalHandle = 0;

    const scheduleIteration = (iteration: number) => {
      if (activeLoop?.id !== id) {
        return;
      }

      options.onLoop?.(iteration);
      const now = Tone.now() + 0.04;

      pattern.events.forEach((event, index) => {
        if (isRest(event) || !event.note) {
          return;
        }

        const mix = mixForTrack(event.track);
        if (mix?.muted) {
          return;
        }

        const voiceId = event.voice ?? loopVoiceForTrack(event.track);
        const voice = loopVoices.get(voiceId);
        if (!voice) {
          return;
        }

        if (voice.volume) {
          voice.volume.value = mix?.volumeDb ?? 0;
        }

        const startTime = now + event.startBeat * secondsPerBeat;

        if (isPercussion(voiceId)) {
          if (voiceId === "kick") {
            // MembraneSynth is pitched: (note, duration, time, velocity).
            voice.triggerAttackRelease(
              PERCUSSION_NOTE.kick ?? "C2",
              "16n",
              startTime,
              event.velocity ?? 0.9
            );
          } else {
            // NoiseSynth is unpitched: (duration, time, velocity).
            (voice.triggerAttackRelease as unknown as (
              duration: string,
              time: number,
              velocity?: number
            ) => void)("16n", startTime, event.velocity ?? 0.8);
          }
        } else {
          voice.triggerAttackRelease(
            normalizePlayableNotes(event.note),
            Math.max(0.04, event.durationBeats * secondsPerBeat),
            startTime,
            event.velocity ?? 0.6
          );
        }

        timeouts.push(
          window.setTimeout(() => {
            if (activeLoop?.id === id) {
              options.onStep?.(event, index);
            }
          }, Math.max(0, event.startBeat * perBeatMs))
        );
      });
    };

    const dispose = () => {
      if (intervalHandle) {
        window.clearInterval(intervalHandle);
      }

      timeouts.forEach((timeoutId) => window.clearTimeout(timeoutId));
      loopVoices.forEach((voice) => {
        voice.releaseAll?.();
        voice.dispose();
      });
      loopVoices.clear();
      options.onStateChange?.("idle");
    };

    activeLoop = { id, dispose };
    scheduleIteration(0);
    let iteration = 1;
    intervalHandle = window.setInterval(() => {
      // Clear the previous iteration's step timeouts before scheduling more.
      timeouts.splice(0).forEach((timeoutId) => window.clearTimeout(timeoutId));
      scheduleIteration(iteration);
      iteration += 1;
    }, loopMs);

    options.onStateChange?.("playing");

    return {
      stop: () => stopLoop(options.onStateChange)
    };
  } catch {
    audioUnlockStatus = "blocked";
    options.onStateChange?.("error");
    emitAudioState("error");
    return noop;
  }
}

// --------------------------------------------------------------------------
// Live instrument voices (tap-to-sound, press-and-hold sustain)
// --------------------------------------------------------------------------

/** Logical timbres used by the playable on-screen instruments. */
export type LiveVoiceId =
  | "keys"
  | "pluck"
  | "bass"
  | "voice"
  | "pad"
  | "arp"
  | "kick"
  | "snare"
  | "hat"
  | "clap";

type LiveVoice = {
  triggerAttack?: (note: string, time?: number, velocity?: number) => void;
  triggerRelease?: (note?: string, time?: number) => void;
  triggerAttackRelease: (
    note: string | string[],
    duration: number | string,
    time?: number,
    velocity?: number
  ) => void;
  releaseAll?: () => void;
  dispose: () => void;
  /** Optional output gain (decibels) for mixer control during looped playback. */
  volume?: { value: number };
};

type ToneModule = typeof import("tone");

let liveTone: ToneModule | undefined;
const liveVoices = new Map<LiveVoiceId, LiveVoice>();
/** Tracks which notes are currently held per voice for clean release. */
const heldNotes = new Map<LiveVoiceId, Set<string>>();

/** Map an on-screen instrument to its pitched live voice. */
export function liveVoiceForInstrument(instrumentId?: InstrumentId): LiveVoiceId {
  switch (instrumentId) {
    case "guitar":
    case "ukulele":
      return "pluck";
    case "bass":
      return "bass";
    case "voice":
      return "voice";
    default:
      return "keys";
  }
}

function createVoice(Tone: ToneModule, voiceId: LiveVoiceId): LiveVoice {
  switch (voiceId) {
    case "pluck":
      return new Tone.PluckSynth().toDestination() as unknown as LiveVoice;
    case "bass":
      return new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: "triangle" },
        envelope: { attack: 0.02, decay: 0.2, sustain: 0.6, release: 0.6 }
      }).toDestination() as unknown as LiveVoice;
    case "voice":
      return new Tone.PolySynth(Tone.AMSynth).toDestination() as unknown as LiveVoice;
    case "pad":
      return new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: "sine" },
        envelope: { attack: 0.6, decay: 0.3, sustain: 0.8, release: 1.4 }
      }).toDestination() as unknown as LiveVoice;
    case "arp":
      return new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: "triangle" },
        envelope: { attack: 0.005, decay: 0.18, sustain: 0.1, release: 0.2 }
      }).toDestination() as unknown as LiveVoice;
    case "kick":
      return new Tone.MembraneSynth().toDestination() as unknown as LiveVoice;
    case "snare":
    case "clap":
      return new Tone.NoiseSynth({
        noise: { type: voiceId === "snare" ? "white" : "pink" },
        envelope: { attack: 0.001, decay: 0.18, sustain: 0 }
      }).toDestination() as unknown as LiveVoice;
    case "hat":
      return new Tone.NoiseSynth({
        noise: { type: "white" },
        envelope: { attack: 0.001, decay: 0.05, sustain: 0 }
      }).toDestination() as unknown as LiveVoice;
    case "keys":
    default:
      return new Tone.PolySynth(Tone.Synth).toDestination() as unknown as LiveVoice;
  }
}

const PERCUSSION_VOICES: LiveVoiceId[] = ["kick", "snare", "hat", "clap"];
const PERCUSSION_NOTE: Record<string, string> = {
  kick: "C2",
  snare: "8n",
  hat: "16n",
  clap: "8n"
};

async function ensureVoice(voiceId: LiveVoiceId): Promise<LiveVoice | undefined> {
  try {
    if (!liveTone) {
      liveTone = await import("tone");
    }

    await liveTone.start();
    audioUnlockStatus = "unlocked";

    let voice = liveVoices.get(voiceId);

    if (!voice) {
      voice = createVoice(liveTone, voiceId);
      liveVoices.set(voiceId, voice);
      heldNotes.set(voiceId, new Set());
    }

    return voice;
  } catch {
    audioUnlockStatus = "blocked";
    return undefined;
  }
}

function isPercussion(voiceId: LiveVoiceId): boolean {
  return PERCUSSION_VOICES.includes(voiceId);
}

/** Begin a sustained note for press-and-hold playing. */
export async function triggerNoteAttack(
  note: string,
  options: { voiceId?: LiveVoiceId; audioEnabled?: boolean; velocity?: number } = {}
): Promise<void> {
  if (options.audioEnabled === false) {
    return;
  }

  const voiceId = options.voiceId ?? "keys";

  // Percussion has no sustain; fall back to a one-shot hit.
  if (isPercussion(voiceId)) {
    await triggerNote(note, options);
    return;
  }

  const voice = await ensureVoice(voiceId);

  if (!voice) {
    return;
  }

  const playable = normalizeNoteForPlayback(note);

  if (voice.triggerAttack) {
    voice.triggerAttack(playable, undefined, options.velocity ?? 0.8);
    heldNotes.get(voiceId)?.add(playable);
  } else {
    // Voices without attack/release (e.g. PluckSynth) play a one-shot.
    voice.triggerAttackRelease(playable, 0.6, undefined, options.velocity ?? 0.8);
  }
}

/** Release a sustained note started by `triggerNoteAttack`. */
export function triggerNoteRelease(
  note: string,
  options: { voiceId?: LiveVoiceId } = {}
): void {
  const voiceId = options.voiceId ?? "keys";
  const voice = liveVoices.get(voiceId);

  if (!voice || !voice.triggerRelease) {
    return;
  }

  const playable = normalizeNoteForPlayback(note);
  voice.triggerRelease(playable);
  heldNotes.get(voiceId)?.delete(playable);
}

/** One-shot note (keyboard activation, drum hits). */
export async function triggerNote(
  note: string,
  options: {
    voiceId?: LiveVoiceId;
    audioEnabled?: boolean;
    velocity?: number;
    durationMs?: number;
  } = {}
): Promise<void> {
  if (options.audioEnabled === false) {
    return;
  }

  const voiceId = options.voiceId ?? "keys";
  const voice = await ensureVoice(voiceId);

  if (!voice) {
    return;
  }

  const velocity = options.velocity ?? 0.85;

  if (isPercussion(voiceId)) {
    const value = PERCUSSION_NOTE[voiceId] ?? "8n";
    voice.triggerAttackRelease(value, "16n", undefined, velocity);
    return;
  }

  const duration = options.durationMs ? options.durationMs / 1000 : 0.5;
  voice.triggerAttackRelease(
    normalizeNoteForPlayback(note),
    Math.max(0.05, duration),
    undefined,
    velocity
  );
}

/** Release all held live notes (call on unmount or route change). */
export function releaseAllLiveNotes(): void {
  for (const [voiceId, voice] of liveVoices) {
    voice.releaseAll?.();
    heldNotes.get(voiceId)?.clear();
  }
}

/** Dispose every live voice (full teardown). */
export function disposeLiveVoices(): void {
  for (const voice of liveVoices.values()) {
    voice.releaseAll?.();
    voice.dispose();
  }

  liveVoices.clear();
  heldNotes.clear();
}

/**
 * Play a full drum-kit pattern (kick/snare/hat/clap rows) with per-step timing
 * and an optional cursor callback. Uses the live percussion voices so every row
 * is heard, not just the kick.
 */
export async function playDrumKit(
  rows: boolean[][],
  options: {
    audioEnabled?: boolean;
    bpm?: number;
    onStep?: (step: number) => void;
    onDone?: () => void;
  } = {}
): Promise<void> {
  if (options.audioEnabled === false) {
    return;
  }

  const stepCount = rows[0]?.length ?? 4;
  const stepMs = 60000 / Math.max(40, options.bpm ?? 96) / 2; // eighth-note grid
  const voices: LiveVoiceId[] = ["kick", "snare", "hat", "clap"];

  // Pre-warm the voices so the first hit is not delayed.
  await Promise.all(voices.map((voiceId) => ensureVoice(voiceId)));

  for (let step = 0; step < stepCount; step += 1) {
    window.setTimeout(() => {
      options.onStep?.(step);
      rows.forEach((row, rowIndex) => {
        if (row[step]) {
          void triggerNote("C2", {
            voiceId: voices[rowIndex] ?? "kick",
            audioEnabled: options.audioEnabled
          });
        }
      });

      if (step === stepCount - 1) {
        window.setTimeout(() => options.onDone?.(), stepMs);
      }
    }, step * stepMs);
  }
}
