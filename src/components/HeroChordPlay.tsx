import { useMemo, useState } from "react";
import { Eraser, Sparkles, Volume2 } from "lucide-react";
import { Note } from "tonal";
import {
  triggerNote,
  triggerNoteAttack,
  triggerNoteRelease
} from "../lib/audioEngine";
import { describeChordStack } from "../lib/interactionTools";
import { useProgress } from "../state/progress";

/**
 * Landing-page hook: a compact, playable two-octave keyboard. Pressing keys
 * sounds the note and, once three or more are held, names the chord in real
 * time. Designed to invite a first interaction within seconds of arriving.
 */

const KEYS: { pc: string; black: boolean }[] = [
  { pc: "C", black: false },
  { pc: "C#", black: true },
  { pc: "D", black: false },
  { pc: "D#", black: true },
  { pc: "E", black: false },
  { pc: "F", black: false },
  { pc: "F#", black: true },
  { pc: "G", black: false },
  { pc: "G#", black: true },
  { pc: "A", black: false },
  { pc: "A#", black: true },
  { pc: "B", black: false }
];

const OCTAVES = [4, 5];

// A few one-tap chord presets to spark exploration.
const PRESETS: { label: string; notes: string[] }[] = [
  { label: "C", notes: ["C4", "E4", "G4"] },
  { label: "Am", notes: ["A4", "C5", "E5"] },
  { label: "Fmaj7", notes: ["F4", "A4", "C5", "E5"] },
  { label: "G7", notes: ["G4", "B4", "D5", "F5"] }
];

function pitchClassOf(note: string): string {
  return Note.pitchClass(note) || note.replace(/[0-9]/g, "");
}

export function HeroChordPlay() {
  const { progress } = useProgress();
  const audioEnabled = progress.settings.audioEnabled;
  const [held, setHeld] = useState<string[]>([]);

  const heldPitchClasses = useMemo(
    () => new Set(held.map(pitchClassOf)),
    [held]
  );
  const detection = useMemo(() => describeChordStack(held), [held]);

  function press(note: string) {
    void triggerNoteAttack(note, { voiceId: "keys", audioEnabled });
    setHeld((current) =>
      current.includes(note) ? current : [...current, note]
    );
  }

  function release(note: string) {
    triggerNoteRelease(note, { voiceId: "keys" });
  }

  function playPreset(notes: string[]) {
    setHeld(notes);
    notes.forEach((note, index) => {
      window.setTimeout(() => {
        void triggerNote(note, { voiceId: "keys", audioEnabled, durationMs: 900 });
      }, index * 70);
    });
  }

  function clear() {
    setHeld([]);
  }

  const readout =
    held.length === 0
      ? "Press keys to build a chord"
      : detection.symbol
        ? detection.quality
          ? `${detection.symbol} · ${detection.quality}`
          : detection.label
        : `${held.map(pitchClassOf).join(" ")} · keep stacking`;

  return (
    <section className="hero-play" aria-labelledby="hero-play-title">
      <div className="hero-play__top">
        <span className="eyebrow">
          <Sparkles size={15} aria-hidden="true" /> Try it now
        </span>
        <h2 id="hero-play-title">Build a chord</h2>
        <p>Tap the keys. We name what you play.</p>
      </div>

      <div className="hero-play__readout" role="status" aria-live="polite">
        <strong>{detection.symbol ?? (held.length > 0 ? "…" : "—")}</strong>
        <span>{readout}</span>
      </div>

      <div className="hero-piano" aria-label="Mini keyboard">
        {OCTAVES.map((octave) => (
          <div key={octave} className="hero-piano__octave">
            {KEYS.map((key) => {
              const note = `${key.pc}${octave}`;
              const isHeld = held.includes(note) || heldPitchClasses.has(key.pc);

              return (
                <button
                  key={note}
                  type="button"
                  className={[
                    "hero-key",
                    key.black ? "hero-key--black" : "hero-key--white",
                    isHeld ? "is-held" : ""
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  aria-label={`${key.pc}${octave}`}
                  aria-pressed={isHeld}
                  onPointerDown={(event) => {
                    event.preventDefault();
                    press(note);
                  }}
                  onPointerUp={() => release(note)}
                  onPointerLeave={() => release(note)}
                  onPointerCancel={() => release(note)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      void triggerNote(note, { voiceId: "keys", audioEnabled });
                      setHeld((current) =>
                        current.includes(note)
                          ? current
                          : [...current, note]
                      );
                    }
                  }}
                />
              );
            })}
          </div>
        ))}
      </div>

      <div className="hero-play__presets" aria-label="Chord presets">
        <Volume2 size={15} aria-hidden="true" />
        {PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            className="hero-chip"
            onClick={() => playPreset(preset.notes)}
          >
            {preset.label}
          </button>
        ))}
        <button
          type="button"
          className="hero-chip hero-chip--clear"
          onClick={clear}
          disabled={held.length === 0}
        >
          <Eraser size={14} aria-hidden="true" />
          Clear
        </button>
      </div>
    </section>
  );
}
