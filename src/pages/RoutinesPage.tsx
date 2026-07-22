import { useState } from "react";
import { ListChecks, Play, Plus, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import {
  MAX_ROUTINE_STEPS,
  createRoutine,
  defaultRoutines,
  describeRoutine,
  routeForStep
} from "../lib/routines";
import type { Routine, RoutineStep } from "../lib/routines";
import { useProgress } from "../state/progress";

const stepOptions: RoutineStep[] = [
  { kind: "review", label: "Review" },
  { kind: "module", moduleId: "pitch", label: "Pitch" },
  { kind: "module", moduleId: "chords", label: "Chords" },
  { kind: "play", label: "Free play" }
];

export function RoutinesPage() {
  const { progress, saveRoutine, deleteRoutine } = useProgress();
  const [status, setStatus] = useState("");
  const [name, setName] = useState("");
  const [steps, setSteps] = useState<RoutineStep[]>([]);
  const [running, setRunning] = useState<{ routine: Routine; index: number }>();
  const [presets] = useState(defaultRoutines);
  const saved = progress.settings.routines ?? [];

  function addStep(step: RoutineStep) {
    setSteps((current) => current.length < MAX_ROUTINE_STEPS ? [...current, step] : current);
  }

  if (running) {
    const step = running.routine.steps[running.index];
    return (
      <div className="page-stack">
        <section className="section-heading"><span className="eyebrow">Routine</span><h1>{running.routine.name}</h1><p>Step {running.index + 1} of {running.routine.steps.length}: {step.label}</p></section>
        <section className="workspace-band"><div className="workspace-band__main"><h2>{step.label}</h2><p>Open this gentle step when you are ready.</p></div><Link className="button" to={routeForStep(step)}>Open step</Link></section>
        <div className="practice-actions">
          <button className="button button--quiet" type="button" disabled={running.index === 0} onClick={() => setRunning({ ...running, index: running.index - 1 })}>Previous</button>
          {running.index + 1 < running.routine.steps.length ? <button className="button button--secondary" type="button" onClick={() => setRunning({ ...running, index: running.index + 1 })}>Next gentle step</button> : <button className="button button--secondary" type="button" onClick={() => { setRunning(undefined); setStatus("Routine finished for today."); }}>Finish for today</button>}
        </div>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <section className="section-heading"><span className="eyebrow"><ListChecks size={16} aria-hidden="true" /> Calm routines</span><h1>Routines</h1><p>Save up to three gentle steps. No streaks, no pressure.</p></section>
      <section className="lesson-progress-list" aria-labelledby="make-routine">
        <h2 id="make-routine">Make a routine</h2>
        <label>Name <input value={name} onChange={(event) => setName(event.target.value)} /></label>
        <div className="practice-actions">{stepOptions.map((step) => <button key={`${step.kind}-${step.label}`} className="button button--quiet" type="button" disabled={steps.length >= MAX_ROUTINE_STEPS} onClick={() => addStep(step)}>Add {step.label}</button>)}</div>
        <p>{steps.length}/{MAX_ROUTINE_STEPS} steps: {steps.map((step) => step.label).join(", ") || "choose a step"}</p>
        <button className="button" type="button" disabled={!name.trim() || steps.length === 0} onClick={() => { const routine = createRoutine(name, steps); saveRoutine(routine); setName(""); setSteps([]); setStatus(`Saved "${routine.name}".`); }}>Save routine</button>
      </section>
      <section className="lesson-progress-list" aria-labelledby="saved-routines"><h2 id="saved-routines">Your routines</h2>
        {saved.length ? <ol>{saved.map((routine) => <li key={routine.id}><span><strong>{routine.name}</strong><br /><small>{describeRoutine(routine)}</small></span><strong><button className="text-button" type="button" onClick={() => setRunning({ routine, index: 0 })}><Play size={15} aria-hidden="true" /> Start</button><button className="text-button" type="button" onClick={() => { deleteRoutine(routine.id); setStatus("Routine removed."); }}><Trash2 size={15} aria-hidden="true" /> Remove</button></strong></li>)}</ol> : <p>No saved routines yet.</p>}
        <p role="status">{status}</p>
      </section>
      <section className="lesson-progress-list" aria-labelledby="preset-routines"><h2 id="preset-routines">Presets</h2><ol>{presets.map((routine) => <li key={routine.id}><span><strong>{routine.name}</strong><br /><small>{describeRoutine(routine)}</small></span><button className="text-button" type="button" onClick={() => { saveRoutine(routine); setStatus(`Added "${routine.name}".`); }}><Plus size={15} aria-hidden="true" /> Add</button></li>)}</ol></section>
    </div>
  );
}
