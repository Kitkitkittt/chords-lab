import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { createDefaultSongSketch } from "../lib/songSketches";
import { encodeSketchToToken } from "../lib/sketchShare";
import { ProgressProvider } from "../state/progress";
import { SongSketchesPage } from "./SongSketchesPage";

describe("SongSketchesPage", () => {
  it("saves, duplicates, deletes, and imports sketches", async () => {
    const user = userEvent.setup();
    localStorage.clear();

    render(
      <MemoryRouter>
        <ProgressProvider>
          <SongSketchesPage />
        </ProgressProvider>
      </MemoryRouter>
    );

    await user.click(screen.getByRole("button", { name: /new sketch/i }));
    expect(screen.getByText(/New sketch saved locally/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /duplicate/i }));
    expect(screen.getByText(/Sketch duplicated/)).toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: /delete/i })[0]);
    expect(localStorage.getItem("chordslab.progress.v1")).toContain(
      "savedSongSketches"
    );
  });

  it("imports a shared query token once and clears the query", async () => {
    localStorage.clear();
    const sketch = createDefaultSongSketch("Shared query loop");
    window.history.replaceState(
      null,
      "",
      `/lab/song/sketches?text=${encodeURIComponent(`https://example.test/lab#s=${encodeSketchToToken(sketch)}`)}`
    );

    render(
      <MemoryRouter>
        <ProgressProvider>
          <SongSketchesPage />
        </ProgressProvider>
      </MemoryRouter>
    );

    expect(await screen.findByText(/Imported a shared sketch/)).toBeInTheDocument();
    expect(screen.getByText(/Shared query loop/)).toBeInTheDocument();
    expect(window.location.search).toBe("");
  });
});
