import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { ProjectPage } from "./ProjectPage";

describe("ProjectPage", () => {
  it("renders locked decisions, milestones, and acceptance criteria", () => {
    render(
      <MemoryRouter>
        <ProjectPage />
      </MemoryRouter>
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "Plan and progress" })
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "V7 UX flow and interaction-first music learning PWA"
      )
    ).toBeInTheDocument();
    expect(screen.getByText("Foundation app scaffold")).toBeInTheDocument();
    expect(screen.getByText("Interactive index practice hub")).toBeInTheDocument();
    expect(screen.getByText("Module goals")).toBeInTheDocument();
    expect(screen.getByText("V7 acceptance checklist")).toBeInTheDocument();
    expect(screen.getByText("Direct workbench controls")).toBeInTheDocument();
    expect(screen.getByText("V6 instrument layer")).toBeInTheDocument();
    expect(screen.getByText("V7 global UX feedback")).toBeInTheDocument();
  });
});
