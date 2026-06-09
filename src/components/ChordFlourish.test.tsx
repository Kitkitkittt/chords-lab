import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ChordFlourish } from "./ChordFlourish";

describe("ChordFlourish", () => {
  it("shows the placeholder when no chord is recognized", () => {
    render(<ChordFlourish symbol={null} detail="Play notes" placeholder="—" />);
    expect(screen.getByRole("status")).toHaveTextContent("—");
    expect(screen.getByRole("status")).toHaveTextContent("Play notes");
  });

  it("renders the recognized symbol with the recognized class", () => {
    render(<ChordFlourish symbol="Cmaj7" detail="major seventh" />);
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Cmaj7");
    expect(status.querySelector(".is-recognized")).not.toBeNull();
  });
});
