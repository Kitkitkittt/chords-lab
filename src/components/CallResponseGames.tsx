import { useCallback, useEffect, useRef, useState } from "react";
import { CallResponseStage } from "./CallResponseStage";
import { playRhythm, playSequence } from "../lib/audioEngine";
import {
  detectClapOnset,
  scoreClapBack,
  scoreSingBack,
  type ClapBackScore,
  type SingBackScore
} from "../lib/callResponse";
import { detectPitchAutocorrelation } from "../lib/pitchDetect";
import { useProgress } from "../state/progress";
type Mode = "sing" | "clap";
type ListenStatus = "idle" | "listening" | "denied" | "unsupported";
const SING_TARGETS = ["C4", "D4", "E4", "G4", "A4"];
const CLAP_PATTERNS: readonly (readonly ("hit" | "rest")[])[] = [
  ["hit", "rest", "hit", "rest", "hit", "rest", "hit", "rest"],
  ["hit", "rest", "rest", "hit", "hit", "rest", "rest", "hit"],
  ["hit", "hit", "rest", "rest", "hit", "rest", "hit", "rest"],
  ["hit", "rest", "hit", "hit", "rest", "hit", "rest", "rest"]
];
const CLAP_BPM = 120;
export function CallResponseGames() {
  const { progress } = useProgress();
  const audioEnabled = progress.settings.audioEnabled;
  const [mode, setMode] = useState<Mode>("sing");
  const [singIndex, setSingIndex] = useState(0);
  const [clapIndex, setClapIndex] = useState(0);
  const [status, setStatus] = useState<ListenStatus>("idle");
  const [singResult, setSingResult] = useState<SingBackScore | null>(null);
  const [clapResult, setClapResult] = useState<ClapBackScore | null>(null);
  const [onsets, setOnsets] = useState<number[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const sessionRef = useRef(0);
  const previousRmsRef = useRef(0);
  const onsetOriginRef = useRef<number | null>(null);
  const lastOnsetRef = useRef<number | null>(null);
  const onsetsRef = useRef<number[]>([]);
  const targetNote = SING_TARGETS[singIndex] ?? SING_TARGETS[0];
  const clapPattern = CLAP_PATTERNS[clapIndex] ?? CLAP_PATTERNS[0];
  const releaseAudio = useCallback(() => {
    sessionRef.current += 1;
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    void audioContextRef.current?.close();
    audioContextRef.current = null;
  }, []);
  const stopListening = useCallback(() => {
    releaseAudio();
    setStatus("idle");
  }, [releaseAudio]);
  const resetRound = useCallback(() => {
    stopListening();
    setSingResult(null);
    setClapResult(null);
    onsetOriginRef.current = null;
    lastOnsetRef.current = null;
    onsetsRef.current = [];
    setOnsets([]);
  }, [stopListening]);
  const recordOnset = useCallback((time: number) => {
    const origin = onsetOriginRef.current ?? time;
    onsetOriginRef.current = origin;
    const next = [...onsetsRef.current, time - origin];
    onsetsRef.current = next;
    setOnsets(next);
  }, []);
  const startListening = useCallback(async () => {
    resetRound();
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof window === "undefined" ||
      !window.AudioContext
    ) {
      setStatus("unsupported");
      return;
    }
    const session = sessionRef.current;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });
      if (session !== sessionRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      const audioContext = new window.AudioContext();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      const buffer = new Float32Array(analyser.fftSize);
      previousRmsRef.current = 0;
      setStatus("listening");
      const tick = () => {
        if (session !== sessionRef.current) {
          return;
        }
        analyser.getFloatTimeDomainData(buffer);
        if (mode === "sing") {
          const frequency = detectPitchAutocorrelation(buffer, audioContext.sampleRate);
          const result = frequency ? scoreSingBack(targetNote, frequency) : null;
          if (result) {
            setSingResult(result);
            stopListening();
            return;
          }
        } else {
          const clap = detectClapOnset(buffer, previousRmsRef.current);
          previousRmsRef.current = clap.rms;
          const now = performance.now();
          if (
            clap.onset &&
            (lastOnsetRef.current === null || now - lastOnsetRef.current >= 120)
          ) {
            lastOnsetRef.current = now;
            recordOnset(now);
          }
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      releaseAudio();
      setStatus("denied");
    }
  }, [mode, recordOnset, releaseAudio, resetRound, stopListening, targetNote]);
  const checkClaps = useCallback(() => {
    stopListening();
    setClapResult(scoreClapBack(clapPattern, onsetsRef.current, CLAP_BPM));
  }, [clapPattern, stopListening]);
  const chooseMode = useCallback(
    (nextMode: Mode) => {
      if (nextMode === mode) {
        return;
      }
      resetRound();
      setMode(nextMode);
    },
    [mode, resetRound]
  );
  useEffect(() => releaseAudio, [releaseAudio]);
  useEffect(() => {
    if (mode !== "clap" || (status !== "denied" && status !== "unsupported")) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space") {
        return;
      }
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        target.closest("button, input, select, textarea, [contenteditable='true']")
      ) {
        return;
      }
      event.preventDefault();
      recordOnset(performance.now());
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mode, recordOnset, status]);
  const usingTapFallback = mode === "clap" && (status === "denied" || status === "unsupported");
  const isListening = status === "listening";
  const singFeedback = singResult
    ? singResult.verdict === "match"
      ? `Matched. You sang ${singResult.detectedNote}.`
      : singResult.verdict === "low"
        ? `Slightly low. You sang ${singResult.detectedNote}.`
        : `Slightly high. You sang ${singResult.detectedNote}.`
    : "";
  const clapFeedback = clapResult
    ? `${clapResult.verdict === "match" ? "Matched" : clapResult.verdict === "close" ? "Close" : "Try again"}. Detected ${clapResult.detectedCount} claps.`
    : "";
  const statusText =
    status === "denied"
      ? mode === "clap"
        ? "Microphone access was blocked. Tap instead works without it."
        : "Microphone access was blocked. You can try again when it is available."
      : status === "unsupported"
        ? mode === "clap"
          ? "Microphone input is unavailable here. Tap instead works without it."
          : "Microphone input is unavailable here."
        : isListening
          ? mode === "sing"
            ? "Listening for one steady note."
            : `Listening. Detected ${onsets.length} claps.`
          : singFeedback || clapFeedback;
  const playTarget = () => {
    if (mode === "sing") {
      void playSequence("Call and response", [targetNote], { audioEnabled });
    } else {
      void playRhythm("Call and response", [...clapPattern], { audioEnabled });
    }
  };
  const newRound = () => {
    resetRound();
    if (mode === "sing") {
      setSingIndex((index) => (index + 1) % SING_TARGETS.length);
    } else {
      setClapIndex((index) => (index + 1) % CLAP_PATTERNS.length);
    }
  };
  return (
    <CallResponseStage
      mode={mode}
      isListening={isListening}
      usingTapFallback={usingTapFallback}
      onsetCount={onsets.length}
      statusText={statusText}
      onChooseMode={chooseMode}
      onHearTarget={playTarget}
      onNewRound={newRound}
      onStartListening={() => void startListening()}
      onStopListening={stopListening}
      onCheckClaps={checkClaps}
      onTap={() => recordOnset(performance.now())}
    />
  );
}
