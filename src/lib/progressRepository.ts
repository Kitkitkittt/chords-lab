import type { ProgressState } from "../types/course";
import {
  PROGRESS_STORAGE_KEY,
  defaultProgressState,
  readProgressState,
  writeProgressState
} from "./progressStorage";

export type ProgressRepository = {
  read(storage: Storage): ProgressState;
  write(storage: Storage, progress: ProgressState): void;
  storageKey: string;
  syncProvider: "none" | "cloud";
};

export const localProgressRepository: ProgressRepository = {
  storageKey: PROGRESS_STORAGE_KEY,
  syncProvider: "none",
  read: readProgressState,
  write: writeProgressState
};

export const cloudProgressRepositoryStub: ProgressRepository = {
  storageKey: PROGRESS_STORAGE_KEY,
  syncProvider: "cloud",
  read: readProgressState,
  write(storage, progress) {
    writeProgressState(storage, {
      ...progress,
      sync: {
        ...progress.sync,
        enabled: false,
        provider: "none"
      }
    });
  }
};

export function fallbackProgress(): ProgressState {
  return defaultProgressState;
}
