import { Note } from "tonal";

/**
 * Voicing diagram: renders a chord's voiced notes on a compact, single-octave
 * keyboard strip so smooth voice leading is visible, not just listed. Pure
 * presentation; the voiced notes come from the theory engine
 * (`voiceLeadProgression`).
 */

type VoicingDiagramProps = {
  steps: { chord: string; voicing: string[] }[];
};

const WHITE_KEYS = ["C", "D", "E", "F", "G", "A", "B"];
const BLACK_AFTER = new Set(["C", "D", "F", "G", "A"]);

function pitchClass(note: string): string {
  return Note.pitchClass(note) || note.replace(/[-0-9]/g, "");
}

export function VoicingDiagram({ steps }: VoicingDiagramProps) {
  return (
    <div className="voicing-diagram" aria-label="Chord voicings">
      {steps.map((step, index) => {
        const active = new Set(step.voicing.map(pitchClass));

        return (
          <figure key={`${step.chord}-${index}`} className="voicing-diagram__chord">
            <figcaption>{step.chord}</figcaption>
            <div className="voicing-keys" role="img" aria-label={`${step.chord}: ${step.voicing.join(" ")}`}>
              {WHITE_KEYS.map((white) => (
                <span
                  key={white}
                  className={
                    active.has(white)
                      ? "voicing-key voicing-key--white is-active"
                      : "voicing-key voicing-key--white"
                  }
                >
                  {BLACK_AFTER.has(white) ? (
                    <span
                      className={
                        active.has(`${white}#`)
                          ? "voicing-key--black is-active"
                          : "voicing-key--black"
                      }
                    />
                  ) : null}
                </span>
              ))}
            </div>
            <small>{step.voicing.join(" ")}</small>
          </figure>
        );
      })}
    </div>
  );
}
