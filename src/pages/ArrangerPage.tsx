import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Copy,
  FileAudio,
  Layers,
  Music3,
  Play,
  Plus,
  Trash2
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  playSongSketch,
  renderSongSketchToWav,
  stopAudioPlayback
} from "../lib/audioEngine";
import type { AudioPlaybackState } from "../lib/audioEngine";
import {
  addSection,
  createArrangement,
  duplicateSection,
  flattenArrangement,
  moveSection,
  removeSection,
  totalBars,
  type SectionLabel
} from "../lib/songArranger";
import { explainProgression } from "../lib/chordSuggest";
import { useProgress } from "../state/progress";

const SECTION_LABELS: SectionLabel[] = [
  "Intro",
  "Verse",
  "Chorus",
  "Bridge",
  "Outro"
];

/**
 * Song arranger: chain named sections (Intro/Verse/Chorus/Bridge/Outro) into a
 * full song, then play or export the flattened result with the existing engine.
 * Each section starts from the full-band starter loop; this page focuses on
 * structure and order. Detailed per-bar editing stays in Song Lab.
 */
export function ArrangerPage() {
  const { progress, saveSongSketch } = useProgress();
  const [arrangement, setArrangement] = useState(() =>
    createArrangement("My song")
  );
  const [status, setStatus] = useState<AudioPlaybackState | "saved" | "idle">(
    "idle"
  );
  const [message, setMessage] = useState("");

  const flattened = useMemo(
    () => flattenArrangement(arrangement),
    [arrangement]
  );
  const overview = useMemo(
    () => explainProgression(flattened.tracks.chords, flattened.mode ?? "major"),
    [flattened]
  );

  async function playSong() {
    if (status === "playing" || status === "loading") {
      stopAudioPlayback((state) => setStatus(state));
      return;
    }

    await playSongSketch(flattened, {
      audioEnabled: progress.settings.audioEnabled,
      onStateChange: (state) => setStatus(state)
    });
  }

  function saveAsSketch() {
    saveSongSketch(flattened);
    setStatus("saved");
    setMessage(`Saved the full ${totalBars(arrangement)}-bar song as a sketch.`);
  }

  async function exportWav() {
    setStatus("loading");
    const blob = await renderSongSketchToWav(flattened, {
      audioEnabled: progress.settings.audioEnabled
    });
    setStatus("idle");

    if (!blob) {
      setMessage("WAV export needs audio enabled and offline-render support.");
      return;
    }

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const safeName =
      arrangement.title.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "") ||
      "chords-lab-song";
    anchor.href = url;
    anchor.download = `${safeName}.wav`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    setMessage(`Exported "${arrangement.title}" as a WAV audio file.`);
  }

  return (
    <div className="page-stack">
      <section className="section-heading">
        <span className="eyebrow">
          <Layers size={16} aria-hidden="true" /> Song Lab
        </span>
        <h1>Arranger</h1>
        <p>
          Chain sections into a full song, then play or export the whole thing.
          Reorder, duplicate, and remove sections; playback only starts when you
          press play.
        </p>
      </section>

      <section className="arranger" aria-label="Song arrangement">
        <div className="arranger__controls">
          <label>
            Title
            <input
              value={arrangement.title}
              onChange={(event) =>
                setArrangement((current) => ({
                  ...current,
                  title: event.currentTarget.value
                }))
              }
            />
          </label>
          <div className="arranger__add" role="group" aria-label="Add a section">
            {SECTION_LABELS.map((label) => (
              <button
                key={label}
                type="button"
                className="button button--quiet"
                onClick={() =>
                  setArrangement((current) => addSection(current, label))
                }
              >
                <Plus size={15} aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>
        </div>

        <ol className="arranger__sections">
          {arrangement.sections.map((section, index) => (
            <li key={section.id} className="arranger__section">
              <span className="arranger__section-index">{index + 1}</span>
              <span className="arranger__section-label">
                <strong>{section.label}</strong>
                <small>
                  {section.sketch.form.length} bars ·{" "}
                  {section.sketch.tracks.chords.join(" ")}
                </small>
              </span>
              <span className="arranger__section-actions">
                <button
                  type="button"
                  className="text-button"
                  aria-label={`Move ${section.label} up`}
                  disabled={index === 0}
                  onClick={() =>
                    setArrangement((current) =>
                      moveSection(current, section.id, "up")
                    )
                  }
                >
                  <ArrowUp size={15} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="text-button"
                  aria-label={`Move ${section.label} down`}
                  disabled={index === arrangement.sections.length - 1}
                  onClick={() =>
                    setArrangement((current) =>
                      moveSection(current, section.id, "down")
                    )
                  }
                >
                  <ArrowDown size={15} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="text-button"
                  onClick={() =>
                    setArrangement((current) =>
                      duplicateSection(current, section.id)
                    )
                  }
                >
                  <Copy size={15} aria-hidden="true" />
                  Duplicate
                </button>
                <button
                  type="button"
                  className="text-button"
                  disabled={arrangement.sections.length <= 1}
                  onClick={() =>
                    setArrangement((current) =>
                      removeSection(current, section.id)
                    )
                  }
                >
                  <Trash2 size={15} aria-hidden="true" />
                  Remove
                </button>
              </span>
            </li>
          ))}
        </ol>

        <div className="arranger__transport">
          <button className="button" type="button" onClick={playSong}>
            <Play size={18} aria-hidden="true" />
            {status === "playing" || status === "loading"
              ? "Stop song"
              : "Play full song"}
          </button>
          <button
            className="button button--secondary"
            type="button"
            onClick={saveAsSketch}
          >
            <Music3 size={18} aria-hidden="true" />
            Save as sketch
          </button>
          <button className="button button--quiet" type="button" onClick={exportWav}>
            <FileAudio size={18} aria-hidden="true" />
            Export WAV
          </button>
          <Link className="button button--quiet" to="/lab/song">
            Open Song Lab
          </Link>
        </div>

        <p className="arranger__summary">
          {totalBars(arrangement)} bars total · {overview}
        </p>
        {message ? <p role="status">{message}</p> : null}
      </section>
    </div>
  );
}
