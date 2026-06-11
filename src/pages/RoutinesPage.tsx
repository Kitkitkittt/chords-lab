import { useState } from "react";
import { ListChecks, Play, Plus, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import {
  defaultRoutines,
  describeRoutine,
  routeForStep
} from "../lib/routines";
import { useProgress } from "../state/progress";

/**
 * Routines: calm, user-defined practice sequences. No streaks, no loss states,
 * no penalties — a routine is just a saved list of gentle steps. Presets can be
 * added with one tap; saved routines live in local progress settings.
 */
export function RoutinesPage() {
  const { progress, saveRoutine, deleteRoutine } = useProgress();
  const [status, setStatus] = useState("");
  const saved = progress.settings.routines ?? [];
  const presets = defaultRoutines();

  return (
    <div className="page-stack">
      <section className="section-heading">
        <span className="eyebrow">
          <ListChecks size={16} aria-hidden="true" /> Calm routines
        </span>
        <h1>Routines</h1>
        <p>
          Save a short sequence of steps to repeat when you sit down to practice.
          Routines are gentle reminders, never demands — there are no streaks and
          nothing to lose.
        </p>
      </section>

      <section className="lesson-progress-list" aria-labelledby="saved-routines">
        <h2 id="saved-routines">Your routines</h2>
        {saved.length > 0 ? (
          <ol>
            {saved.map((routine) => (
              <li key={routine.id}>
                <span>
                  <strong>{routine.name}</strong>
                  <br />
                  <small>{describeRoutine(routine)}</small>
                </span>
                <strong>
                  {routine.steps[0] ? (
                    <Link
                      className="text-button"
                      to={routeForStep(routine.steps[0])}
                    >
                      <Play size={15} aria-hidden="true" /> Start
                    </Link>
                  ) : null}
                  <button
                    className="text-button"
                    type="button"
                    onClick={() => {
                      deleteRoutine(routine.id);
                      setStatus("Routine removed.");
                    }}
                  >
                    <Trash2 size={15} aria-hidden="true" /> Remove
                  </button>
                </strong>
              </li>
            ))}
          </ol>
        ) : (
          <p>No saved routines yet. Add a preset below to get started.</p>
        )}
        <p role="status">{status}</p>
      </section>

      <section className="lesson-progress-list" aria-labelledby="preset-routines">
        <h2 id="preset-routines">Presets</h2>
        <ol>
          {presets.map((routine) => (
            <li key={routine.id}>
              <span>
                <strong>{routine.name}</strong>
                <br />
                <small>{describeRoutine(routine)}</small>
              </span>
              <strong>
                <button
                  className="text-button"
                  type="button"
                  onClick={() => {
                    saveRoutine(routine);
                    setStatus(`Added "${routine.name}" to your routines.`);
                  }}
                >
                  <Plus size={15} aria-hidden="true" /> Add
                </button>
              </strong>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
