# Conflict-Safe Local Progress Across Browser Tabs

Research resolution for [Research conflict-safe local progress across browser tabs](https://github.com/Kitkitkittt/chords-lab/issues/7).

## Current risk

`useProgressPersistence.ts` writes a whole in-memory `ProgressState` to `localStorage`, then asynchronously overwrites one IndexedDB `current` record. Two tabs can derive divergent snapshots and the later writer silently discards the other's changes. No cross-tab listener exists. A non-default local-storage mirror also wins hydration, so a stale mirror can override IndexedDB.

## Minimum viable model

1. Make IndexedDB the canonical local store. Retain `localStorage` only as a best-effort recovery and migration mirror.
2. Persist each mutation through one short `readwrite` transaction: read the current canonical envelope, apply or reconcile the mutation against that record, then write before transaction completion. IndexedDB serializes overlapping `readwrite` transactions on the same store; a snapshot computed before the transaction remains stale and unsafe.
3. Store enough envelope metadata to detect and reconcile concurrency: schema version, monotonic revision, per-install or per-tab mutation ID, and operation/base information required by the eventual merge rule. Wall-clock timestamps must not be sole authority.
4. After commit, notify same-origin tabs with `BroadcastChannel`; receivers re-read canonical IndexedDB and reconcile uncommitted local work. Notification is an optimization, never the correctness mechanism: a receiver may be suspended, opened later, or unsupported.
5. Feature-detect `BroadcastChannel`; use `storage` events from the mirror only as a broad fallback hint, followed by an IndexedDB read. The writing tab does not receive its own `storage` event.

This model prevents silent loss only when reconciliation occurs inside the committed transaction. Final semantics for counters, queues, settings, sketches, delete, reset/import, and migration conflicts remain a downstream human decision.

## Viable models

| Model | Result | Trade-off |
| --- | --- | --- |
| Canonical IndexedDB transactional reconcile plus notification | Minimum compatible solution without Web Locks | Requires a reconciliation rule per mutation class |
| Append-only IndexedDB operation log plus deterministic projection | Strong auditability and idempotency; missed messages are harmless | More schema, projection, compaction, import, and reset design |
| Web Locks around snapshot read/merge/write | Simplifies cooperating modern tabs | Secure-context-only and cooperative; cannot replace atomic storage writes |
| `localStorage` snapshots plus `storage` events | Broad compatibility and easy live refresh | Unsafe: Web Storage provides no cross-window locking and snapshots remain last-writer-wins |

## Required failure cases

- Two tabs mutate from the same base before either commits.
- A remote commit arrives while a tab has queued or unsaved local mutations.
- Commit succeeds but broadcast is missed, delayed, unsupported, or its receiver is suspended.
- Crash before commit, after commit but before notification, or during an IndexedDB transaction.
- `QuotaExceededError`, storage-disabled `SecurityError`, transaction abort, unexpected connection close, private-browsing cleanup, browser eviction, and user data clearing.
- Schema upgrade while an old tab holds a connection. Current `onversionchange` closing behavior must remain.
- Unknown future progress schema. Treat it as read-only or non-authoritative rather than normalizing it to defaults and later overwriting it.
- Non-commutative actions: bookmark toggle, reset/import, delete versus edit sketch, settings changes, bounded histories, and competing review/mastery updates.
- Startup hydration racing with a newer canonical record.

## Browser, privacy, and security constraints

- IndexedDB transactions are broadly supported and intended for offline structured storage; overlapping `readwrite` transactions on one scope are serialized. [W3C IndexedDB](https://w3c.github.io/IndexedDB/) · [MDN transaction model](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Basic_Terminology)
- `BroadcastChannel` is same-origin and same-storage-partition, excludes the sender, and has no replay or durability guarantee. [WHATWG HTML](https://html.spec.whatwg.org/multipage/web-messaging.html#broadcasting-to-other-browsing-contexts) · [MDN Broadcast Channel API](https://developer.mozilla.org/en-US/docs/Web/API/Broadcast_Channel_API)
- `storage` events fire in other same-origin tabs, not the writer, and should only wake a canonical reread. [MDN storage event](https://developer.mozilla.org/en-US/docs/Web/API/Window/storage_event)
- Web Storage has no specified cross-agent locking, and access may throw quota or security errors. [WHATWG Web Storage](https://html.spec.whatwg.org/multipage/webstorage.html) · [MDN localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)
- Web Locks is same-origin and secure-context-only. Treat it as an optional enhancement, not the correctness foundation. [W3C Web Locks](https://w3c.github.io/web-locks/) · [MDN Web Locks API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API)
- Browser storage is best-effort, may be evicted or cleared, and private-mode data normally disappears with the session. Export/import remains the recovery path; local-first cannot promise permanence. [MDN storage quotas and eviction](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria) · [MDN persistent storage](https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/persist)
- Coordination remains origin and partition scoped. With no account or backend, no data crosses devices, profiles, private sessions, protocols, ports, or partitioned embeds. Same-origin XSS can read or alter progress, so persisted records and channel payloads still require validation.

## Confidence

High on platform behavior and the current overwrite risk. Medium on the future-schema migration hazard until exercised against an explicit future-version fixture.
