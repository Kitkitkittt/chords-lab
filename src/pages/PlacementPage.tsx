import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { StudioSession } from "../components/StudioSession";
import { generatePlacementPrompts } from "../lib/placement";
import { placementResultFromProgress } from "../lib/placementResults";
import { skillsById } from "../lib/skills";
import { useProgress } from "../state/progress";

const prompts = generatePlacementPrompts();

export function PlacementPage() {
  const { progress, resetPlacementResults } = useProgress();
  const [started, setStarted] = useState(false);
  const result = useMemo(
    () => placementResultFromProgress(progress.placementResults),
    [progress.placementResults]
  );

  function startPlacement() {
    resetPlacementResults();
    setStarted(true);
  }

  return (
    <div className="page-stack">
      <section className="section-heading">
        <span className="eyebrow">Practice</span>
        <h1>Optional placement check</h1>
        <p>An optional, untimed pass through the core modules. It keeps local starting points only and never locks anything.</p>
        <Link className="button button--quiet" to="/practice">Skip to regular practice</Link>
      </section>
      {result && !started ? (
        <section className="workspace-band" role="status">
          <div className="workspace-band__main">
            <h2>Placement results</h2>
            <p><strong>Start here:</strong> {skillsById.get(result.startHere)?.title ?? result.startHere}</p>
            <p><strong>Keep warm:</strong> {skillsById.get(result.keepWarm)?.title ?? result.keepWarm}</p>
          </div>
          <div className="practice-session-summary__actions">
            <button className="button" type="button" onClick={startPlacement}>Retake placement</button>
            <Link className="button button--quiet" to="/">Home</Link>
          </div>
        </section>
      ) : started ? (
        <article className="practice-workbench" aria-labelledby="placement-title">
          <div className="practice-workbench__header"><span className="eyebrow">Eight prompts</span><h2 id="placement-title">Find a comfortable starting point</h2></div>
          <StudioSession prompts={prompts} label="Placement" moduleId="pitch" progressScope="placement" onComplete={() => setStarted(false)} />
        </article>
      ) : (
        <section className="workspace-band" aria-labelledby="placement-title">
          <div className="workspace-band__main"><h2 id="placement-title">Find a comfortable starting point</h2><p>Answer eight prompts to get two optional practice suggestions.</p></div>
          <button className="button" type="button" onClick={startPlacement}>Start placement</button>
        </section>
      )}
    </div>
  );
}
