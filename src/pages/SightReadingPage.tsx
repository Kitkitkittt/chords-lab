import { useMemo, useState } from "react";
import { BookOpenCheck } from "lucide-react";
import { StudioSession } from "../components/StudioSession";
import {
  generateSightReadingPrompts,
  type SightReadingLevel
} from "../lib/sightReadingGenerators";

/**
 * Sight-reading studio: a short notated melody is shown; read it and place the
 * note names in order, then play it to check. Reuses the shared StudioSession
 * surface and the deterministic sight-reading generators. Self-paced, no
 * metronome pressure.
 */
export function SightReadingPage() {
  const [level, setLevel] = useState<SightReadingLevel>("beginner");
  const [seed, setSeed] = useState(() => `sight-reading-${Date.now()}`);
  const prompts = useMemo(
    () => generateSightReadingPrompts(8, level, seed),
    [level, seed]
  );

  return (
    <div className="page-stack">
      <section className="section-heading">
        <span className="eyebrow">
          <BookOpenCheck size={16} aria-hidden="true" /> Reading
        </span>
        <h1>Sight-reading</h1>
        <p>
          Read the melody on the staff and place the note names in order, then
          play it to check your reading. Go at your own pace, there is no
          metronome and no timer.
        </p>
      </section>

      <section className="tool-tabs" aria-label="Sight-reading level">
        <button
          type="button"
          className={level === "beginner" ? "tool-tab is-active" : "tool-tab"}
          aria-pressed={level === "beginner"}
          onClick={() => setLevel("beginner")}
        >
          Beginner
        </button>
        <button
          type="button"
          className={level === "intermediate" ? "tool-tab is-active" : "tool-tab"}
          aria-pressed={level === "intermediate"}
          onClick={() => setLevel("intermediate")}
        >
          Intermediate
        </button>
        <button
          type="button"
          className="tool-tab"
          onClick={() => setSeed(`sight-reading-${Date.now()}`)}
        >
          New set
        </button>
      </section>

      <article className="practice-workbench" aria-labelledby="sight-reading-title">
        <div className="practice-workbench__header">
          <span className="eyebrow">{level} sight-reading</span>
          <h2 id="sight-reading-title">Read it, then play it</h2>
        </div>
        <StudioSession prompts={prompts} label="Sight-reading" moduleId="staff" />
      </article>
    </div>
  );
}
