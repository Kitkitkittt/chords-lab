import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { ContentReviewPage } from "./ContentReviewPage";

describe("ContentReviewPage", () => {
  it("lists educator QA checks and linked practice routes", () => {
    render(
      <MemoryRouter>
        <ContentReviewPage />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: "Educator QA" })).toBeInTheDocument();
    expect(screen.getByText("Lesson checks")).toBeInTheDocument();
    expect(screen.getByText("Sound, Pitch, and Octaves")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "pitch" })[0]).toHaveAttribute(
      "href",
      "/practice/pitch/setup"
    );
  });
});
