import { Link, useSearchParams } from "react-router-dom";
import { StudioSession } from "../components/StudioSession";
import {
  buildConfusionPairs,
  generateConfusionPairDrill
} from "../lib/confusionPairs";
import { useProgress } from "../state/progress";

export function ConfusionDrillsPage() {
  const [searchParams] = useSearchParams();
  const { progress } = useProgress();
  const pairs = buildConfusionPairs(progress.practiceAttempts ?? []);
  const selectedPair =
    pairs.find((pair) => pair.id === searchParams.get("pair")) ?? pairs[0];

  if (!selectedPair) {
    return (
      <div className="page-stack">
        <section className="section-heading">
          <span className="eyebrow">Practice</span>
          <h1>Useful contrasts</h1>
          <p>No repeated contrasts yet. Regular practice will reveal them when useful.</p>
          <Link className="button button--quiet" to="/practice">
            Go to regular practice
          </Link>
        </section>
      </div>
    );
  }

  const [first, second] = selectedPair.tokens;

  return (
    <div className="page-stack">
      <section className="section-heading">
        <span className="eyebrow">Practice</span>
        <h1>{first} and {second}</h1>
        <p>
          These answers were mixed up {selectedPair.count} times. Try the contrast
          at your own pace.
        </p>
      </section>

      <article className="practice-workbench" aria-labelledby="confusion-title">
        <div className="practice-workbench__header">
          <span className="eyebrow">Useful contrast</span>
          <h2 id="confusion-title">Compare {first} and {second}</h2>
        </div>
        <StudioSession
          prompts={generateConfusionPairDrill(selectedPair)}
          label="Contrast"
          moduleId={selectedPair.cases[0].moduleId}
        />
      </article>
    </div>
  );
}
