import type {
  ImportPreview,
  ProgressExportBundle,
  ProgressState
} from "../types/course";
import { normalizeProgressState } from "./progressStorage";
import { CURRENT_SCHEMA_VERSION, isFutureSchema } from "./progressMigrations";

export const PROGRESS_EXPORT_SCHEMA_VERSION = CURRENT_SCHEMA_VERSION;
export const APP_VERSION = "0.1.0-v4";

/**
 * A backup is importable when neither the envelope nor the payload was written
 * by a build newer than this one. Older and unversioned backups are fine —
 * normalizeProgressState migrates them forward.
 */
function isImportable(
  parsed: Partial<ProgressExportBundle> | ProgressState,
  progressInput: unknown
): boolean {
  if (!progressInput || typeof progressInput !== "object") {
    return false;
  }

  if ("progress" in parsed && isFutureSchema(parsed)) {
    return false;
  }

  return !isFutureSchema(progressInput);
}

export function createProgressExportBundle(
  progress: ProgressState,
  exportedAt = new Date().toISOString()
): ProgressExportBundle {
  return {
    schemaVersion: PROGRESS_EXPORT_SCHEMA_VERSION,
    exportedAt,
    appVersion: APP_VERSION,
    progress
  };
}

export function serializeProgressExport(progress: ProgressState): string {
  return JSON.stringify(createProgressExportBundle(progress), null, 2);
}

export function previewProgressImport(raw: string): ImportPreview {
  try {
    const parsed = JSON.parse(raw) as Partial<ProgressExportBundle> | ProgressState;
    const progressInput = "progress" in parsed ? parsed.progress : parsed;

    if (!isImportable(parsed, progressInput)) {
      return {
        valid: false,
        warnings: ["Progress schema is missing or unsupported."],
        lessonCount: 0,
        sessionCount: 0,
        sketchCount: 0,
        skillCount: 0
      };
    }

    const progress = normalizeProgressState(progressInput);
    const warnings: string[] = [];

    if (progress.completedLessonSlugs.length === 0) {
      warnings.push("Import contains no completed lessons.");
    }

    return {
      valid: true,
      warnings,
      lessonCount: progress.completedLessonSlugs.length,
      sessionCount: progress.generatedSessionHistory.length,
      sketchCount: progress.savedSongSketches.length,
      skillCount: Object.keys(progress.skillMastery).length
    };
  } catch {
    return {
      valid: false,
      warnings: ["JSON could not be parsed."],
      lessonCount: 0,
      sessionCount: 0,
      sketchCount: 0,
      skillCount: 0
    };
  }
}

export function parseProgressImport(raw: string): ProgressState | undefined {
  try {
    const parsed = JSON.parse(raw) as Partial<ProgressExportBundle> | ProgressState;
    const progressInput = "progress" in parsed ? parsed.progress : parsed;

    if (!isImportable(parsed, progressInput)) {
      return undefined;
    }

    return normalizeProgressState(progressInput);
  } catch {
    return undefined;
  }
}

