import { Circle, Download, Music3, Pause, Play, Save, Square } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { KeyboardFigure } from "../components/LessonComponents";
import {
  audioPlaybackLabel,
  playSongSketch,
  stopAudioPlayback
} from "../lib/audioEngine";
import type { AudioPlaybackState } from "../lib/audioEngine";
import {
  createDefaultSongSketch,
  exportSongSketches,
  songBassChoices,
  songChordChoices,
  songKeyChoices,
  songMelodyChoices,
  songVoiceChoices,
  updateSongSketch
} from "../lib/songSketches";
import { explainSongSketch, songLabTrackTypes } from "../lib/instruments";
import { useProgress } from "../state/progress";
import type { SongLabTrackType, SongSketch } from "../types/course";
import { theoryContextForSongSketch } from "../lib/theoryContext";

function cycleValue(values: string[], value: string): string {
  return values[(values.indexOf(value) + 1) % values.length];
}

type SeedProgression = {
  key: string;
  mode: "major" | "minor";
  numerals: string[];
};

function isSeedProgression(value: unknown): value is SeedProgression {
  if (!value || typeof value !== "object") {
    return false;
  }

  const seed = value as Record<string, unknown>;
  return (
    typeof seed.key === "string" &&
    (seed.mode === "major" || seed.mode === "minor") &&
    Array.isArray(seed.numerals) &&
    seed.numerals.every((item) => typeof item === "string") &&
    seed.numerals.length > 0
  );
}

/** Build a fresh sketch whose 8 chord bars are filled from a seeded progression. */
function sketchFromSeed(seed: SeedProgression): SongSketch {
  const base = createDefaultSongSketch("Playground loop");
  const barCount = base.tracks.chords.length;
  const chords = Array.from(
    { length: barCount },
    (_, index) => seed.numerals[index % seed.numerals.length]
  );

  return updateSongSketch(base, {
    key: seed.key,
    mode: seed.mode,
    tracks: { ...base.tracks, chords }
  });
}

export function SongLabPage() {
  const {
    progress,
    saveSongSketch
  } = useProgress();
  const location = useLocation();
  const seed = isSeedProgression(
    (location.state as { seedProgression?: unknown } | null)?.seedProgression
  )
    ? ((location.state as { seedProgression: SeedProgression }).seedProgression)
    : undefined;
  const [sketch, setSketch] = useState<SongSketch>(() =>
    seed
      ? sketchFromSeed(seed)
      : progress.savedSongSketches[0] ?? createDefaultSongSketch("Eight-bar loop")
  );
  const [status, setStatus] = useState<
    AudioPlaybackState | "saved" | "exported"
  >("idle");
  const [playbackBar, setPlaybackBar] = useState(-1);
  const [loopExplanation, setLoopExplanation] = useState("");

  const theoryContext = useMemo(
    () => theoryContextForSongSketch(sketch, playbackBar >= 0 ? playbackBar : 0),
    [playbackBar, sketch]
  );
  const activeNotes = theoryContext.safeMelodyNotes;

  useEffect(() => {
    return () => stopAudioPlayback();
  }, []);

  function updateSketch(updates: Partial<Omit<SongSketch, "id" | "createdAt">>) {
    setSketch((current) => updateSongSketch(current, updates));
  }

  function rename(title: string) {
    updateSketch({ title });
  }

  function toggleBeat(barIndex: number, beatIndex: number) {
    updateSketch({
      tracks: {
        ...sketch.tracks,
        drums: sketch.tracks.drums.map((bar, currentBar) =>
          currentBar === barIndex
            ? bar.map((beat, currentBeat) =>
                currentBeat === beatIndex ? !beat : beat
              )
            : bar
        )
      }
    });
  }

  function cycleTrack(
    track: "bass" | "chords" | "melody" | "voiceGuide",
    index: number
  ) {
    const values =
      track === "bass"
        ? songBassChoices
        : track === "chords"
          ? songChordChoices
          : track === "melody"
            ? songMelodyChoices
            : songVoiceChoices;

    updateSketch({
      tracks: {
        ...sketch.tracks,
        [track]: sketch.tracks[track].map((value, currentIndex) =>
          currentIndex === index ? cycleValue(values, value) : value
        )
      }
    });
  }

  function saveCurrentSketch() {
    saveSongSketch(sketch);
    setStatus("saved");
  }

  async function exportCurrentSketch() {
    await navigator.clipboard?.writeText(exportSongSketches([sketch]));
    setStatus("exported");
  }

  function toggleTrackList(field: "mutedTracks" | "soloTracks", track: SongLabTrackType) {
    updateSketch({
      [field]: sketch[field].includes(track)
        ? sketch[field].filter((item) => item !== track)
        : [...sketch[field], track]
    });
  }

  function regeneratePattern() {
    const generated = createDefaultSongSketch(sketch.title);
    updateSketch({
      form: generated.form,
      tracks: generated.tracks,
      mutedTracks: sketch.mutedTracks,
      soloTracks: sketch.soloTracks
    });
    setLoopExplanation("Pattern regenerated from the V6 full-band starter loop.");
  }

  function duplicateSection() {
    updateSketch({
      form: [...sketch.form.slice(0, 4), ...sketch.form.slice(0, 4)],
      tracks: {
        drums: [...sketch.tracks.drums.slice(0, 4), ...sketch.tracks.drums.slice(0, 4)],
        bass: [...sketch.tracks.bass.slice(0, 4), ...sketch.tracks.bass.slice(0, 4)],
        chords: [
          ...sketch.tracks.chords.slice(0, 4),
          ...sketch.tracks.chords.slice(0, 4)
        ],
        melody: [
          ...sketch.tracks.melody.slice(0, 4),
          ...sketch.tracks.melody.slice(0, 4)
        ],
        voiceGuide: [
          ...sketch.tracks.voiceGuide.slice(0, 4),
          ...sketch.tracks.voiceGuide.slice(0, 4)
        ]
      }
    });
    setLoopExplanation("First four bars duplicated into the second half.");
  }

  async function playSong() {
    if (status === "playing" || status === "loading") {
      stopAudioPlayback((state) => {
        setStatus(state);
        setPlaybackBar(-1);
      });
      return;
    }

    await playSongSketch(sketch, {
      audioEnabled: progress.settings.audioEnabled,
      onStateChange: (state) => {
        setStatus(state);
        if (state !== "playing" && state !== "loading") {
          setPlaybackBar(-1);
        }
      },
      onEvent: (event) => {
        const beatsPerBar = Number(sketch.meter.split("/")[0]) || 4;
        setPlaybackBar(Math.floor(event.startBeat / beatsPerBar));
      }
    });
  }

  return (
    <div className="page-stack">
      <section className="section-heading">
        <span className="eyebrow">Song Lab 3.0</span>
        <h1>Build a small loop</h1>
        <p>
          Edit eight bars of drums, bass, chords, melody, voice guide, and
          form. Playback only starts when you press play.
        </p>
      </section>

      <section className="song-lab" aria-label="Song builder">
        <div className="song-lab__controls">
          <section aria-labelledby="song-meta-title">
            <h2 id="song-meta-title">Sketch</h2>
            <label>
              Title
              <input
                value={sketch.title}
                onChange={(event) => rename(event.currentTarget.value)}
              />
            </label>
            <label>
              BPM
              <input
                type="number"
                min="56"
                max="160"
                value={sketch.bpm}
                onChange={(event) =>
                  updateSketch({ bpm: Number(event.currentTarget.value) })
                }
              />
            </label>
            <label>
              Key
              <select
                value={sketch.key ?? "C"}
                onChange={(event) =>
                  updateSketch({ key: event.currentTarget.value })
                }
              >
                {songKeyChoices.map((choice) => (
                  <option key={choice} value={choice}>
                    {choice}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Mode
              <select
                value={sketch.mode ?? "major"}
                onChange={(event) =>
                  updateSketch({
                    mode:
                      event.currentTarget.value === "minor" ? "minor" : "major"
                  })
                }
              >
                <option value="major">major</option>
                <option value="minor">minor</option>
              </select>
            </label>
          </section>

          <section aria-labelledby="song-track-mix-title">
            <h2 id="song-track-mix-title">Track mix</h2>
            <div className="track-mix-grid">
              {songLabTrackTypes.map((track) => (
                <div key={track}>
                  <strong>{track}</strong>
                  <button
                    type="button"
                    aria-pressed={sketch.mutedTracks.includes(track)}
                    onClick={() => toggleTrackList("mutedTracks", track)}
                  >
                    mute
                  </button>
                  <button
                    type="button"
                    aria-pressed={sketch.soloTracks.includes(track)}
                    onClick={() => toggleTrackList("soloTracks", track)}
                  >
                    solo
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section aria-labelledby="song-beat-title">
            <h2 id="song-beat-title">Drums</h2>
            <div className="song-grid">
              {sketch.tracks.drums.map((bar, barIndex) => (
                <div key={barIndex} className="song-grid__bar">
                  <span>{barIndex + 1}</span>
                  {bar.map((isActive, beatIndex) => (
                    <button
                      key={beatIndex}
                      type="button"
                      aria-pressed={isActive}
                      onClick={() => toggleBeat(barIndex, beatIndex)}
                    >
                      {isActive ? <Square size={15} /> : <Circle size={15} />}
                      {beatIndex + 1}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </section>

          {(["bass", "chords", "melody", "voiceGuide"] as const).map((track) => (
            <section key={track} aria-labelledby={`song-${track}-title`}>
              <h2 id={`song-${track}-title`}>{track}</h2>
              <div className="pattern-row pattern-row--wide">
                {sketch.tracks[track].map((value, index) => (
                  <button
                    key={`${track}-${index}-${value}`}
                    className={playbackBar === index ? "is-playing" : ""}
                    type="button"
                    onClick={() => cycleTrack(track, index)}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </section>
          ))}

          <section aria-labelledby="song-form-title">
            <h2 id="song-form-title">Form</h2>
            <div className="pattern-row pattern-row--wide" aria-label="Song form">
              {sketch.form.map((block, index) => (
                <span
                  key={`${block}-${index}`}
                  className={playbackBar === index ? "is-playing" : ""}
                >
                  {block}
                </span>
              ))}
            </div>
          </section>
        </div>

        <div className="song-lab__stage">
          <div className="song-lab__transport">
            <button className="button" type="button" onClick={playSong}>
              <Play size={18} aria-hidden="true" />
              {status === "playing" || status === "loading" ? "Stop loop" : "Play loop"}
            </button>
            <button className="button button--secondary" type="button" onClick={saveCurrentSketch}>
              <Save size={18} aria-hidden="true" />
              Save sketch
            </button>
            <button className="button button--quiet" type="button" onClick={exportCurrentSketch}>
              <Download size={18} aria-hidden="true" />
              Copy JSON
            </button>
            <button className="button button--quiet" type="button" onClick={regeneratePattern}>
              Regenerate
            </button>
            <button className="button button--quiet" type="button" onClick={duplicateSection}>
              Duplicate section
            </button>
            <button
              className="button button--quiet"
              type="button"
              onClick={() => setLoopExplanation(explainSongSketch(sketch))}
            >
              Explain loop
            </button>
            <Link className="button button--quiet" to="/lab/song/sketches">
              Saved sketches
            </Link>
            <p role="status">
              {status === "playing" ? (
                <>
                  <Pause size={16} aria-hidden="true" />
                  {audioPlaybackLabel(status)}
                </>
              ) : status === "loading" ||
                status === "stopped" ||
                status === "disabled" ||
                status === "error" ||
                status === "idle" ? (
                audioPlaybackLabel(status)
              ) : status === "saved" ? (
                "Sketch saved locally."
              ) : status === "exported" ? (
                "Sketch JSON copied."
              ) : (
                "Ready"
              )}
            </p>
          </div>

          <div className="song-lab__summary">
            <Music3 size={20} aria-hidden="true" />
            <div>
              <strong>{sketch.form.join(" ")}</strong>
              <span>
                Beat{" "}
                {sketch.tracks.drums[0]
                  .map((beat) => (beat ? "hit" : "rest"))
                  .join(" ")}
              </span>
              <span>Chord start {sketch.tracks.chords[0]}</span>
              <span>Voice guide {sketch.tracks.voiceGuide[0]}</span>
            </div>
          </div>

          <section className="theory-context-panel" aria-labelledby="theory-context-title">
            <span className="eyebrow">Theoretical Context</span>
            <h2 id="theory-context-title">
              {theoryContext.chord} in {theoryContext.key}
            </h2>
            <dl>
              <div>
                <dt>Scale</dt>
                <dd>{theoryContext.scaleNotes.join(" ")}</dd>
              </div>
              <div>
                <dt>Chord tones</dt>
                <dd>{theoryContext.chordTones.join(" ")}</dd>
              </div>
              <div>
                <dt>Safe melody notes</dt>
                <dd>{theoryContext.safeMelodyNotes.join(" ")}</dd>
              </div>
            </dl>
          </section>

          {loopExplanation ? (
            <p className="song-lab__explanation" role="status">
              {loopExplanation}
            </p>
          ) : null}

          <KeyboardFigure label="Song Lab safe notes" active={activeNotes} />
        </div>
      </section>
    </div>
  );
}
