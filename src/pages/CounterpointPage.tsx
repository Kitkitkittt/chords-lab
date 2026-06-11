import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, GitBranch, Play, Square } from "lucide-react";
import {
  checkFirstSpecies,
  type CounterpointIssue
} from "../lib/counterpoint";
import {
  playPattern,
  stopAudioPlayback,
  type AudioPlaybackState,
  type PlaybackPattern
} from "../lib/audioEngine";
import { useProgress } from "../state/progress";

const DEFAULT_CANTUS = "C4 D4 E4 D4 C4";
const DEFAULT_COUNTER = "E4 A4 G4 F4 E4";

function parseLine(value: string): string[] {
  return value
    .trim()
    .split(/[\s,]+/)
    .filter(Boolean);
}

function severityIcon(issue: CounterpointIssue) {
  return issue.severity === "error" ? AlertTriangle : AlertTriangle;
}

/** Build a two-voice chord-by-measure pattern so the exercise can be heard. */
function counterpointPattern(
  cantus: string[],
  counter: string[]
): PlaybackPattern {
  const measures = Math.max(cantus.length, counter.length);
  const events = [];

  for (let measure = 0; measure < measures; measure += 1) {
    const notes = [cantus[measure], counter[measure]].filter(Boolean);

    if (notes.length > 0) {
      events.push({
        note: notes,
        startBeat: measure * 1.5,
        durationBeats: 1.2,
        velocity: 0.6,
        track: "chords"
      });
    }
  }

  return {
    label: "First-species counterpoint",
    bpm: 80,
    meter: "4/4",
    mode: "chord" as const,
    events
  };
}

/**
 * Counterpoint lab: enter two voices (one note per measure) and check them
 * against first-species rules. The rule engine is the pure, tested
 * `src/lib/counterpoint.ts`; this page only collects input and shows findings.
 */
export function CounterpointPage() {
  const { progress } = useProgress();
  const [cantus, setCantus] = useState(DEFAULT_CANTUS);
  const [counter, setCounter] = useState(DEFAULT_COUNTER);
  const [status, setStatus] = useState<AudioPlaybackState>("idle");

  const report = useMemo(
    () => checkFirstSpecies(parseLine(cantus), parseLine(counter)),
    [cantus, counter]
  );

  async function playExercise() {
    if (status === "playing" || status === "loading") {
      stopAudioPlayback((state) => setStatus(state));
      return;
    }

    await playPattern(counterpointPattern(parseLine(cantus), parseLine(counter)), {
      audioEnabled: progress.settings.audioEnabled,
      onStateChange: setStatus
    });
  }

  const errorCount = report.issues.filter(
    (issue) => issue.severity === "error"
  ).length;

  return (
    <div className="page-stack">
      <section className="section-heading">
        <span className="eyebrow">
          <GitBranch size={16} aria-hidden="true" /> Voice leading
        </span>
        <h1>Counterpoint lab</h1>
        <p>
          Write two voices, one note per measure, and check them against the
          basics of first-species counterpoint: consonant intervals, perfect
          consonance at the edges, and no parallel fifths or octaves.
        </p>
      </section>

      <section className="tool-panel" aria-labelledby="counterpoint-input">
        <h2 id="counterpoint-input">Two voices</h2>
        <label className="settings-panel__select">
          Upper voice (counter line)
          <input
            value={counter}
            onChange={(event) => setCounter(event.currentTarget.value)}
            aria-describedby="counterpoint-hint"
          />
        </label>
        <label className="settings-panel__select">
          Lower voice (cantus firmus)
          <input
            value={cantus}
            onChange={(event) => setCantus(event.currentTarget.value)}
            aria-describedby="counterpoint-hint"
          />
        </label>
        <p id="counterpoint-hint">
          Space-separated note names with octaves, e.g. <code>C4 D4 E4</code>.
          Both voices need the same number of notes.
        </p>
        <div className="tool-panel__controls">
          <button className="button" type="button" onClick={playExercise}>
            {status === "playing" || status === "loading" ? (
              <>
                <Square size={17} aria-hidden="true" /> Stop
              </>
            ) : (
              <>
                <Play size={17} aria-hidden="true" /> Play both voices
              </>
            )}
          </button>
        </div>
      </section>

      <section
        className="insight-card"
        data-tone={report.isValid ? "celebrate" : "focus"}
        aria-live="polite"
      >
        <h2>
          {report.isValid ? (
            <>
              <CheckCircle2 size={18} aria-hidden="true" /> Looks solid
            </>
          ) : (
            <>
              <AlertTriangle size={18} aria-hidden="true" /> {errorCount} thing
              {errorCount === 1 ? "" : "s"} to revisit
            </>
          )}
        </h2>
        <p>
          {report.consonantCount} of {report.measures} measures are consonant.
        </p>
        {report.issues.length > 0 ? (
          <ul className="counterpoint-issues">
            {report.issues.map((issue, index) => {
              const Icon = severityIcon(issue);

              return (
                <li key={`${issue.rule}-${index}`} data-severity={issue.severity}>
                  <Icon size={15} aria-hidden="true" />
                  <span>
                    {issue.measure > 0 ? `Measure ${issue.measure}: ` : ""}
                    {issue.detail}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p>No rule issues found. Nice, smooth lines.</p>
        )}
      </section>
    </div>
  );
}
