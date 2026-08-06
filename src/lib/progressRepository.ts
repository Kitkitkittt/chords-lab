import type { ProgressState } from "../types/course";
import {
  defaultProgressState,
  normalizeProgressState,
  PROGRESS_STORAGE_KEY,
  writeProgressState
} from "./progressStorage";
import { CURRENT_SCHEMA_VERSION, isFutureSchema } from "./progressMigrations";

/**
 * The IndexedDB version tracks the progress schema so that a schema bump fires
 * onupgradeneeded, giving future migrations a place to add or reshape stores.
 */
const IDB_VERSION = CURRENT_SCHEMA_VERSION;


export type ProgressStore = {
  read(): Promise<unknown | null>;
  write(progress: ProgressState): Promise<void>;
};

export type ProgressRepository = {
  hydrate(fallback: Storage): Promise<ProgressState>;
  persist(fallback: Storage, progress: ProgressState): Promise<void>;
};

export function fallbackProgress(): ProgressState {
  return defaultProgressState;
}

function readFallback(storage: Storage): { progress: ProgressState; isAuthoritative: boolean } {
  try {
    const raw = storage.getItem(PROGRESS_STORAGE_KEY);
    if (!raw) {
      return { progress: fallbackProgress(), isAuthoritative: false };
    }

    const stored = JSON.parse(raw);
    if (!stored || typeof stored !== "object" || isFutureSchema(stored)) {
      return { progress: fallbackProgress(), isAuthoritative: false };
    }

    const progress = normalizeProgressState(stored);
    return {
      progress,
      isAuthoritative:
        JSON.stringify(progress) !== JSON.stringify(fallbackProgress())
    };
  } catch {
    return { progress: fallbackProgress(), isAuthoritative: false };
  }
}

function writeFallback(storage: Storage, progress: ProgressState): void {
  try {
    writeProgressState(storage, progress);
  } catch {
    return;
  }
}

export function createProgressRepository(
  primary: ProgressStore | null
): ProgressRepository {
  let writeQueue = Promise.resolve();
  const writePrimary = (progress: ProgressState): Promise<void> => {
    if (!primary) {
      return Promise.resolve();
    }

    const write = writeQueue.then(() => primary.write(progress));
    writeQueue = write.catch(() => undefined);
    return write;
  };

  return {
    async hydrate(fallback) {
      const local = readFallback(fallback);
      if (!primary) {
        return local.progress;
      }

      if (local.isAuthoritative) {
        void writePrimary(local.progress);
        return local.progress;
      }

      try {
        const stored = await primary.read();
        if (stored !== null && stored !== undefined) {
          const progress = normalizeProgressState(stored);
          writeFallback(fallback, progress);
          return progress;
        }
        await writePrimary(local.progress);
      } catch {
        return local.progress;
      }

      return local.progress;
    },
    async persist(fallback, progress) {
      writeFallback(fallback, progress);
      try {
        await writePrimary(progress);
      } catch {
        return;
      }
    }
  };
}

function openDatabase(factory: IDBFactory): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = factory.open("chordslab", IDB_VERSION);
    // Runs for a fresh database and for every upgrade. Creating the store when
    // absent keeps old installs working without dropping their data; stored
    // records are migrated on read by normalizeProgressState.
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains("progress")) {
        database.createObjectStore("progress");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("IndexedDB open blocked"));
  });
}

function completeTransaction<T>(
  database: IDBDatabase,
  transaction: IDBTransaction,
  request: IDBRequest<T>
): Promise<T> {
  return new Promise((resolve, reject) => {
    let result: T;
    const close = () => database.close();
    transaction.oncomplete = () => {
      close();
      resolve(result);
    };
    transaction.onerror = () => {
      close();
      reject(transaction.error);
    };
    transaction.onabort = () => {
      close();
      reject(transaction.error);
    };
    request.onsuccess = () => {
      result = request.result;
    };
    request.onerror = () => {
      close();
      reject(request.error);
    };
  });
}

export function createIndexedDbProgressStore(
  factory: IDBFactory | undefined =
    typeof indexedDB === "undefined" ? undefined : indexedDB
): ProgressStore | null {
  if (!factory) {
    return null;
  }

  return {
    async read() {
      const database = await openDatabase(factory);
      try {
        const transaction = database.transaction("progress", "readonly");
        return await completeTransaction(
          database,
          transaction,
          transaction.objectStore("progress").get("current")
        );
      } catch (error) {
        database.close();
        throw error;
      }
    },
    async write(progress) {
      const database = await openDatabase(factory);
      try {
        const transaction = database.transaction("progress", "readwrite");
        await completeTransaction(
          database,
          transaction,
          transaction.objectStore("progress").put(progress, "current")
        );
      } catch (error) {
        database.close();
        throw error;
      }
    }
  };
}

export function browserProgressRepository(): ProgressRepository {
  return createProgressRepository(createIndexedDbProgressStore());
}
