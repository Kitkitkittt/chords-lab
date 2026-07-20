import { Copy, Download, Link2, Plus, Trash2 } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  createDefaultSongSketch,
  duplicateSongSketch,
  exportSongSketches,
  parseSongSketches
} from "../lib/songSketches";
import { downloadMidiBlob } from "../lib/midiFile";
import {
  buildShareUrl,
  decodeTokenToSketch,
  readSketchTokenFromHash,
  readSketchTokenFromShareTarget
} from "../lib/sketchShare";
import type { SongSketch } from "../types/course";
import { useProgress } from "../state/progress";

export function SongSketchesPage() {
  const {
    progress,
    saveSongSketch,
    deleteSongSketch,
    importSongSketches
  } = useProgress();
  const [importText, setImportText] = useState("");
  const [status, setStatus] = useState("");
  const exportText = useMemo(
    () => exportSongSketches(progress.savedSongSketches),
    [progress.savedSongSketches]
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const token =
      readSketchTokenFromHash(window.location.hash) ??
      readSketchTokenFromShareTarget(window.location.search);

    if (!token) {
      return;
    }

    const shared = decodeTokenToSketch(token);

    if (shared) {
      saveSongSketch(shared);
      setStatus(`Imported a shared sketch: "${shared.title}".`);
    } else {
      setStatus("That share link could not be read.");
    }

    window.history.replaceState(null, "", window.location.pathname);
  }, [saveSongSketch]);

  function addSketch() {
    saveSongSketch(createDefaultSongSketch("New eight-bar loop"));
    setStatus("New sketch saved locally.");
  }

  function duplicate(sketchId: string) {
    const sketch = progress.savedSongSketches.find((item) => item.id === sketchId);

    if (sketch) {
      saveSongSketch(duplicateSongSketch(sketch));
      setStatus("Sketch duplicated.");
    }
  }

  function downloadMidi(sketch: SongSketch) {
    const blob = downloadMidiBlob(sketch);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const safeName =
      sketch.title.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "") ||
      "chords-lab-loop";
    anchor.href = url;
    anchor.download = `${safeName}.mid`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    setStatus(`Exported "${sketch.title}" as a MIDI file.`);
  }

  async function shareSketch(sketch: SongSketch) {
    const origin =
      typeof window !== "undefined" ? window.location.origin : "https://chords.lab";
    const shareUrl = buildShareUrl(sketch, origin);

    try {
      await navigator.clipboard?.writeText(shareUrl);
      setStatus("Share link copied. It contains the whole loop, no account needed.");
    } catch {
      setStatus(shareUrl);
    }
  }

  async function copyExport() {
    await navigator.clipboard?.writeText(exportText);
    setStatus("Export JSON copied.");
  }

  function importSketches(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      const sketches = parseSongSketches(importText);
      importSongSketches(sketches);
      setImportText("");
      setStatus(`${sketches.length} sketch${sketches.length === 1 ? "" : "es"} imported.`);
    } catch {
      setStatus("Import failed. Paste JSON exported from Chords Lab.");
    }
  }

  return (
    <div className="page-stack">
      <section className="section-heading">
        <span className="eyebrow">Song Lab</span>
        <h1>Saved sketches</h1>
        <p>
          Local loops stay on this device. Export JSON before clearing browser
          storage or moving to another browser.
        </p>
      </section>

      <section className="sketch-toolbar" aria-label="Sketch actions">
        <button className="button" type="button" onClick={addSketch}>
          <Plus size={17} aria-hidden="true" />
          New sketch
        </button>
        <button className="button button--secondary" type="button" onClick={copyExport}>
          <Copy size={17} aria-hidden="true" />
          Copy export JSON
        </button>
        <Link className="button button--quiet" to="/lab/song">
          Open Song Lab
        </Link>
        <p role="status">{status}</p>
      </section>

      <section className="lesson-progress-list" aria-labelledby="saved-sketches">
        <h2 id="saved-sketches">Sketches</h2>
        {progress.savedSongSketches.length > 0 ? (
          <ol>
            {progress.savedSongSketches.map((sketch) => (
              <li key={sketch.id}>
                <span>
                  {sketch.title} · {sketch.bpm} bpm · {sketch.form.join(" ")}
                </span>
                <strong>
                  <button
                    className="text-button"
                    type="button"
                    onClick={() => duplicate(sketch.id)}
                  >
                    Duplicate
                  </button>
                  <button
                    className="text-button"
                    type="button"
                    onClick={() => shareSketch(sketch)}
                  >
                    <Link2 size={15} aria-hidden="true" />
                    Share link
                  </button>
                  <button
                    className="text-button"
                    type="button"
                    onClick={() => downloadMidi(sketch)}
                  >
                    <Download size={15} aria-hidden="true" />
                    MIDI
                  </button>
                  <button
                    className="text-button"
                    type="button"
                    onClick={() => deleteSongSketch(sketch.id)}
                  >
                    <Trash2 size={15} aria-hidden="true" />
                    Delete
                  </button>
                </strong>
              </li>
            ))}
          </ol>
        ) : (
          <p>No saved sketches yet.</p>
        )}
      </section>

      <form className="import-panel" onSubmit={importSketches}>
        <label>
          Import JSON
          <textarea
            rows={8}
            value={importText}
            onChange={(event) => setImportText(event.currentTarget.value)}
            placeholder="Paste exported Song Lab JSON"
          />
        </label>
        <button className="button button--secondary" type="submit">
          Import sketches
        </button>
      </form>
    </div>
  );
}
