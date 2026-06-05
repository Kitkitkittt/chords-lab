import type {
  ImportPreview,
  ProgressExportBundle,
  ProgressState
} from "../types/course";
import { normalizeProgressState } from "./progressStorage";

export const PROGRESS_EXPORT_SCHEMA_VERSION = 1;
export const APP_VERSION = "0.1.0-v4";

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

    if (
      ("progress" in parsed && parsed.schemaVersion !== 1) ||
      !progressInput ||
      typeof progressInput !== "object" ||
      (progressInput as Partial<ProgressState>).schemaVersion !== 1
    ) {
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

    if (
      ("progress" in parsed && parsed.schemaVersion !== 1) ||
      !progressInput ||
      typeof progressInput !== "object" ||
      (progressInput as Partial<ProgressState>).schemaVersion !== 1
    ) {
      return undefined;
    }

    return normalizeProgressState(progressInput);
  } catch {
    return undefined;
  }
}
