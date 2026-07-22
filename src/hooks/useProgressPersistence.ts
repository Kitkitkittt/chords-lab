import { useCallback, useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import {
  browserProgressRepository,
  fallbackProgress
} from "../lib/progressRepository";
import { readProgressState, writeProgressState } from "../lib/progressStorage";
import type { ProgressState } from "../types/course";

function mergeReducedMotion(progress: ProgressState): ProgressState {
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return {
    ...progress,
    settings: {
      ...progress.settings,
      reducedMotion: progress.settings.reducedMotion || prefersReducedMotion
    }
  };
}

function initialProgress(): ProgressState {
  if (typeof window === "undefined") {
    return fallbackProgress();
  }

  try {
    return mergeReducedMotion(readProgressState(window.localStorage));
  } catch {
    return mergeReducedMotion(fallbackProgress());
  }
}

function emitSaved(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("chordslab:progress-saved"));
  }
}

export function useProgressPersistence(): [
  ProgressState,
  Dispatch<SetStateAction<ProgressState>>,
  boolean
] {
  const [progress, setState] = useState<ProgressState>(initialProgress);
  const [isHydrated, setIsHydrated] = useState(
    () => typeof indexedDB === "undefined"
  );
  const progressRef = useRef(progress);
  const revisionRef = useRef(0);
  const hydratedRef = useRef(false);
  const hasPersistedRef = useRef(false);
  const repositoryRef = useRef(browserProgressRepository());

  const setProgress = useCallback((next: SetStateAction<ProgressState>) => {
    setState((current) => {
      const resolved = typeof next === "function" ? next(current) : next;
      progressRef.current = resolved;
      revisionRef.current += 1;
      return resolved;
    });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !hydratedRef.current) {
      return;
    }

    try {
      writeProgressState(window.localStorage, progress);
    } catch {
      void repositoryRef.current.persist(window.localStorage, progress);
      return;
    }

    if (hasPersistedRef.current) {
      emitSaved();
    } else {
      hasPersistedRef.current = true;
    }

    if (hydratedRef.current) {
      void repositoryRef.current.persist(window.localStorage, progress);
    }
  }, [progress]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    let active = true;
    const initialRevision = revisionRef.current;

    void repositoryRef.current.hydrate(window.localStorage).then((stored) => {
      if (!active) {
        return;
      }

      hydratedRef.current = true;
      if (revisionRef.current === initialRevision) {
        const hydrated = mergeReducedMotion(stored);
        progressRef.current = hydrated;
        setState(hydrated);
      } else {
        void repositoryRef.current.persist(window.localStorage, progressRef.current);
      }
      setIsHydrated(true);
    });

    return () => {
      active = false;
    };
  }, []);

  return [progress, setProgress, isHydrated];
}
