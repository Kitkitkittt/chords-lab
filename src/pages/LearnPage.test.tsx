import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { ProgressProvider } from "../state/progress";
import { LearnPage } from "./LearnPage";

describe("LearnPage", () => {
  it("renders the beginner course map", () => {
    render(
      <MemoryRouter>
        <ProgressProvider>
          <LearnPage />
        </ProgressProvider>
      </MemoryRouter>
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "Course map" })
    ).toBeInTheDocument();
    expect(screen.getAllByText("Sound, Pitch, and Octaves").length).toBeGreaterThan(
      0
    );
    expect(
      screen.getAllByText("Triads and Basic Chord Symbols").length
    ).toBeGreaterThan(0);
  });
});
