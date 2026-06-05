import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { ProgressProvider } from "../state/progress";
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
  }, 10000);

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
  }, 10000);
});
