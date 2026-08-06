import type { ProgressState } from "../types/course";

export const CURRENT_SCHEMA_VERSION = 2;

type VersionedInput = Record<string, unknown> & { schemaVersion?: unknown };

type MigrationStep = {
  /** State at this version is transformed into `from + 1`. */
  from: number;
  migrate: (input: VersionedInput) => VersionedInput;
};

/**
 * Migrations run in ascending order, each one taking state from `from` to
 * `from + 1`. Steps must be pure and defensive: they receive whatever was on
 * disk, which may predate any given field.
 */
const MIGRATIONS: MigrationStep[] = [
  {
    // v1 -> v2: settings.noteNaming became a real render input, so make sure
    // every stored profile carries an explicit value instead of relying on a
    // default that used to be unreachable.
    from: 1,
    migrate: (input) => {
      const settings =
        input.settings && typeof input.settings === "object"
          ? (input.settings as Record<string, unknown>)
          : {};

      return {
        ...input,
        settings: {
          ...settings,
          noteNaming:
            typeof settings.noteNaming === "string"
              ? settings.noteNaming
              : "english"
        }
      };
    }
  }
];

/**
 * Unversioned blobs were written before `schemaVersion` existed. They are v1
 * in every respect except the stamp, so treat them as such rather than
 * throwing the user's progress away.
 */
function detectVersion(input: VersionedInput): number {
  const { schemaVersion } = input;

  if (typeof schemaVersion !== "number" || !Number.isFinite(schemaVersion)) {
    return 1;
  }

  return Math.floor(schemaVersion);
}

/**
 * Brings stored progress up to `CURRENT_SCHEMA_VERSION`.
 *
 * State stamped with a *newer* version came from a build we know nothing
 * about; we cannot reason about its fields, so we refuse to downgrade it and
 * let the caller fall back to defaults instead of corrupting it.
 */
export function migrateProgressState(value: unknown): Partial<ProgressState> {
  if (!value || typeof value !== "object") {
    return { schemaVersion: CURRENT_SCHEMA_VERSION } as unknown as Partial<ProgressState>;
  }

  const version = detectVersion(value as VersionedInput);

  if (version > CURRENT_SCHEMA_VERSION) {
    return { schemaVersion: CURRENT_SCHEMA_VERSION } as unknown as Partial<ProgressState>;
  }

  let working = { ...(value as VersionedInput), schemaVersion: version };

  for (const step of MIGRATIONS) {
    if (working.schemaVersion === undefined) {
      break;
    }

    if ((working.schemaVersion as number) === step.from) {
      working = { ...step.migrate(working), schemaVersion: step.from + 1 };
    }
  }

  return {
    ...working,
    schemaVersion: CURRENT_SCHEMA_VERSION
  } as unknown as unknown as Partial<ProgressState>;
}

/** True when the stored stamp is from a build newer than this one. */
export function isFutureSchema(value: unknown): boolean {
  if (!value || typeof value !== "object") {
    return false;
  }

  return detectVersion(value as VersionedInput) > CURRENT_SCHEMA_VERSION;
}

