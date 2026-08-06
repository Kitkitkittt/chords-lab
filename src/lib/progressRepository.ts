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
    // `blocked` is not terminal: the request stays pending and still succeeds
    // once the blocking connection closes. Rejecting here without waiting would
    // strand that connection open, which then blocks the retry as well.
    request.onblocked = () => undefined;
  });
}

function completeTransaction<T>(
  transaction: IDBTransaction,
  request: IDBRequest<T>
): Promise<T> {
  return new Promise((resolve, reject) => {
    let result: T;
    transaction.oncomplete = () => resolve(result);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
    request.onsuccess = () => {
      result = request.result;
    };
    request.onerror = () => reject(request.error);
  });
}

export function createIndexedDbProgressStore(
  factory: IDBFactory | undefined =
    typeof indexedDB === "undefined" ? undefined : indexedDB
): ProgressStore | null {
  if (!factory) {
    return null;
  }

  // Progress is persisted on every interaction, so opening and closing the
  // database per call meant a connection cycle per answer a learner submits.
  // The connection is cached instead, and reopened only if it is lost.
  let connection: Promise<IDBDatabase> | null = null;

  const forget = (expected: Promise<IDBDatabase>): void => {
    // Only clear the cache if it still holds the connection that failed.
    // A concurrent call may already have replaced it, and dropping that one
    // would strand it open with nothing able to close it.
    if (connection === expected) {
      connection = null;
    }
  };

  const connect = (): Promise<IDBDatabase> => {
    if (!connection) {
      const pending: Promise<IDBDatabase> = openDatabase(factory).then(
        (database) => {
          // Another tab cannot upgrade the database while this connection is
          // open. Holding it open indefinitely would block that tab until this
          // one is closed, so release it as soon as the browser asks.
          database.onversionchange = () => {
            forget(pending);
            database.close();
          };
          // The browser can also close the connection on its own, for example
          // when evicting storage.
          database.onclose = () => forget(pending);
          return database;
        },
        (error) => {
          // A failed open must not be cached, or every later call inherits it.
          forget(pending);
          throw error;
        }
      );

      connection = pending;
    }

    return connection;
  };

  /**
   * A connection closed underneath us surfaces as a synchronous InvalidStateError
   * when the transaction is opened, so that is the only failure worth retrying.
   * Retrying anything else — a quota failure, an aborted transaction — would
   * discard a healthy connection and reissue a write that failed for a reason
   * reopening cannot fix.
   */
  const isClosedConnection = (error: unknown): boolean =>
    error instanceof DOMException && error.name === "InvalidStateError";

  const withStore = async <T>(
    mode: IDBTransactionMode,
    run: (store: IDBObjectStore) => IDBRequest<T>
  ): Promise<T> => {
    const attempt = async (): Promise<T> => {
      const active = connect();
      const database = await active;

      try {
        const transaction = database.transaction("progress", mode);
        return await completeTransaction(
          transaction,
          run(transaction.objectStore("progress"))
        );
      } catch (error) {
        if (isClosedConnection(error)) {
          forget(active);
        }
        throw error;
      }
    };

    try {
      return await attempt();
    } catch (error) {
      if (!isClosedConnection(error)) {
        throw error;
      }

      return attempt();
    }
  };

  return {
    read() {
      return withStore("readonly", (store) => store.get("current"));
    },
    async write(progress) {
      await withStore("readwrite", (store) => store.put(progress, "current"));
    }
  };
}

export function browserProgressRepository(): ProgressRepository {
  return createProgressRepository(createIndexedDbProgressStore());
}
