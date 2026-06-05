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
});
