import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { ProgressProvider } from "../state/progress";
import { ReviewPage } from "./ReviewPage";

function renderReviewPage() {
  localStorage.clear();

  return render(
    <MemoryRouter>
      <ProgressProvider>
        <ReviewPage />
      </ProgressProvider>
    </MemoryRouter>
  );
}

describe("ReviewPage", () => {
  it("records missed prompts into the local review queue", async () => {
    const user = userEvent.setup();
    renderReviewPage();

    expect(
      screen.getByRole("heading", { level: 1, name: "Mixed practice" })
    ).toBeInTheDocument();

    const choices = screen.getByLabelText("Answer choices");
    await user.click(within(choices).getByRole("button", { name: "E4" }));
    const checkButton = screen.getByRole("button", { name: /check answer/i });
    await waitFor(() => expect(checkButton).not.toBeDisabled());
    await user.click(checkButton);

    expect(screen.getByRole("status")).toHaveTextContent("Expected C4");
    expect(localStorage.getItem("chordslab.progress.v1")).toContain(
      "staff-click-1"
    );
  });

  it("offers an Easy/Hard confidence rating after a correct answer", async () => {
    const user = userEvent.setup();
    renderReviewPage();

    // The first review prompt's correct answer is its first expected token.
    // Answer correctly by selecting the staff position note C4.
    const choices = screen.getByLabelText("Answer choices");
    await user.click(within(choices).getByRole("button", { name: "C4" }));
    const checkButton = screen.getByRole("button", { name: /check answer/i });
    await waitFor(() => expect(checkButton).not.toBeDisabled());
    await user.click(checkButton);

    const result = screen.getByRole("status");
    expect(within(result).getByText(/How did that feel\?/i)).toBeInTheDocument();
    expect(
      within(result).getByRole("button", { name: "Easy" })
    ).toBeInTheDocument();
    await user.click(within(result).getByRole("button", { name: "Easy" }));
  });
});
