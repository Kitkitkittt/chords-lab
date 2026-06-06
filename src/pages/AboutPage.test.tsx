import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { AboutPage } from "./AboutPage";

function renderAbout() {
  return render(
    <MemoryRouter>
      <AboutPage />
    </MemoryRouter>
  );
}

describe("AboutPage", () => {
  it("explains the local-first privacy model", () => {
    renderAbout();

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /About Chords Lab and your privacy/i
      })
    ).toBeInTheDocument();
    expect(screen.getByText(/No accounts, no tracking/i)).toBeInTheDocument();
    expect(screen.getByText("chordslab.progress.v1")).toBeInTheDocument();
  });

  it("links to progress export and sources", () => {
    renderAbout();

    expect(
      screen.getByRole("link", { name: /Export or import progress/i })
    ).toHaveAttribute("href", "/progress/export");
    expect(
      screen.getByRole("link", { name: /View sources/i })
    ).toHaveAttribute("href", "/sources");
  });
});
