import { Sparkles } from "lucide-react";
import { JamRoom } from "../components/JamRoom";
import { EarGames } from "../components/EarGames";

/**
 * Play hub: a low-pressure, no-scoring space built around the Jam Room. This is
 * the "just make something that sounds good" destination, distinct from the
 * graded Practice flow.
 */
export function PlayPage() {
  return (
    <div className="page-stack">
      <section className="section-heading">
        <span className="eyebrow">
          <Sparkles size={15} aria-hidden="true" /> No scoring, no timer
        </span>
        <h1>Play</h1>
        <p>
          Start a backing loop and play over it. Nothing to get wrong here, just
          a calm space to explore sounds and find something you like.
        </p>
      </section>

      <JamRoom />
      <EarGames />
    </div>
  );
}
