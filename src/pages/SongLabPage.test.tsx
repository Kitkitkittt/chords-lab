import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { ProgressProvider } from "../state/progress";
import { createDefaultSongSketch } from "../lib/songSketches";
import { defaultProgressState } from "../lib/progressStorage";
import { SongLabPage } from "./SongLabPage";

function renderSongLabPage() {
  localStorage.clear();

  return render(
    <MemoryRouter>
      <ProgressProvider>
        <SongLabPage />
      </ProgressProvider>
    </MemoryRouter>
  );
}

function renderSongLabWithSeed() {
  localStorage.clear();

  return render(
    <MemoryRouter
      initialEntries={[
        {
          pathname: "/lab/song",
          state: {
            seedProgression: {
              key: "G",
              mode: "major",
              numerals: ["I", "V", "vi", "IV"]
            }
          }
        }
      ]}
    >
      <ProgressProvider>
        <SongLabPage />
      </ProgressProvider>
    </MemoryRouter>
  );
}

describe("SongLabPage", () => {
  it("renders pattern blocks without autoplay", async () => {
    const user = userEvent.setup();
    renderSongLabPage();

    expect(
      screen.getByRole("heading", { level: 1, name: "Build a small loop" })
    ).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Ready");

    await user.click(screen.getAllByRole("button", { name: "C2" })[0]);
    expect(screen.getByText(/Beat hit rest hit hit/)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "A2" }).length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: /save sketch/i }));
    expect(screen.getByRole("status")).toHaveTextContent("Sketch saved locally");
    expect(localStorage.getItem("chordslab.progress.v1")).toContain(
      "savedSongSketches"
    );
  }, 20_000);

  it("supports Song Lab 3.0 mute solo regenerate duplicate and explain controls", async () => {
    const user = userEvent.setup();
    renderSongLabPage();

    const firstMute = screen.getAllByRole("button", { name: /mute/i })[0];
    await user.click(firstMute);
    expect(firstMute).toHaveAttribute(
      "aria-pressed",
      "true"
    );

    await user.click(screen.getByRole("button", { name: /Regenerate/i }));
    expect(screen.getByText(/Pattern regenerated/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Duplicate section/i }));
    expect(screen.getByText(/duplicated/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Explain loop/i }));
    expect(screen.getByText(/The loop starts/)).toBeInTheDocument();
  }, 20_000);

  it("seeds a sketch from a progression passed via router state", () => {
    renderSongLabWithSeed();

    // The key selector reflects the seeded key.
    expect(screen.getByRole("combobox", { name: "Key" })).toHaveValue("G");
    // The first chord bar starts on the seeded tonic numeral.
    expect(screen.getByText("Chord start I")).toBeInTheDocument();
    // The theory panel resolves I in G to the G chord.
    expect(screen.getByText(/G in G/)).toBeInTheDocument();
  });

  it("hides the jam take mixer row until a take is recorded", () => {
    renderSongLabPage();

    const mix = screen.getByRole("region", { name: /track mix/i });
    expect(mix).toHaveTextContent("Drums");
    expect(mix).not.toHaveTextContent("Jam take");
  });

  it("shows the jam take mixer row for a sketch carrying a take", () => {
    localStorage.clear();
    const sketch = {
      ...createDefaultSongSketch("Recorded loop"),
      capturedMelody: [{ note: "C4", startBeat: 0, durationBeats: 0.5 }]
    };
    localStorage.setItem(
      "chordslab.progress.v1",
      JSON.stringify({
        ...defaultProgressState,
        savedSongSketches: [sketch]
      })
    );

    render(
      <MemoryRouter>
        <ProgressProvider>
          <SongLabPage />
        </ProgressProvider>
      </MemoryRouter>
    );

    expect(screen.getByText("Jam take")).toBeInTheDocument();
  });
});

