import { useMemo, useState } from "react";
import { Waypoints } from "lucide-react";
import { StudioSession } from "../components/StudioSession";
import {
  generateAdvancedHarmonyPrompts,
  type AdvancedHarmonyTopic
} from "../lib/advancedHarmonyGenerators";

const TOPICS: { id: AdvancedHarmonyTopic; label: string; blurb: string }[] = [
  {
    id: "secondary-dominants",
    label: "Secondary dominants",
    blurb: "Dominant chords that tonicize a scale degree (V/V, V/vi…)."
  },
  {
    id: "borrowed-chords",
    label: "Borrowed chords",
    blurb: "Modal mixture: chords borrowed from the parallel minor."
  },
  {
    id: "modulation",
    label: "Modulation",
    blurb: "Pivot chords and changing key centers."
  }
];

/**
 * Advanced harmony studio: intermediate prompts for secondary dominants,
 * borrowed chords, and modulation. Reuses the shared StudioSession surface and
 * the deterministic advanced-harmony generators. Untimed.
 */
export function AdvancedHarmonyPage() {
  const [topic, setTopic] = useState<AdvancedHarmonyTopic>("secondary-dominants");
  const [seed, setSeed] = useState(() => `advanced-${Date.now()}`);
  const prompts = useMemo(
    () => generateAdvancedHarmonyPrompts(topic, 8, seed),
    [topic, seed]
  );
  const active = TOPICS.find((item) => item.id === topic) ?? TOPICS[0];

  return (
    <div className="page-stack">
      <section className="section-heading">
        <span className="eyebrow">
          <Waypoints size={16} aria-hidden="true" /> Intermediate harmony
        </span>
        <h1>Advanced harmony</h1>
        <p>
          Stretch past diatonic chords: tonicize with secondary dominants, color
          a key with borrowed chords, and recognize pivots when the music
          modulates. No timer.
        </p>
      </section>

      <section className="tool-tabs" aria-label="Harmony topic">
        {TOPICS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={topic === item.id ? "tool-tab is-active" : "tool-tab"}
            aria-pressed={topic === item.id}
            onClick={() => setTopic(item.id)}
          >
            {item.label}
          </button>
        ))}
        <button
          type="button"
          className="tool-tab"
          onClick={() => setSeed(`advanced-${Date.now()}`)}
        >
          New set
        </button>
      </section>

      <article className="practice-workbench" aria-labelledby="advanced-harmony-title">
        <div className="practice-workbench__header">
          <span className="eyebrow">{active.label}</span>
          <h2 id="advanced-harmony-title">{active.blurb}</h2>
        </div>
        <StudioSession prompts={prompts} label="Advanced harmony" moduleId="harmony" />
      </article>
    </div>
  );
}
