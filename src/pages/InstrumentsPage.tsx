import { ArrowRight, Drum, Guitar, Mic2, Piano } from "lucide-react";
import { Link } from "react-router-dom";
import { instrumentProfiles } from "../lib/instruments";
import type { InstrumentId } from "../types/course";

const instrumentIcons: Record<InstrumentId, typeof Piano> = {
  piano: Piano,
  guitar: Guitar,
  bass: Guitar,
  drums: Drum,
  voice: Mic2,
  ukulele: Guitar
};

const learningMap = [
  "Piano Basics",
  "Guitar Fretboard",
  "Bass Foundations",
  "Drum Grooves",
  "Voice and Solfege",
  "Ukulele Basics",
  "Ensemble Skills"
];

export function InstrumentsPage() {
  return (
    <div className="page-stack">
      <section className="section-heading">
        <span className="eyebrow">Full-band basics</span>
        <h1>Instrument lab</h1>
        <p>
          Learn the same notes, chords, scales, and rhythms across piano,
          fretted instruments, drums, and voice guide tones.
        </p>
      </section>

      <section className="instrument-index" aria-label="Instrument workbenches">
        {instrumentProfiles.map((profile) => {
          const Icon = instrumentIcons[profile.id];

          return (
            <Link key={profile.id} to={`/instruments/${profile.id}`}>
              <Icon size={20} aria-hidden="true" />
              <span>{profile.family}</span>
              <strong>{profile.title}</strong>
              <p>{profile.summary}</p>
              <em>
                Open workbench
                <ArrowRight size={16} aria-hidden="true" />
              </em>
            </Link>
          );
        })}
      </section>

      <section className="workspace-band" aria-label="Full-band learning map">
        <div className="workspace-band__main">
          <span className="eyebrow">Learning map</span>
          <h2>Beginner-to-intermediate path</h2>
          <p>
            Each track should move through read, build, hear, practice, and
            apply in Song Lab.
          </p>
        </div>
        <div className="instrument-map-list">
          {learningMap.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      </section>
    </div>
  );
}
