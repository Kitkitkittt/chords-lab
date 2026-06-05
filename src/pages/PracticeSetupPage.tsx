import { ArrowRight, Settings2 } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { practiceModules } from "../data/practice";
import type { PracticeModuleId } from "../data/practice";
import {
  practiceKeysForDifficulty,
  practiceTopicsForModule
} from "../lib/practiceGenerators";
import type { PracticeDifficulty } from "../lib/practiceEngine";
import { useProgress } from "../state/progress";

function isPracticeModuleId(value: string | undefined): value is PracticeModuleId {
  return practiceModules.some((module) => module.id === value);
}

export function PracticeSetupPage() {
  const params = useParams();
  const navigate = useNavigate();
  const { progress } = useProgress();
  const moduleId = isPracticeModuleId(params.moduleId) ? params.moduleId : "pitch";
  const module = practiceModules.find((item) => item.id === moduleId);
  const [difficulty, setDifficulty] =
    useState<PracticeDifficulty>("beginner");
  const [promptCount, setPromptCount] = useState(10);
  const [clef, setClef] = useState("treble");
  const [key, setKey] = useState("C");
  const [topic, setTopic] = useState("mixed");
  const [audioEnabled, setAudioEnabled] = useState(
    progress.settings.audioEnabled
  );
  const topics = useMemo(() => practiceTopicsForModule(moduleId), [moduleId]);
  const keys = useMemo(() => practiceKeysForDifficulty(difficulty), [difficulty]);

  function startSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const searchParams = new URLSearchParams({
      difficulty,
      count: String(promptCount),
      clef,
      key,
      topic,
      audio: audioEnabled ? "on" : "off",
      seed: `${moduleId}-${difficulty}-${key}-${topic}-${promptCount}`
    });

    navigate(`/practice/${moduleId}?${searchParams.toString()}`);
  }

  return (
    <div className="page-stack">
      <section className="section-heading">
        <span className="eyebrow">Practice setup</span>
        <h1>{module?.title ?? "Practice"} session</h1>
        <p>
          Choose a short generated set. Defaults stay beginner-friendly,
          untimed, and replayable.
        </p>
      </section>

      <form className="practice-setup" onSubmit={startSession}>
        <section aria-labelledby="setup-core">
          <h2 id="setup-core">
            <Settings2 size={18} aria-hidden="true" />
            Session
          </h2>
          <label>
            Difficulty
            <select
              value={difficulty}
              onChange={(event) =>
                setDifficulty(event.currentTarget.value as PracticeDifficulty)
              }
            >
              <option value="beginner">Beginner</option>
              <option value="early-intermediate">Early intermediate</option>
            </select>
          </label>
          <label>
            Prompt count
            <input
              type="number"
              min="3"
              max="20"
              value={promptCount}
              onChange={(event) =>
                setPromptCount(Number(event.currentTarget.value))
              }
            />
          </label>
          <label>
            Topic
            <select
              value={topic}
              onChange={(event) => setTopic(event.currentTarget.value)}
            >
              {topics.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        </section>

        <section aria-labelledby="setup-context">
          <h2 id="setup-context">Context</h2>
          <label>
            Key
            <select
              value={key}
              onChange={(event) => setKey(event.currentTarget.value)}
            >
              {keys.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label>
            Clef
            <select
              value={clef}
              onChange={(event) => setClef(event.currentTarget.value)}
            >
              <option value="treble">Treble</option>
              <option value="bass">Bass</option>
              <option value="mixed">Mixed</option>
            </select>
          </label>
          <label>
            <input
              type="checkbox"
              checked={audioEnabled}
              onChange={(event) => setAudioEnabled(event.currentTarget.checked)}
            />
            Audio replay enabled
          </label>
        </section>

        <div className="practice-actions">
          <button className="button" type="submit">
            Start generated session
            <ArrowRight size={17} aria-hidden="true" />
          </button>
        </div>
      </form>
    </div>
  );
}
