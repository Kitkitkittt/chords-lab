import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { TOUR_STORAGE_KEY, WelcomeTour } from "./WelcomeTour";

function renderTour() {
  return render(
    <MemoryRouter>
      <WelcomeTour />
    </MemoryRouter>
  );
}

describe("WelcomeTour", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("shows on first visit and dismisses, persisting the seen flag", async () => {
    const user = userEvent.setup();
    renderTour();

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Start learning/i }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(localStorage.getItem(TOUR_STORAGE_KEY)).toBe("seen");
  });

  it("does not show once the seen flag is set", () => {
    localStorage.setItem(TOUR_STORAGE_KEY, "seen");
    renderTour();

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
