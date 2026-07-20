import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { ProgressProvider } from "../state/progress";
import { PlacementPage } from "./PlacementPage";

describe("PlacementPage", () => {
  it("offers an optional untimed check with a regular-practice exit", () => {
    localStorage.clear();

    render(
      <MemoryRouter>
        <ProgressProvider>
          <PlacementPage />
        </ProgressProvider>
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: "Optional placement check" })).toBeInTheDocument();
    expect(screen.getByText(/An optional, untimed pass/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Skip to regular practice" })).toHaveAttribute(
      "href",
      "/practice"
    );
    expect(screen.getByText("Name the note shown on the staff.")).toBeInTheDocument();
  });
});
