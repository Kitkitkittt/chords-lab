import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { AppLayout } from "./AppLayout";
import { TOUR_STORAGE_KEY } from "./WelcomeTour";
import { ProgressProvider } from "../state/progress";

function renderLayout() {
  localStorage.clear();
  // Avoid the first-run tour overlay during nav tests.
  localStorage.setItem(TOUR_STORAGE_KEY, "seen");

  return render(
    <MemoryRouter>
      <ProgressProvider>
        <AppLayout />
      </ProgressProvider>
    </MemoryRouter>
  );
}

describe("AppLayout navigation", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("shows the five primary destinations with labels", () => {
    renderLayout();

    const primaryNav = screen.getByRole("navigation", {
      name: "Primary navigation"
    });
    for (const label of ["Home", "Learn", "Practice", "Tools"]) {
      expect(
        within(primaryNav).getByRole("link", { name: label })
      ).toBeInTheDocument();
    }
    expect(
      within(primaryNav).getByRole("button", { name: "More" })
    ).toBeInTheDocument();
  });

  it("opens the More menu and reveals grouped secondary links", async () => {
    const user = userEvent.setup();
    renderLayout();

    const primaryNav = screen.getByRole("navigation", {
      name: "Primary navigation"
    });
    const moreButton = within(primaryNav).getByRole("button", { name: "More" });
    expect(moreButton).toHaveAttribute("aria-expanded", "false");

    await user.click(moreButton);
    expect(moreButton).toHaveAttribute("aria-expanded", "true");

    const menu = screen.getByRole("menu", { name: "More navigation" });
    expect(
      within(menu).getByRole("menuitem", { name: "Sources" })
    ).toHaveAttribute("href", "/sources");
    expect(
      within(menu).getByRole("menuitem", { name: "Song Lab" })
    ).toHaveAttribute("href", "/lab/song");
    expect(within(menu).getByText("Reference")).toBeInTheDocument();
  });

  it("closes the More menu on Escape", async () => {
    const user = userEvent.setup();
    renderLayout();

    const primaryNav = screen.getByRole("navigation", {
      name: "Primary navigation"
    });
    const moreButton = within(primaryNav).getByRole("button", { name: "More" });

    await user.click(moreButton);
    expect(screen.getByRole("menu", { name: "More navigation" })).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(
      screen.queryByRole("menu", { name: "More navigation" })
    ).not.toBeInTheDocument();
  });

  it("exposes a mobile bottom navigation with the same primaries", () => {
    renderLayout();

    const bottomNav = screen.getByRole("navigation", {
      name: "Primary navigation (mobile)"
    });
    expect(
      within(bottomNav).getByRole("link", { name: "Practice" })
    ).toBeInTheDocument();
  });
});
