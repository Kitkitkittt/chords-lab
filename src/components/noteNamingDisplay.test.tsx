import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { DigitalPiano } from "./DigitalPiano";
import { KeyboardFigure } from "./LessonComponents";
import { ProgressContext } from "../state/progressContext";

function withNaming(naming: string, children: ReactNode) {
  const value = {
    progress: { settings: { noteNaming: naming } }
  } as unknown as React.ContextType<typeof ProgressContext>;

  return render(
    <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>
  );
}

const pianoProps = {
  activeNotes: [],
  startOctave: 4,
  octaveCount: 1,
  qwertyOctave: 9,
  latch: false,
  noteLabels: true,
  onNoteOn: () => {},
  onNoteOff: () => {},
  onToggle: () => {}
};

describe("note naming reaches the surfaces a learner reads", () => {
  it("relabels the lesson keyboard in solfège", () => {
    withNaming("fixed-do", <KeyboardFigure label="Scale" active={["C"]} />);

    expect(screen.getByText("Do")).toBeInTheDocument();
    expect(screen.getByText("Sol")).toBeInTheDocument();
    expect(screen.queryByText("C")).not.toBeInTheDocument();
  });

  it("relabels the lesson keyboard in German, where B natural is H", () => {
    withNaming("german", <KeyboardFigure label="Scale" active={["C"]} />);

    expect(screen.getByText("H")).toBeInTheDocument();
    expect(screen.queryByText("B")).not.toBeInTheDocument();
  });

  it("leaves English untouched", () => {
    withNaming("english", <KeyboardFigure label="Scale" active={["C"]} />);

    expect(screen.getByText("C")).toBeInTheDocument();
    expect(screen.getByText("B")).toBeInTheDocument();
  });

  it("relabels the digital piano keybed", () => {
    withNaming("fixed-do", <DigitalPiano {...pianoProps} />);

    expect(screen.getByRole("button", { name: "C4" })).toHaveTextContent("Do");
    expect(screen.getByRole("button", { name: "G4" })).toHaveTextContent("Sol");
  });

  it("keeps aria-labels in English so assistive tech and tests stay stable", () => {
    withNaming("german", <DigitalPiano {...pianoProps} />);

    // Visible text is localized; the accessible name is not.
    const b = screen.getByRole("button", { name: "B4" });
    expect(b).toHaveTextContent("H");
  });
});

