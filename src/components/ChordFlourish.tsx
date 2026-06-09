import { useEffect, useRef, useState } from "react";

/**
 * Shared chord-recognition flourish. Displays the detected chord symbol and a
 * supporting line, and briefly animates whenever a *new* chord is recognized.
 * Used across the hero keyboard, instrument free-play, and the Jam Room so the
 * "we heard that" moment feels consistent everywhere.
 *
 * Respects prefers-reduced-motion (the CSS animation is disabled there) and is
 * announced politely for screen readers.
 */

type ChordFlourishProps = {
  /** Detected chord symbol, or null when nothing is recognized yet. */
  symbol: string | null;
  /** Supporting line (quality, notes, or a prompt). */
  detail: string;
  /** Placeholder shown when no notes are held. */
  placeholder?: string;
};

export function ChordFlourish({
  symbol,
  detail,
  placeholder = "—"
}: ChordFlourishProps) {
  const [pulse, setPulse] = useState(0);
  const previous = useRef<string | null>(null);

  useEffect(() => {
    if (symbol && symbol !== previous.current) {
      // Bump a key to retrigger the CSS animation on a genuinely new chord.
      setPulse((value) => value + 1);
    }
    previous.current = symbol;
  }, [symbol]);

  return (
    <div className="chord-flourish" role="status" aria-live="polite">
      <strong
        key={pulse}
        className={symbol ? "chord-flourish__symbol is-recognized" : "chord-flourish__symbol"}
      >
        {symbol ?? placeholder}
      </strong>
      <span className="chord-flourish__detail">{detail}</span>
    </div>
  );
}
