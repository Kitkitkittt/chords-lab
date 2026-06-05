import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <section className="not-found" aria-labelledby="not-found-title">
      <span className="eyebrow">Not found</span>
      <h1 id="not-found-title">This page is not in the course.</h1>
      <p>Use one of these to get back on track.</p>
      <div className="not-found__actions">
        <Link className="button" to="/">
          Go home
        </Link>
        <Link className="button button--quiet" to="/learn">
          Course map
        </Link>
      </div>
    </section>
  );
}
