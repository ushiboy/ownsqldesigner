import { useEffect, useRef, useState } from "react";
import { useTranslations } from "use-intl";
import {
  DEFAULT_SCHEMA_NAME,
  type Schema,
  type SchemaSummary,
  createSchema,
} from "../../../domain/schema";
import type { SchemaRepository } from "../../../domain/schemaRepository";
import { useNotification } from "../NotificationContext";

export type SchemaPersistence = {
  savedSchemas: SchemaSummary[];
  /** True when the most recent autosave attempt failed to persist. */
  hasUnsavedChanges: boolean;
  selectSchema: (id: string) => void;
  deleteCurrentSchema: () => void;
};

export function useSchemaPersistence(
  repository: SchemaRepository,
  currentSchema: Schema | null,
  seededSchema: Schema | undefined,
  replaceSchema: (schema: Schema) => void,
): SchemaPersistence {
  const [savedSchemas, setSavedSchemas] = useState<SchemaSummary[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const t = useTranslations("notifications");
  // Failures surface through the notification context; each successful
  // operation clears any stale message.
  const { notify, dismissNotification } = useNotification();
  // A stable handle to the latest `notify`: the autosave effect below keys
  // off `currentSchema` only, so it must not re-run just because some
  // unrelated notify() call elsewhere changed the notification context's
  // function identity.
  const notifyRef = useRef(notify);
  useEffect(() => {
    notifyRef.current = notify;
  }, [notify]);
  // Same rationale as notifyRef: the autosave effect must not re-run just
  // because the locale (and thus this translator's identity) changed.
  const tRef = useRef(t);
  useEffect(() => {
    tRef.current = t;
  }, [t]);

  // Startup restore: the last-edited schema, or a fresh blank one on the
  // first visit (or when the last-edited pointer dangles). A seeded
  // workspace skips it, so the seed survives past the first tick.
  useEffect(() => {
    if (seededSchema !== undefined) {
      return;
    }
    let cancelled = false;
    (async () => {
      const lastSchemaId = await repository.loadLastSchemaId();
      const restored = lastSchemaId === null ? null : await repository.load(lastSchemaId);
      if (!cancelled) {
        replaceSchema(restored ?? createSchema(DEFAULT_SCHEMA_NAME));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [repository, seededSchema, replaceSchema]);

  // The single auto-save path: every mutation flows through currentSchema.
  useEffect(() => {
    if (currentSchema === null) {
      return;
    }
    let cancelled = false;
    (async () => {
      // A still-untouched seed is by definition already persisted, so it is
      // not written straight back; the summary list is still refreshed so
      // the schema menu has the same contents it would have in the app.
      if (currentSchema !== seededSchema) {
        try {
          await repository.save(currentSchema);
          await repository.saveLastSchemaId(currentSchema.id);
        } catch {
          // Quota exceeded, private-mode storage, etc: the edit exists only
          // in memory. Surface it and let the beforeunload guard (see
          // useUnsavedChangesWarning) stop the user from losing it silently.
          if (!cancelled) {
            setHasUnsavedChanges(true);
            notifyRef.current(tRef.current("couldNotSave"));
          }
          return;
        }
      }
      if (!cancelled) {
        setHasUnsavedChanges(false);
      }
      const summaries = await repository.list();
      if (!cancelled) {
        setSavedSchemas(summaries);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [repository, currentSchema, seededSchema]);

  return {
    savedSchemas,
    hasUnsavedChanges,
    selectSchema: (id) => {
      (async () => {
        const loaded = await repository.load(id);
        if (loaded !== null) {
          dismissNotification();
          replaceSchema(loaded);
          return;
        }
        // The entry vanished (e.g. deleted in another tab) or is corrupt:
        // keep the current schema, surface the failure, and refresh the
        // list so the stale entry disappears.
        const name = savedSchemas.find((summary) => summary.id === id)?.name;
        notify(name === undefined ? t("couldNotLoadSelected") : t("couldNotLoadNamed", { name }));
        setSavedSchemas(await repository.list());
      })();
    },
    deleteCurrentSchema: () => {
      if (currentSchema === null) {
        return;
      }
      const { id } = currentSchema;
      (async () => {
        // The removal completes before the successor becomes current, so the
        // auto-save effect can only ever see the successor — the deleted
        // document cannot be written back. The last-schema-id pointer is
        // left dangling here; the successor's auto-save overwrites it.
        await repository.remove(id);
        const summaries = await repository.list();
        dismissNotification();
        replaceSchema(await loadSuccessor(repository, summaries));
      })();
    },
  };
}

// The most-recently-updated remaining schema, mirroring startup-restore
// semantics; a blank default schema when none remain (or the successor
// entry fails to load).
async function loadSuccessor(
  repository: SchemaRepository,
  summaries: SchemaSummary[],
): Promise<Schema> {
  const successor = summaries.toSorted((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0];
  if (successor === undefined) {
    return createSchema(DEFAULT_SCHEMA_NAME);
  }
  return (await repository.load(successor.id)) ?? createSchema(DEFAULT_SCHEMA_NAME);
}
