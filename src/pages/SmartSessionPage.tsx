import { useMemo } from "react";
import { Sparkles, Wand2 } from "lucide-react";
import { Link } from "react-router-dom";
import { planSmartSession } from "../lib/smartSession";
import { skillsById } from "../lib/skills";
import { useProgress } from "../state/progress";

/**
 * Smart Session: a one-tap, calm practice plan composed from local progress.
 *
 * The plan is built by the pure planner in `src/lib/smartSession.ts`, mixing
 * due-review, weak, and new skills. This page presents the plan and links each
 * slot into the existing per-module practice route, so no new session engine is
 * needed and the experience stays consistent with the rest of Practice.
 */

const reasonLabel: Record<"due" | "weak" | "new", string> = {
  due: "Review",
  weak: "Focus",
  new: "New"
};

export function SmartSessionPage() {
  const { progress } = useProgress();
  const plan = useMemo(() => planSmartSession(progress), [progress]);

  return (
    <div className="page-stack">
      <section className="section-heading">
        <span className="eyebrow">
          <Sparkles size={16} aria-hidden="true" /> Practice for me
        </span>
        <h1>Smart session</h1>
        <p>
          A balanced, ready-to-go plan built from what you have practiced:
          review that is ripening, a little focus on weaker spots, and a taste of
          something new. Take it at your own pace, no timer.
        </p>
      </section>

      <section className="workspace-band">
        <div className="workspace-band__main">
          <p>
            <strong>{plan.summary}</strong>
          </p>
          <p>
            Each step opens its practice module. Do as many or as few as feel
            good today.
          </p>
        </div>
      </section>

      <section className="lesson-progress-list" aria-labelledby="smart-plan">
        <h2 id="smart-plan">
          <Wand2 size={18} aria-hidden="true" /> Your plan
        </h2>
        {plan.slots.length > 0 ? (
          <ol>
            {plan.slots.map((slot, index) => {
              const skill = skillsById.get(slot.skillId);

              return (
                <li key={`${slot.skillId}-${index}`}>
                  <span>
                    <strong>{skill ? skill.title : slot.skillId}</strong>
                    {skill ? ` · ${skill.summary}` : null}
                  </span>
                  <strong>
                    <span className="pill" data-reason={slot.reason}>
                      {reasonLabel[slot.reason]}
                    </span>
                    <Link
                      className="text-button"
                      to={`/practice/${slot.moduleId}`}
                    >
                      Start
                    </Link>
                  </strong>
                </li>
              );
            })}
          </ol>
        ) : (
          <p>
            No skills are ready yet. Try a short session from{" "}
            <Link to="/practice">Practice</Link> to get started.
          </p>
        )}
      </section>
    </div>
  );
}
