import { CheckCircle2, Copy, Download, Upload } from "lucide-react";
import { useMemo, useState } from "react";
import {
  parseProgressImport,
  previewProgressImport,
  serializeProgressExport
} from "../lib/progressExport";
import { useProgress } from "../state/progress";

export function ProgressExportPage() {
  const { progress, importProgress } = useProgress();
  const [importText, setImportText] = useState("");
  const [status, setStatus] = useState<"idle" | "copied" | "imported" | "error">(
    "idle"
  );
  const exportText = useMemo(() => serializeProgressExport(progress), [progress]);
  const preview = useMemo(
    () => (importText.trim() ? previewProgressImport(importText) : undefined),
    [importText]
  );

  async function copyExport() {
    try {
      await navigator.clipboard?.writeText(exportText);
      setStatus("copied");
    } catch {
      setStatus("error");
    }
  }

  function confirmImport() {
    const nextProgress = parseProgressImport(importText);

    if (!nextProgress || !preview?.valid) {
      setStatus("error");
      return;
    }

    importProgress(nextProgress);
    setStatus("imported");
  }

  return (
    <div className="page-stack">
      <section className="section-heading">
        <span className="eyebrow">Progress portability</span>
        <h1>Export and import</h1>
        <p>
          Move local lessons, practice history, mastery, settings, and Song Lab
          sketches without creating an account.
        </p>
      </section>

      <section className="export-layout" aria-label="Progress export and import">
        <article className="export-panel">
          <div>
            <Download size={20} aria-hidden="true" />
            <h2>Export this device</h2>
          </div>
          <p>
            The bundle includes completed lessons, bookmarks, checks, practice
            sessions, adaptive review state, settings, and saved sketches.
          </p>
          <textarea readOnly value={exportText} aria-label="Progress export JSON" />
          <button className="button" type="button" onClick={copyExport}>
            <Copy size={18} aria-hidden="true" />
            Copy export JSON
          </button>
        </article>

        <article className="export-panel">
          <div>
            <Upload size={20} aria-hidden="true" />
            <h2>Import a bundle</h2>
          </div>
          <label>
            Paste progress JSON
            <textarea
              value={importText}
              onChange={(event) => setImportText(event.currentTarget.value)}
              aria-label="Progress import JSON"
            />
          </label>
          {preview ? (
            <div
              className={preview.valid ? "import-preview is-valid" : "import-preview is-invalid"}
              role="status"
            >
              <strong>{preview.valid ? "Import preview" : "Import problem"}</strong>
              <span>{preview.lessonCount} lessons</span>
              <span>{preview.sessionCount} sessions</span>
              <span>{preview.sketchCount} sketches</span>
              <span>{preview.skillCount} skills</span>
              {preview.warnings.map((warning) => (
                <em key={warning}>{warning}</em>
              ))}
            </div>
          ) : null}
          <button
            className="button button--secondary"
            type="button"
            disabled={!preview?.valid}
            onClick={confirmImport}
          >
            <CheckCircle2 size={18} aria-hidden="true" />
            Replace local progress
          </button>
        </article>
      </section>

      <p className="lab-status" role="status">
        {status === "copied"
          ? "Export JSON copied."
          : status === "imported"
            ? "Progress imported locally."
            : status === "error"
              ? "The export/import action could not complete."
              : ""}
      </p>
    </div>
  );
}
