import { fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useInstrumentHotkeys, type InstrumentHotkeyMap } from "./useInstrumentHotkeys";

function Probe({
  map,
  enabled = true,
  onReleaseAll
}: {
  map: InstrumentHotkeyMap;
  enabled?: boolean;
  onReleaseAll?: () => void;
}) {
  useInstrumentHotkeys({ map, enabled, onReleaseAll });
  return (
    <div>
      <input data-testid="field" />
      <button type="button" data-testid="btn">
        press
      </button>
    </div>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  Object.defineProperty(document, "hidden", { configurable: true, value: false });
});

describe("useInstrumentHotkeys", () => {
  it("fires down/up from window without focusing a container", () => {
    const down = vi.fn();
    const up = vi.fn();
    render(<Probe map={{ a: { onDown: down, onUp: up } }} />);

    fireEvent.keyDown(window, { key: "a" });
    expect(down).toHaveBeenCalledTimes(1);
    fireEvent.keyUp(window, { key: "a" });
    expect(up).toHaveBeenCalledTimes(1);
  });

  it("ignores auto-repeat keydown", () => {
    const down = vi.fn();
    render(<Probe map={{ a: { onDown: down } }} />);

    fireEvent.keyDown(window, { key: "a", repeat: true });
    expect(down).not.toHaveBeenCalled();
  });

  it("ignores events from form fields and buttons", () => {
    const down = vi.fn();
    const { getByTestId } = render(<Probe map={{ a: { onDown: down } }} />);

    fireEvent.keyDown(getByTestId("field"), { key: "a" });
    fireEvent.keyDown(getByTestId("btn"), { key: "a" });
    expect(down).not.toHaveBeenCalled();
  });

  it("ignores modified keystrokes", () => {
    const down = vi.fn();
    render(<Probe map={{ a: { onDown: down } }} />);

    fireEvent.keyDown(window, { key: "a", ctrlKey: true });
    fireEvent.keyDown(window, { key: "a", metaKey: true });
    fireEvent.keyDown(window, { key: "a", altKey: true });
    expect(down).not.toHaveBeenCalled();
  });

  it("only the last-mounted owner receives keys", () => {
    const first = vi.fn();
    const second = vi.fn();
    render(<Probe map={{ a: { onDown: first } }} />);
    render(<Probe map={{ a: { onDown: second } }} />);

    fireEvent.keyDown(window, { key: "a" });
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("previous owner resumes after the top unmounts", () => {
    const first = vi.fn();
    const second = vi.fn();
    render(<Probe map={{ a: { onDown: first } }} />);
    const top = render(<Probe map={{ a: { onDown: second } }} />);

    top.unmount();
    fireEvent.keyDown(window, { key: "a" });
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).not.toHaveBeenCalled();
  });

  it("releases held keys and calls onReleaseAll on window blur", () => {
    const up = vi.fn();
    const onReleaseAll = vi.fn();
    render(<Probe map={{ a: { onUp: up } }} onReleaseAll={onReleaseAll} />);

    fireEvent.keyDown(window, { key: "a" });
    fireEvent(window, new Event("blur"));
    expect(up).toHaveBeenCalledTimes(1);
    expect(onReleaseAll).toHaveBeenCalledTimes(1);
  });

  it("releases when the document becomes hidden", () => {
    const up = vi.fn();
    const onReleaseAll = vi.fn();
    render(<Probe map={{ a: { onUp: up } }} onReleaseAll={onReleaseAll} />);

    fireEvent.keyDown(window, { key: "a" });
    Object.defineProperty(document, "hidden", { configurable: true, value: true });
    fireEvent(document, new Event("visibilitychange"));
    expect(up).toHaveBeenCalledTimes(1);
    expect(onReleaseAll).toHaveBeenCalledTimes(1);
  });

  it("releases and calls onReleaseAll on unmount", () => {
    const up = vi.fn();
    const onReleaseAll = vi.fn();
    const view = render(<Probe map={{ a: { onUp: up } }} onReleaseAll={onReleaseAll} />);

    fireEvent.keyDown(window, { key: "a" });
    view.unmount();
    expect(up).toHaveBeenCalledTimes(1);
    expect(onReleaseAll).toHaveBeenCalledTimes(1);
  });

  it("calls onReleaseAll when disabled after mount", () => {
    const onReleaseAll = vi.fn();
    const view = render(<Probe map={{ a: {} }} onReleaseAll={onReleaseAll} />);

    view.rerender(<Probe map={{ a: {} }} enabled={false} onReleaseAll={onReleaseAll} />);
    expect(onReleaseAll).toHaveBeenCalledTimes(1);
  });
});
