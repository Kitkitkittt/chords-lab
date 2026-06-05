import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <section className="not-found" aria-labelledby="not-found-title">
      <span className="eyebrow">Not found</span>
      <h1 id="not-found-title">This page is not in the course.</h1>
      <Link className="button" to="/learn">
        Return to course map
      </Link>
    </section>
  );
}
