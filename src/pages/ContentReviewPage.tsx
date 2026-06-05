import { AlertTriangle, CheckCircle2, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { lessons } from "../data/course";
import { practiceModules } from "../data/practice";

const lessonPracticeLinks: Record<string, string[]> = {
  "sound-pitch": ["pitch"],
  "staff-keyboard": ["staff"],
  "rhythm-meter": ["rhythm"],
  "accidentals-steps": ["pitch", "scales"],
  "scales-keys": ["scales"],
  intervals: ["intervals"],
  triads: ["chords"],
  "review-glossary": ["review"],
  "scale-fluency": ["scales"],
  "sevenths-inversions": ["chords"],
  "diatonic-harmony": ["harmony"],
  "rhythm-meter-lab": ["rhythm"],
  "ear-training-basics": ["ear"],
  "song-building": ["song"],
  "intervals-fluency": ["intervals"],
  "minor-scales-modes": ["scales"],
  "seventh-chords-keys": ["chords", "harmony"],
  "cadences-phrases": ["harmony", "ear"],
  "common-progressions": ["harmony", "song"],
  "voice-leading-basics": ["harmony"],
  "pop-rock-harmony": ["harmony", "song"],
  "form-song-sections": ["song", "harmony"],
  "analysis-lab": ["harmony", "review"]
};

function pathForPracticeLink(id: string): string {
  if (id === "review") {
    return "/review";
  }

  if (id === "song") {
    return "/lab/song";
  }

  return `/practice/${id}/setup`;
}

export function ContentReviewPage() {
  const practiceIds = new Set<string>(practiceModules.map((module) => module.id));
  const reviewRows = lessons.map((lesson) => {
    const linkedPractice = lessonPracticeLinks[lesson.slug] ?? [];
    const warnings = [
      lesson.citations.length === 0 ? "Missing visible citations" : "",
      lesson.outcomes.length === 0 ? "Missing learner outcomes" : "",
      linkedPractice.length === 0 ? "No linked practice route" : "",
      linkedPractice.some(
        (id) => id !== "review" && id !== "song" && !practiceIds.has(id)
      )
        ? "Unknown practice module"
        : ""
    ].filter(Boolean);

    return {
      lesson,
      linkedPractice,
      warnings
    };
  });
  const flaggedRows = reviewRows.filter((row) => row.warnings.length > 0);

  return (
    <div className="page-stack">
      <section className="section-heading">
        <span className="eyebrow">Content review</span>
        <h1>Educator QA</h1>
        <p>
          Check citations, originality notes, learner outcomes, glossary/source
          coverage, and practice links before adding more course material.
        </p>
      </section>

      <section className="workspace-band">
        <div className="workspace-band__main">
          <h2>Review status</h2>
          <p>
            {lessons.length} lessons checked. {flaggedRows.length} lesson
            {flaggedRows.length === 1 ? "" : "s"} need attention.
          </p>
          <p>
            Source prose remains a taxonomy reference only; app lesson wording
            and practice prompts must stay original.
          </p>
        </div>
        <Link className="button button--quiet" to="/sources">
          <ExternalLink size={18} aria-hidden="true" />
          Source notes
        </Link>
      </section>

      <section className="content-review-list" aria-labelledby="content-review-title">
        <h2 id="content-review-title">Lesson checks</h2>
        <ol>
          {reviewRows.map((row) => (
            <li
              key={row.lesson.slug}
              className={row.warnings.length > 0 ? "is-flagged" : "is-clear"}
            >
              {row.warnings.length > 0 ? (
                <AlertTriangle size={18} aria-hidden="true" />
              ) : (
                <CheckCircle2 size={18} aria-hidden="true" />
              )}
              <div>
                <strong>{row.lesson.title}</strong>
                <span>
                  {row.lesson.citations.length} citation
                  {row.lesson.citations.length === 1 ? "" : "s"} ·{" "}
                  {row.lesson.outcomes.length} outcome
                  {row.lesson.outcomes.length === 1 ? "" : "s"}
                </span>
                {row.warnings.length > 0 ? (
                  <p>{row.warnings.join(", ")}</p>
                ) : (
                  <p>Ready for educator wording and example review.</p>
                )}
                <div className="content-review-list__links">
                  {row.linkedPractice.map((id) => (
                    <Link key={id} to={pathForPracticeLink(id)}>
                      {id}
                    </Link>
                  ))}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
