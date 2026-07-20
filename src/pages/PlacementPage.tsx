import { Link } from "react-router-dom";
import { StudioSession } from "../components/StudioSession";
import { generatePlacementPrompts } from "../lib/placement";

const prompts = generatePlacementPrompts();

export function PlacementPage() {
  return (
    <div className="page-stack">
      <section className="section-heading">
        <span className="eyebrow">Practice</span>
        <h1>Optional placement check</h1>
        <p>
          An optional, untimed pass through the core modules. It keeps local
          starting points only and never locks anything.
        </p>
        <Link className="button button--quiet" to="/practice">
          Skip to regular practice
        </Link>
      </section>

      <article className="practice-workbench" aria-labelledby="placement-title">
        <div className="practice-workbench__header">
          <span className="eyebrow">Eight prompts</span>
          <h2 id="placement-title">Find a comfortable starting point</h2>
        </div>
        <StudioSession prompts={prompts} label="Placement" moduleId="pitch" />
      </article>
    </div>
  );
}
