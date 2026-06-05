import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { ProgressProvider } from "../state/progress";
import { HomeInteractiveLab } from "./HomeInteractiveLab";

vi.mock("./LessonComponents", () => ({
  KeyboardFigure: ({ label, active }: { label: string; active: string[] }) => (
    <div aria-label={label}>{active.join(" ")}</div>
  ),
  NotationFigure: ({
    title,
    notation
  }: {
    title: string;
    notation: string;
  }) => <figure aria-label={title}>{notation}</figure>
}));

function renderWithProviders(ui: ReactElement) {
  localStorage.clear();

  return render(
    <MemoryRouter>
      <ProgressProvider>{ui}</ProgressProvider>
    </MemoryRouter>
  );
}

describe("HomeInteractiveLab", () => {
  it("renders the index practice hub and roadmap link", () => {
    renderWithProviders(<HomeInteractiveLab />);

    expect(
      screen.getByRole("heading", { name: "Practice hub" })
    ).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /build a scale/i })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    expect(
      screen.getByRole("link", { name: /open full module/i })
    ).toHaveAttribute("href", "/practice/scales/setup");
  });

  it("lets learners switch launchpad modules and keeps theory spelling visible", async () => {
    const user = userEvent.setup();
    renderWithProviders(<HomeInteractiveLab />);

    await user.click(screen.getByRole("button", { name: "F" }));
    expect(screen.getByRole("status")).toHaveTextContent("Bb4");

    await user.click(screen.getByRole("tab", { name: /tap rhythm/i }));
    await user.click(screen.getByRole("button", { name: "2" }));
    expect(screen.getByRole("status")).toHaveTextContent("F4 G4 F4 G4");

    await user.click(screen.getByRole("tab", { name: /staff challenge/i }));
    await user.click(screen.getByRole("button", { name: "C4" }));
    expect(screen.getByRole("status")).toHaveTextContent("Correct: C4");
  });
});
