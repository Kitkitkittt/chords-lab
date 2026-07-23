import { useCallback, useEffect, useRef } from "react";

export type InstrumentHotkeyAction = {
  label?: string;
  onDown?: () => void;
  onUp?: () => void;
};

export type InstrumentHotkeyMap = Record<string, InstrumentHotkeyAction>;

export type UseInstrumentHotkeysOptions = {
  map: InstrumentHotkeyMap;
  enabled?: boolean;
  onReleaseAll?: () => void;
};

const ownerStack: symbol[] = [];

const PRESERVED_KEYS = new Set([
  "Enter",
  " ",
  "Spacebar",
  "Tab",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight"
]);

function activeOwner(): symbol | undefined {
  return ownerStack[ownerStack.length - 1];
}

function normalizeKey(key: string): string {
  return key.length === 1 ? key.toLowerCase() : key;
}

function isInteractiveTarget(target: EventTarget | null): boolean {
  if (typeof HTMLElement === "undefined" || !(target instanceof HTMLElement)) {
    return false;
  }
  if (target.isContentEditable) {
    return true;
  }

  const tag = target.tagName.toLowerCase();
  if (
    tag === "input" ||
    tag === "select" ||
    tag === "textarea" ||
    tag === "button" ||
    tag === "a" ||
    tag === "option"
  ) {
    return true;
  }

  const role = target.getAttribute("role");
  return (
    role === "textbox" ||
    role === "button" ||
    role === "link" ||
    role === "menuitem" ||
    role === "combobox"
  );
}

export function useInstrumentHotkeys({
  map,
  enabled = true,
  onReleaseAll
}: UseInstrumentHotkeysOptions) {
  const idRef = useRef<symbol>(Symbol("instrument-hotkeys"));
  const mapRef = useRef(map);
  const onReleaseAllRef = useRef(onReleaseAll);
  const heldRef = useRef(new Set<string>());
  mapRef.current = map;
  onReleaseAllRef.current = onReleaseAll;

  const releaseHeld = useCallback(() => {
    heldRef.current.forEach((key) => {
      mapRef.current[key]?.onUp?.();
    });
    heldRef.current.clear();
    onReleaseAllRef.current?.();
  }, []);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const id = idRef.current;
    ownerStack.push(id);
    return () => {
      const index = ownerStack.lastIndexOf(id);
      if (index >= 0) {
        ownerStack.splice(index, 1);
      }
      releaseHeld();
    };
  }, [enabled, releaseHeld]);

  useEffect(() => {
    const id = idRef.current;

    const handleDown = (event: KeyboardEvent) => {
      if (activeOwner() !== id || event.repeat) {
        return;
      }
      if (event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }
      if (isInteractiveTarget(event.target) || PRESERVED_KEYS.has(event.key)) {
        return;
      }

      const key = normalizeKey(event.key);
      const action = mapRef.current[key];
      if (!action) {
        return;
      }

      event.preventDefault();
      if (heldRef.current.has(key)) {
        return;
      }

      heldRef.current.add(key);
      action.onDown?.();
    };

    const handleUp = (event: KeyboardEvent) => {
      if (activeOwner() !== id) {
        return;
      }

      const key = normalizeKey(event.key);
      if (!heldRef.current.delete(key)) {
        return;
      }

      event.preventDefault();
      mapRef.current[key]?.onUp?.();
    };

    const handleBlur = () => releaseHeld();
    const handleVisibility = () => {
      if (document.hidden) {
        releaseHeld();
      }
    };

    window.addEventListener("keydown", handleDown);
    window.addEventListener("keyup", handleUp);
    window.addEventListener("blur", handleBlur);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("keydown", handleDown);
      window.removeEventListener("keyup", handleUp);
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [releaseHeld]);
}
