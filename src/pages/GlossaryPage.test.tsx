import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { GlossaryPage } from "./GlossaryPage";

describe("GlossaryPage", () => {
  it("filters terms by query", async () => {
    const user = userEvent.setup();
    render(<GlossaryPage />);

    await user.type(screen.getByPlaceholderText("Search terms"), "triad");

    expect(screen.getByRole("heading", { name: "Triad" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Beat" })).not.toBeInTheDocument();
  });
});
