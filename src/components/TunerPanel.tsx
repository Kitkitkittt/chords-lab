import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";
import {
  detectPitchAutocorrelation,
  frequencyToNote
} from "../lib/pitchDetect";

/**
 * Opt-in microphone tuner.
 *
 * The DSP + music math lives in the pure, tested core `src/lib/pitchDetect.ts`.
 * This component only wires the microphone: it is OFF by default, requests
 * permission only on an explicit button press, processes audio locally in the
 * browser, and never records, stores, or transmits anything. Stopping the tuner
 * fully releases the microphone track.
 */

type TunerReading = {
  note: string;
  cents: number;
  frequency: number;
};

type TunerStatus = "idle" | "listening" | "denied" | "unsupported";

export function TunerPanel() {
  const [status, setStatus] = useState<TunerStatus>("idle");
  const [reading, setReading] = useState<TunerReading | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);

  const stop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    void audioContextRef.current?.close();
    audioContextRef.current = null;

    setReading(null);
    setStatus("idle");
  }, []);

  useEffect(() => stop, [stop]);

  const start = useCallback(async () => {
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      setStatus("unsupported");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const AudioCtor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const audioContext = new AudioCtor();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);

      const buffer = new Float32Array(analyser.fftSize);
      setStatus("listening");

      const tick = () => {
        analyser.getFloatTimeDomainData(buffer);
        const frequency = detectPitchAutocorrelation(
          buffer,
          audioContext.sampleRate
        );

        if (frequency) {
          const note = frequencyToNote(frequency);

          if (note) {
            setReading({ note: note.note, cents: note.cents, frequency });
          }
        }

        rafRef.current = requestAnimationFrame(tick);
      };

      rafRef.current = requestAnimationFrame(tick);
    } catch {
      setStatus("denied");
    }
  }, []);

  const isListening = status === "listening";
  const cents = reading?.cents ?? 0;
  const inTune = reading != null && Math.abs(cents) <= 5;
  // Map -50..+50 cents to a 0..100% needle position.
  const needlePercent = Math.max(0, Math.min(100, 50 + cents));

  return (
    <section className="tool-panel" aria-labelledby="tuner-title">
      <h2 id="tuner-title">Microphone tuner</h2>
      <p>
        Optional and local. The tuner only listens after you start it, runs
        entirely in your browser, and records nothing. Stop it any time to fully
        release the microphone.
      </p>

      <div className="tool-panel__controls">
        {isListening ? (
          <button className="button button--secondary" type="button" onClick={stop}>
            <MicOff size={17} aria-hidden="true" />
            Stop listening
          </button>
        ) : (
          <button className="button" type="button" onClick={start}>
            <Mic size={17} aria-hidden="true" />
            Start tuner
          </button>
        )}
      </div>

      {status === "denied" ? (
        <p role="status">
          Microphone access was blocked. The tuner stays off until you allow it.
        </p>
      ) : null}
      {status === "unsupported" ? (
        <p role="status">
          This browser does not expose microphone input, so the tuner is
          unavailable here.
        </p>
      ) : null}

      {isListening ? (
        <div className="tuner-readout" aria-live="polite">
          <p className="tuner-readout__note">
            <strong>{reading ? reading.note : "—"}</strong>
            <span>
              {reading
                ? `${reading.frequency.toFixed(1)} Hz · ${
                    cents >= 0 ? "+" : ""
                  }${cents.toFixed(0)} cents`
                : "Play or sing a steady note"}
            </span>
          </p>
          <div
            className="tuner-meter"
            role="img"
            aria-label={
              reading
                ? `${reading.note}, ${inTune ? "in tune" : `${cents.toFixed(0)} cents ${cents > 0 ? "sharp" : "flat"}`}`
                : "Waiting for a note"
            }
          >
            <span className="tuner-meter__center" aria-hidden="true" />
            <span
              className="tuner-meter__needle"
              data-in-tune={inTune ? "true" : "false"}
              style={{ insetInlineStart: `${needlePercent}%` }}
              aria-hidden="true"
            />
          </div>
          <p className="tuner-readout__hint">
            {inTune ? "In tune" : "Aim for the center line"}
          </p>
        </div>
      ) : null}
    </section>
  );
}
