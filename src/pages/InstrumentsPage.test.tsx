import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { InstrumentPage } from "./InstrumentPage";
import { InstrumentsPage } from "./InstrumentsPage";
import { ProgressProvider } from "../state/progress";

describe("instrument pages", () => {
  it("renders the full-band instrument index", () => {
    render(
      <MemoryRouter>
        <ProgressProvider>
          <InstrumentsPage />
        </ProgressProvider>
      </MemoryRouter>
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "Instrument lab" })
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Piano/i })).toHaveAttribute(
      "href",
      "/instruments/piano"
    );
    expect(screen.getByText("Ensemble Skills")).toBeInTheDocument();
  });

  it("renders the shared three-mode studio on the piano route", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/instruments/piano"]}>
        <ProgressProvider>
          <Routes>
            <Route path="/instruments/:instrumentId" element={<InstrumentPage />} />
            <Route path="/lab/song" element={<h1>Seeded Song Lab</h1>} />
          </Routes>
        </ProgressProvider>
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: "One piano, three ways to practice" })).toBeInTheDocument();
    expect(screen.getAllByRole("tab")).toHaveLength(3);
    expect(screen.getAllByRole("button", { name: /^[A-G](?:#)?[3-5]$/ })).toHaveLength(36);

    await user.click(screen.getByRole("tab", { name: "Progression Jam" }));
    await user.click(screen.getByRole("button", { name: "Send progression" }));
    expect(screen.getByRole("heading", { name: "Seeded Song Lab" })).toBeInTheDocument();
  });

  it("renders piano, guitar, drums, and voice workbenches from route ids", () => {
    for (const route of [
      "/instruments/piano",
      "/instruments/guitar",
      "/instruments/drums",
      "/instruments/voice"
    ]) {
      const { unmount } = render(
        <MemoryRouter initialEntries={[route]}>
          <ProgressProvider>
            <Routes>
              <Route path="/instruments/:instrumentId" element={<InstrumentPage />} />
              <Route path="/instruments" element={<InstrumentsPage />} />
            </Routes>
          </ProgressProvider>
        </MemoryRouter>
      );

      expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /Song Lab/i })).toHaveAttribute(
        "href",
        "/lab/song"
      );
      unmount();
    }
  });
});
