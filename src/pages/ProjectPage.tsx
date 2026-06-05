import { CheckCircle2, CircleDashed, ClipboardList, Timer } from "lucide-react";
import { Link } from "react-router-dom";
import { interactiveGoals } from "../data/interactiveGoals";
import {
  acceptanceChecklist,
  projectDecisions,
  projectMilestones
} from "../data/projectStatus";

const statusIcon = {
  complete: CheckCircle2,
  "in-progress": Timer,
  planned: CircleDashed
};

const goalStatusIcon = {
  now: CheckCircle2,
  next: Timer,
  later: CircleDashed
};

export function ProjectPage() {
  return (
    <div className="page-stack">
      <section className="section-heading">
        <span className="eyebrow">Project plan</span>
        <h1>Plan and progress</h1>
        <p>
          Current implementation status for Chords Lab V7. This page documents
          product decisions, shipped work, and the remaining roadmap.
        </p>
        <Link className="button button--quiet" to="/plan/content-review">
          Open content review
        </Link>
      </section>

      <section className="decision-strip" aria-label="Locked project decisions">
        {projectDecisions.map((decision) => (
          <article key={decision.label} className="decision-strip__item">
            <span>{decision.label}</span>
            <strong>{decision.value}</strong>
          </article>
        ))}
      </section>

      <section className="project-timeline" aria-labelledby="timeline-title">
        <div className="section-heading">
          <span className="eyebrow">Build status</span>
          <h2 id="timeline-title">Milestones</h2>
        </div>
        <ol>
          {projectMilestones.map((milestone) => {
            const Icon = statusIcon[milestone.status];

            return (
              <li
                key={milestone.title}
                className={`project-timeline__item is-${milestone.status}`}
              >
                <Icon size={20} aria-hidden="true" />
                <div>
                  <span>{milestone.status.replace("-", " ")}</span>
                  <h3>{milestone.title}</h3>
                  <p>{milestone.summary}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      <section
        className="interactive-roadmap"
        aria-labelledby="interactive-goals-title"
      >
        <div className="section-heading">
          <span className="eyebrow">Interactive roadmap</span>
          <h2 id="interactive-goals-title">Module goals</h2>
          <p>
            The next phase turns the reference course into a fuller interactive
            music-learning workspace while keeping the low-noise lesson flow.
          </p>
        </div>
        <div className="interactive-goals">
          {interactiveGoals.map((goal) => {
            const Icon = goalStatusIcon[goal.status];

            return (
              <article
                key={goal.title}
                className={`interactive-goal is-${goal.status}`}
              >
                <Icon size={18} aria-hidden="true" />
                <div>
                  <span>
                    {goal.module} · {goal.status}
                  </span>
                  <strong>{goal.title}</strong>
                  <p>{goal.summary}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="acceptance-panel" aria-labelledby="acceptance-title">
        <div>
          <ClipboardList size={20} aria-hidden="true" />
          <h2 id="acceptance-title">V7 acceptance checklist</h2>
        </div>
        <ul>
          {acceptanceChecklist.map((item) => (
            <li key={item}>
              <CheckCircle2 size={18} aria-hidden="true" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
