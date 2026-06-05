import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { InstrumentPage } from "./InstrumentPage";
import { InstrumentsPage } from "./InstrumentsPage";

describe("instrument pages", () => {
  it("renders the full-band instrument index", () => {
    render(
      <MemoryRouter>
        <InstrumentsPage />
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

  it("renders piano, guitar, drums, and voice workbenches from route ids", () => {
    for (const route of [
      "/instruments/piano",
      "/instruments/guitar",
      "/instruments/drums",
      "/instruments/voice"
    ]) {
      const { unmount } = render(
        <MemoryRouter initialEntries={[route]}>
          <Routes>
            <Route path="/instruments/:instrumentId" element={<InstrumentPage />} />
            <Route path="/instruments" element={<InstrumentsPage />} />
          </Routes>
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
