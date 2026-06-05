import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { ToolsPage } from "./ToolsPage";
import { ProgressProvider } from "../state/progress";

function renderTools(initialPath = "/tools/circle") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <ProgressProvider>
        <ToolsPage />
      </ProgressProvider>
    </MemoryRouter>
  );
}

describe("tools page", () => {
  it("shows the circle of fifths on the circle route", () => {
    renderTools("/tools/circle");

    expect(
      screen.getByRole("heading", { level: 1, name: /Interactive theory tools/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /Circle of fifths/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /Fretboard scale-box explorer/i })
    ).toBeInTheDocument();
    // The progression playground is on the other tab.
    expect(
      screen.queryByRole("heading", { name: /Chord progression playground/i })
    ).not.toBeInTheDocument();
  });

  it("shows the progression playground on the progression route", () => {
    renderTools("/tools/progression");

    expect(
      screen.getByRole("heading", { name: /Chord progression playground/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /Voice leading at a glance/i })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: /Circle of fifths/i })
    ).not.toBeInTheDocument();
  });

  it("derives the diatonic chords when a circle key is selected", async () => {
    const user = userEvent.setup();
    renderTools("/tools/circle");

    await user.click(screen.getByRole("button", { name: "G", pressed: false }));

    expect(screen.getByText(/G A B C D E F#/)).toBeInTheDocument();
  });

  it("builds a progression and shows derived chords", async () => {
    const user = userEvent.setup();
    renderTools("/tools/progression");

    expect(screen.getByLabelText("Play C")).toBeInTheDocument();
    expect(screen.getByLabelText("Play G")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Clear/i }));
    expect(screen.getByText("Add numerals to begin.")).toBeInTheDocument();
  });

  it("offers an Open in Song Lab action on the progression tool", () => {
    renderTools("/tools/progression");

    const openButton = screen.getByRole("button", {
      name: /Open in Song Lab/i
    });
    expect(openButton).toBeInTheDocument();
    expect(openButton).toBeEnabled();
  });
});
