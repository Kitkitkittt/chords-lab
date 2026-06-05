import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { glossaryTerms } from "../data/glossary";

export function GlossaryPage() {
  const [query, setQuery] = useState("");
  const filteredTerms = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      return glossaryTerms;
    }

    return glossaryTerms.filter((term) => {
      return [term.term, term.plainMeaning, term.topic]
        .join(" ")
        .toLowerCase()
        .includes(normalized);
    });
  }, [query]);

  return (
    <div className="page-stack">
      <section className="section-heading">
        <span className="eyebrow">Glossary</span>
        <h1>Beginner terms</h1>
        <p>
          Search for a word when a lesson feels dense. Each entry links back to
          source families used for research.
        </p>
      </section>

      <label className="search-box">
        <Search size={18} aria-hidden="true" />
        <span className="visually-hidden">Search glossary</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
          placeholder="Search terms"
        />
      </label>

      <div className="glossary-list">
        {filteredTerms.map((term) => (
          <article key={term.term} className="glossary-term">
            <span className="eyebrow">{term.topic}</span>
            <h2>{term.term}</h2>
            <p>{term.plainMeaning}</p>
            <ul>
              {term.sourceUrls.map((url) => (
                <li key={url}>
                  <a href={url} target="_blank" rel="noreferrer">
                    {url}
                  </a>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </div>
  );
}
