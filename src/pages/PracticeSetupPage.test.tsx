import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { ProgressProvider } from "../state/progress";
import { PracticeSetupPage } from "./PracticeSetupPage";

describe("PracticeSetupPage", () => {
  it("creates a generated session URL", async () => {
    const user = userEvent.setup();
    localStorage.clear();

    render(
      <MemoryRouter initialEntries={["/practice/scales/setup"]}>
        <ProgressProvider>
          <Routes>
            <Route path="/practice/:moduleId/setup" element={<PracticeSetupPage />} />
            <Route path="/practice/:moduleId" element={<div>started</div>} />
          </Routes>
        </ProgressProvider>
      </MemoryRouter>
    );

    await user.selectOptions(screen.getByLabelText("Topic"), "harmonic minor");
    await user.click(
      screen.getByRole("button", { name: /start generated session/i })
    );

    expect(screen.getByText("started")).toBeInTheDocument();
  });
});
