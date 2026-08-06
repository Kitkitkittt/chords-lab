import { describe, expect, it } from "vitest";
import { createIndexedDbProgressStore } from "./progressRepository";
import { defaultProgressState } from "./progressStorage";
import type { ProgressState } from "../types/course";

/**
 * `createIndexedDbProgressStore` had no coverage, because jsdom ships no
 * `indexedDB` and the tests in `progressRepository.test.ts` mock `ProgressStore`
 * wholesale. The store therefore opened and closed the database on every write —
 * once per answer a learner submits — and nothing noticed.
 *
 * These tests drive the real store against a fake `IDBFactory`, so they measure
 * connection behaviour instead of trusting the environment to provide one.
 */

type FakeStats = {
  opens: number;
  closes: number;
  puts: Array<{ key: string; value: unknown }>;
};

type FakeControls = {
  factory: IDBFactory;
  stats: FakeStats;
  /** Simulate the browser closing the connection, as on storage eviction. */
  closeFromBrowser: () => void;
  /** Simulate another tab opening the database at a higher version. */
  upgradeFromOtherTab: () => void;
  breakFactory: () => void;
  repairFactory: () => void;
  /** Make the next transaction fail the way a quota failure does. */
  failNextTransaction: (error: DOMException) => void;
};

function invalidState(): DOMException {
  return new DOMException("connection is closed", "InvalidStateError");
}

/**
 * A stand-in for the parts of IndexedDB this store touches. It deliberately
 * models the failure paths a real browser has and the implementation could get
 * wrong: a transaction erroring after it opened, a connection closed underneath
 * the page, and another tab requesting an upgrade.
 */
function createFakeFactory(): FakeControls {
  const stats: FakeStats = { opens: 0, closes: 0, puts: [] };
  const records = new Map<string, unknown>();
  let closed = false;
  let broken = false;
  let pendingTransactionError: DOMException | null = null;
  let onVersionChange: (() => void) | null = null;
  let onClose: (() => void) | null = null;

  const database = {
    objectStoreNames: { contains: () => true },
    createObjectStore: () => undefined,
    set onversionchange(handler: (() => void) | null) {
      onVersionChange = handler;
    },
    set onclose(handler: (() => void) | null) {
      onClose = handler;
    },
    close() {
      stats.closes += 1;
      closed = true;
    },
    transaction() {
      // A real browser throws InvalidStateError here, not at the request, when
      // the connection has been closed.
      if (closed) {
        throw invalidState();
      }

      const transaction: Record<string, unknown> = {
        oncomplete: null,
        onerror: null,
        onabort: null,
        error: pendingTransactionError
      };

      const settleWith = (request: Record<string, unknown>, result: unknown) => {
        queueMicrotask(() => {
          if (transaction.error) {
            // Errors surface on the transaction, after it opened successfully.
            (transaction.onerror as (() => void) | null)?.();
            return;
          }

          (request as { result: unknown }).result = result;
          (request.onsuccess as (() => void) | null)?.();
          (transaction.oncomplete as (() => void) | null)?.();
        });
      };

      transaction.objectStore = () => ({
        get(key: string) {
          const request: Record<string, unknown> = {
            onsuccess: null,
            onerror: null
          };
          settleWith(request, records.get(key));
          return request as unknown as IDBRequest;
        },
        put(value: unknown, key: string) {
          const request: Record<string, unknown> = {
            onsuccess: null,
            onerror: null
          };

          if (!transaction.error) {
            stats.puts.push({ key, value });
            records.set(key, value);
          }

          settleWith(request, undefined);
          return request as unknown as IDBRequest;
        }
      });

      pendingTransactionError = null;
      return transaction as unknown as IDBTransaction;
    }
  };

  const factory = {
    open() {
      stats.opens += 1;
      const request: Record<string, unknown> = {
        onupgradeneeded: null,
        onsuccess: null,
        onerror: null,
        onblocked: null,
        result: database,
        error: new DOMException("open failed", "UnknownError")
      };

      if (broken) {
        queueMicrotask(() => {
          (request.onerror as (() => void) | null)?.();
        });
        return request as unknown as IDBOpenDBRequest;
      }

      closed = false;
      queueMicrotask(() => {
        (request.onsuccess as (() => void) | null)?.();
      });
      return request as unknown as IDBOpenDBRequest;
    }
  } as unknown as IDBFactory;

  return {
    factory,
    stats,
    closeFromBrowser: () => {
      closed = true;
      onClose?.();
    },
    upgradeFromOtherTab: () => onVersionChange?.(),
    breakFactory: () => {
      broken = true;
    },
    repairFactory: () => {
      broken = false;
    },
    failNextTransaction: (error: DOMException) => {
      pendingTransactionError = error;
    }
  };
}

function progressWith(slug: string): ProgressState {
  return { ...defaultProgressState, completedLessonSlugs: [slug] };
}

describe("IndexedDB progress store", () => {
  it("reuses one connection across repeated writes", async () => {
    const { factory, stats } = createFakeFactory();
    const store = createIndexedDbProgressStore(factory);

    expect(store).not.toBeNull();

    // A practice session persists once per answer. Ten answers must not mean
    // ten database connections.
    for (let index = 0; index < 10; index += 1) {
      await store?.write(progressWith(`lesson-${index}`));
    }

    expect(stats.puts).toHaveLength(10);
    expect(stats.opens).toBe(1);
  });

  it("still writes every value it is given", async () => {
    const { factory, stats } = createFakeFactory();
    const store = createIndexedDbProgressStore(factory);

    await store?.write(progressWith("first"));
    await store?.write(progressWith("second"));

    expect(stats.puts.map((entry) => entry.key)).toEqual(["current", "current"]);
    expect(
      (stats.puts[1].value as ProgressState).completedLessonSlugs
    ).toEqual(["second"]);
  });

  it("reads back what it wrote over the same connection", async () => {
    const { factory, stats } = createFakeFactory();
    const store = createIndexedDbProgressStore(factory);

    await store?.write(progressWith("saved"));
    const read = await store?.read();

    expect((read as ProgressState).completedLessonSlugs).toEqual(["saved"]);
    expect(stats.opens).toBe(1);
  });

  it("returns null when the environment has no IndexedDB", () => {
    expect(createIndexedDbProgressStore(undefined)).toBeNull();
  });

  it("releases the connection when another tab needs to upgrade", async () => {
    const { factory, stats, upgradeFromOtherTab } = createFakeFactory();
    const store = createIndexedDbProgressStore(factory);

    await store?.write(progressWith("before"));

    // Holding the connection open would block the other tab's upgrade for as
    // long as this tab lives, so the store must close on request.
    upgradeFromOtherTab();
    expect(stats.closes).toBe(1);

    // And must recover for its own next write.
    await expect(store?.write(progressWith("after"))).resolves.toBeUndefined();
    expect(stats.opens).toBe(2);
    expect(stats.puts.at(-1)?.value).toMatchObject({
      completedLessonSlugs: ["after"]
    });
  });

  it("reopens and retries when the browser closes the connection", async () => {
    const { factory, stats, closeFromBrowser } = createFakeFactory();
    const store = createIndexedDbProgressStore(factory);

    await store?.write(progressWith("before"));
    expect(stats.opens).toBe(1);

    closeFromBrowser();

    await expect(store?.write(progressWith("after"))).resolves.toBeUndefined();
    expect(stats.opens).toBe(2);
    expect(stats.puts.at(-1)?.value).toMatchObject({
      completedLessonSlugs: ["after"]
    });
  });

  it("does not retry a transaction that failed for its own reasons", async () => {
    const { factory, stats, failNextTransaction } = createFakeFactory();
    const store = createIndexedDbProgressStore(factory);

    await store?.write(progressWith("before"));
    failNextTransaction(new DOMException("over quota", "QuotaExceededError"));

    await expect(store?.write(progressWith("doomed"))).rejects.toThrow(
      "over quota"
    );

    // Reopening cannot fix a quota failure, so the healthy connection is kept
    // and the write is not reissued.
    expect(stats.opens).toBe(1);
    expect(stats.puts).toHaveLength(1);
  });

  it("surfaces the failure when a reopen also fails", async () => {
    const { factory, stats, breakFactory, closeFromBrowser } =
      createFakeFactory();
    const store = createIndexedDbProgressStore(factory);

    await store?.write(progressWith("before"));

    // Connection lost and the database unavailable: the retry has nothing to
    // recover to, so the caller must hear about it.
    closeFromBrowser();
    breakFactory();

    await expect(store?.write(progressWith("after"))).rejects.toThrow();
    // One retry, not an unbounded loop.
    expect(stats.opens).toBe(2);
  });

  it("does not cache a failed connection", async () => {
    const { factory, breakFactory, repairFactory } = createFakeFactory();
    const store = createIndexedDbProgressStore(factory);

    breakFactory();
    await expect(store?.write(progressWith("doomed"))).rejects.toThrow();

    // A store that cached the rejected open would keep failing forever.
    repairFactory();
    await expect(
      store?.write(progressWith("recovered"))
    ).resolves.toBeUndefined();
  });
});
