import { ExternalLink } from "lucide-react";
import { sourceEntries } from "../data/sources";

export function SourcesPage() {
  return (
    <div className="page-stack">
      <section className="section-heading">
        <span className="eyebrow">Sources</span>
        <h1>Bibliography and use notes</h1>
        <p>
          Chords Lab uses these sources for coverage checks and citations. The
          app text is original and avoids copying source lessons or assets.
        </p>
      </section>

      <div className="source-table" role="table" aria-label="Source bibliography">
        <div className="source-table__header" role="row">
          <span role="columnheader">Source</span>
          <span role="columnheader">Best use</span>
          <span role="columnheader">Risk</span>
        </div>
        {sourceEntries.map((source) => (
          <article className="source-row" role="row" key={source.url}>
            <div role="cell">
              <a href={source.url} target="_blank" rel="noreferrer">
                {source.label}
                <ExternalLink size={14} aria-hidden="true" />
              </a>
              <small>{source.owner}</small>
              <p>{source.licenseNote}</p>
            </div>
            <p role="cell">{source.bestUse}</p>
            <span
              role="cell"
              className={`risk-pill risk-pill--${source.riskLevel}`}
            >
              {source.riskLevel}
            </span>
          </article>
        ))}
      </div>
    </div>
  );
}
