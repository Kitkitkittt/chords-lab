import { Sparkles, Wand2 } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { StudioSession } from "../components/StudioSession";
import { generateSmartSessionPrompts } from "../lib/smartSessionPrompts";
import { planSmartSession, smartSessionSnapshot } from "../lib/smartSession";
import { skillsById } from "../lib/skills";
import { useProgress } from "../state/progress";
import type { ProgressState } from "../types/course";

const reasonLabel = { due: "Review", weak: "Focus", new: "New" } as const;

function createSmartSession(progress: ProgressState) {
  const now = new Date();
  const plan = planSmartSession(progress, 5, now);
  const snapshot = smartSessionSnapshot(progress);

  return {
    plan,
    prompts: generateSmartSessionPrompts(plan, `smart-${snapshot}`)
  };
}

export function SmartSessionPage() {
  const { progress } = useProgress();
  const [session] = useState(() => createSmartSession(progress));
  const [complete, setComplete] = useState(false);

  return (
    <div className="page-stack">
      <section className="section-heading">
        <span className="eyebrow">
          <Sparkles size={16} aria-hidden="true" /> Practice for me
        </span>
        <h1>Smart session</h1>
        <p>A calm five-prompt session: review, focus, and one new direction when it fits.</p>
      </section>

      {complete ? (
        <section className="workspace-band" role="status">
          <div className="workspace-band__main">
            <h2>Done for today</h2>
            <p>Your session stays local. Return whenever another short loop feels useful.</p>
          </div>
          <Link className="button button--quiet" to="/">Home</Link>
        </section>
      ) : session.plan.slots.length > 0 ? (
        <>
          <section className="workspace-band">
            <div className="workspace-band__main">
              <p><strong>{session.plan.summary}</strong></p>
              <p>Each prompt stays in this session. Skip any prompt or end when you are done.</p>
            </div>
          </section>
          <section className="lesson-progress-list" aria-labelledby="smart-plan">
            <h2 id="smart-plan"><Wand2 size={18} aria-hidden="true" /> Your session</h2>
            <ol>
              {session.plan.slots.map((slot) => {
                const skill = skillsById.get(slot.skillId);
                return (
                  <li key={slot.skillId}>
                    <span>
                      <strong>{skill?.title ?? slot.skillId}</strong>
                      {skill ? ` · ${skill.summary}` : null}
                    </span>
                    <span className="pill" data-reason={slot.reason}>{reasonLabel[slot.reason]}</span>
                  </li>
                );
              })}
            </ol>
          </section>
          <section className="practice-workbench" aria-label="Smart session prompts">
            <StudioSession
              prompts={session.prompts}
              label="Smart session"
              moduleId="smart"
              onComplete={() => setComplete(true)}
            />
          </section>
        </>
      ) : (
        <p>No skills are ready yet. Try a short session from <Link to="/practice">Practice</Link>.</p>
      )}
    </div>
  );
}
