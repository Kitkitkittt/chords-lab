import { useMemo, useState } from "react";
import { Ear } from "lucide-react";
import { StudioSession } from "../components/StudioSession";
import {
  generateDictationPrompts,
  type DictationKind
} from "../lib/dictationGenerators";

/**
 * Dictation studio: hear a short melody or rhythm, then rebuild it. Reuses the
 * shared StudioSession surface and the deterministic dictation generators.
 * Audio is user-triggered; nothing is timed.
 */
export function DictationPage() {
  const [kind, setKind] = useState<DictationKind>("melodic");
  const [seed, setSeed] = useState(() => `dictation-${Date.now()}`);
  const prompts = useMemo(
    () => generateDictationPrompts(kind, 8, seed),
    [kind, seed]
  );

  return (
    <div className="page-stack">
      <section className="section-heading">
        <span className="eyebrow">
          <Ear size={16} aria-hidden="true" /> Ear training
        </span>
        <h1>Dictation</h1>
        <p>
          Play the prompt, then rebuild what you heard. Melodic dictation asks
          for the notes in order; rhythmic dictation asks for the pattern of
          hits and rests. No timer, replay as often as you like.
        </p>
      </section>

      <section className="tool-tabs" aria-label="Dictation type">
        <button
          type="button"
          className={kind === "melodic" ? "tool-tab is-active" : "tool-tab"}
          aria-pressed={kind === "melodic"}
          onClick={() => setKind("melodic")}
        >
          Melodic
        </button>
        <button
          type="button"
          className={kind === "rhythmic" ? "tool-tab is-active" : "tool-tab"}
          aria-pressed={kind === "rhythmic"}
          onClick={() => setKind("rhythmic")}
        >
          Rhythmic
        </button>
        <button
          type="button"
          className="tool-tab"
          onClick={() => setSeed(`dictation-${Date.now()}`)}
        >
          New set
        </button>
      </section>

      <article className="practice-workbench" aria-labelledby="dictation-title">
        <div className="practice-workbench__header">
          <span className="eyebrow">
            {kind === "melodic" ? "Melodic" : "Rhythmic"} dictation
          </span>
          <h2 id="dictation-title">Listen, then rebuild</h2>
        </div>
        <StudioSession
          prompts={prompts}
          label="Dictation"
          moduleId={kind === "melodic" ? "ear" : "rhythm"}
        />
      </article>
    </div>
  );
}
