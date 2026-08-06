import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { ProgressContext } from "../state/progressContext";
import { useNoteName } from "./useNoteName";

function withNaming(naming: unknown) {
  return function Wrapper({ children }: { children: ReactNode }) {
    const value = {
      progress: { settings: { noteNaming: naming } }
    } as unknown as React.ContextType<typeof ProgressContext>;
    return (
      <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>
    );
  };
}

function renderWith(naming: unknown) {
  return renderHook(() => useNoteName(), { wrapper: withNaming(naming) }).result
    .current;
}

describe("useNoteName", () => {
  it("passes notes through unchanged in English", () => {
    const { noteName, pitchList } = renderWith("english");

    expect(noteName("C4")).toBe("C4");
    expect(noteName("Bb")).toBe("Bb");
    expect(pitchList(["C", "E", "G"])).toBe("C E G");
  });

  it("renders fixed-do solfège", () => {
    const { noteName, pitchList } = renderWith("fixed-do");

    expect(noteName("C4")).toBe("Do4");
    expect(noteName("G")).toBe("Sol");
    expect(pitchList(["C", "E", "G"])).toBe("Do Mi Sol");
  });

  it("renders German names, where B natural is H", () => {
    const { noteName, pitchList } = renderWith("german");

    expect(noteName("B4")).toBe("H4");
    expect(noteName("Bb")).toBe("B");
    expect(pitchList(["G", "B", "D"])).toBe("G H D");
  });

  it("defaults to English when the setting is missing or invalid", () => {
    expect(renderWith(undefined).noteName("B")).toBe("B");
    expect(renderWith("klingon").noteName("B")).toBe("B");
  });

  it("falls back to English outside a ProgressProvider instead of throwing", () => {
    const { result } = renderHook(() => useNoteName());

    expect(result.current.system).toBe("english");
    expect(result.current.noteName("B4")).toBe("B4");
  });

  it("exposes the active system so callers can label themselves", () => {
    expect(renderWith("german").system).toBe("german");
    expect(renderWith(undefined).system).toBe("english");
  });
});

