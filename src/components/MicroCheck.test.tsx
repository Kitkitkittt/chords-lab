import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { MicroCheck } from "./LessonComponents";
import { ProgressProvider } from "../state/progress";

function renderWithProviders(ui: ReactElement) {
  localStorage.clear();

  return render(
    <MemoryRouter>
      <ProgressProvider>{ui}</ProgressProvider>
    </MemoryRouter>
  );
}

describe("MicroCheck", () => {
  it("records and announces a correct answer", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <MicroCheck
        id="test-check"
        prompt="Which notes form a C major triad?"
        options={["C E G", "C D E"]}
        answer="C E G"
        explanation="C E G is root, third, and fifth."
      />
    );

    await user.click(screen.getByLabelText("C E G"));
    await user.click(screen.getByRole("button", { name: /check answer/i }));

    expect(screen.getByRole("status")).toHaveTextContent(
      "C E G is root, third, and fifth."
    );
    expect(localStorage.getItem("chordslab.progress.v1")).toContain(
      "test-check"
    );
  });

  it("reveals the right answer on an incorrect choice", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <MicroCheck
        id="test-check-2"
        prompt="Which notes form a C major triad?"
        options={["C E G", "C D E"]}
        answer="C E G"
        explanation="C E G is root, third, and fifth."
      />
    );

    await user.click(screen.getByLabelText("C D E"));
    await user.click(screen.getByRole("button", { name: /check answer/i }));

    expect(screen.getByRole("status")).toHaveTextContent(
      "Not quite — the answer is C E G."
    );
  });
});
