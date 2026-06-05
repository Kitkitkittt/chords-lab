import { useMemo, useState } from "react";
import { Compass } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { CircleOfFifths } from "../components/CircleOfFifths";
import { ChordProgressionPlayground } from "../components/ChordProgressionPlayground";
import { VoicingDiagram } from "../components/VoicingDiagram";
import { FretboardWorkbench } from "../components/InstrumentWorkbenches";
import { standardTunings } from "../lib/instruments";
import { scaleNotes, voiceLeadProgression, progressionChords } from "../lib/theory";

const SCALE_TONICS = ["C", "G", "D", "A", "E", "F"];
const SCALE_TYPES = ["major", "natural minor", "major pentatonic", "dorian"];

type ToolTab = "circle" | "progression";

const TABS: { id: ToolTab; to: string; label: string }[] = [
  { id: "circle", to: "/tools/circle", label: "Circle & keys" },
  { id: "progression", to: "/tools/progression", label: "Progressions" }
];

function activeTabFromPath(pathname: string): ToolTab {
  return pathname.includes("/tools/progression") ? "progression" : "circle";
}

export function ToolsPage() {
  const location = useLocation();
  const activeTab = activeTabFromPath(location.pathname);
  const [scaleTonic, setScaleTonic] = useState("C");
  const [scaleType, setScaleType] = useState("major");

  const scaleBoxNotes = useMemo(
    () => scaleNotes(scaleTonic, scaleType),
    [scaleTonic, scaleType]
  );
  const demoVoicing = useMemo(
    () => voiceLeadProgression(progressionChords(["ii", "V", "I"], "C")),
    []
  );

  return (
    <div className="page-stack">
      <section className="section-heading">
        <span className="eyebrow">
          <Compass size={16} aria-hidden="true" /> Theory tools
        </span>
        <h1>Interactive theory tools</h1>
        <p>
          Explore keys, build progressions, and see voice leading and scale
          shapes. Everything is derived from the theory engine and works in any
          key. Audio plays only when you press a button.
        </p>
      </section>

      <nav className="tool-tabs" aria-label="Theory tools">
        {TABS.map((tab) => (
          <Link
            key={tab.id}
            to={tab.to}
            className={
              activeTab === tab.id ? "tool-tab is-active" : "tool-tab"
            }
            aria-current={activeTab === tab.id ? "page" : undefined}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {activeTab === "circle" ? (
        <>
          <CircleOfFifths />

          <section className="tool-panel" aria-labelledby="scale-box-title">
            <h2 id="scale-box-title">Fretboard scale-box explorer</h2>
            <div className="tool-panel__controls">
              <label>
                Tonic
                <select
                  value={scaleTonic}
                  onChange={(event) => setScaleTonic(event.currentTarget.value)}
                >
                  {SCALE_TONICS.map((choice) => (
                    <option key={choice} value={choice}>
                      {choice}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Scale
                <select
                  value={scaleType}
                  onChange={(event) => setScaleType(event.currentTarget.value)}
                >
                  {SCALE_TYPES.map((choice) => (
                    <option key={choice} value={choice}>
                      {choice}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <FretboardWorkbench
              instrumentId="guitar"
              title={`${scaleTonic} ${scaleType} on guitar`}
              tuning={standardTunings.guitar}
              activeNotes={scaleBoxNotes}
            />
          </section>
        </>
      ) : (
        <>
          <ChordProgressionPlayground />

          <section className="tool-panel" aria-labelledby="voicing-demo-title">
            <h2 id="voicing-demo-title">Voice leading at a glance</h2>
            <p>
              A ii-V-I in C major, voiced for smooth motion. Filled keys show
              the notes in each chord.
            </p>
            <VoicingDiagram steps={demoVoicing} />
          </section>
        </>
      )}
    </div>
  );
}
