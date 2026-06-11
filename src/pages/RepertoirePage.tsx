import { useMemo, useState } from "react";
import { Library, Play, Search, Sparkles, Square } from "lucide-react";
import { Link } from "react-router-dom";
import {
  playPattern,
  romanChordNotes,
  stopAudioPlayback,
  type AudioPlaybackState,
  type PlaybackPattern
} from "../lib/audioEngine";
import { repertoireSongs, type RepertoireSong } from "../data/repertoire";
import {
  commonProgressions,
  songsUsingProgressionName
} from "../lib/progressionSpotter";
import { explainProgression } from "../lib/chordSuggest";
import { skillsById } from "../lib/skills";
import { useProgress } from "../state/progress";

/** Build a playable chord-loop pattern from a song's Roman numerals. */
function songPattern(song: RepertoireSong): PlaybackPattern {
  const beatsPerChord = 2;

  return {
    label: song.title,
    bpm: song.bpm,
    meter: song.meter,
    mode: "chord",
    events: song.numerals.map((numeral, index) => ({
      note: romanChordNotes[numeral] ?? romanChordNotes.I,
      startBeat: index * beatsPerChord,
      durationBeats: beatsPerChord * 0.9,
      velocity: 0.6,
      track: "chords"
    }))
  };
}

export function RepertoirePage() {
  const { progress } = useProgress();
  const [activeId, setActiveId] = useState<string>("");
  const [status, setStatus] = useState<AudioPlaybackState>("idle");
  const [progressionName, setProgressionName] = useState<string>("");

  const named = useMemo(() => commonProgressions(), []);
  const spotted = useMemo(() => {
    if (!progressionName) {
      return repertoireSongs;
    }

    const matches = songsUsingProgressionName(progressionName);
    return matches.length > 0 ? matches : [];
  }, [progressionName]);

  async function playSong(song: RepertoireSong) {
    if ((status === "playing" || status === "loading") && activeId === song.id) {
      stopAudioPlayback((state) => setStatus(state));
      return;
    }

    setActiveId(song.id);
    await playPattern(songPattern(song), {
      audioEnabled: progress.settings.audioEnabled,
      onStateChange: setStatus
    });
  }

  return (
    <div className="page-stack">
      <section className="section-heading">
        <span className="eyebrow">
          <Library size={16} aria-hidden="true" /> Real music
        </span>
        <h1>Repertoire</h1>
        <p>
          Hear how theory shows up in traditional and public-domain music. Each
          piece lists an honest Roman-numeral approximation of its harmony so you
          can connect the chords you practice to songs you know. Audio plays only
          when you press a button.
        </p>
      </section>

      <section className="tool-panel" aria-labelledby="spotter-title">
        <h2 id="spotter-title">
          <Search size={18} aria-hidden="true" /> Progression spotter
        </h2>
        <p>Pick a progression to see traditional songs that lean on it.</p>
        <div className="tool-panel__controls">
          <label>
            Progression
            <select
              value={progressionName}
              onChange={(event) => setProgressionName(event.currentTarget.value)}
            >
              <option value="">All songs</option>
              {named.map((item) => (
                <option key={item.name} value={item.name}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="lesson-progress-list" aria-labelledby="repertoire-list">
        <h2 id="repertoire-list">
          {progressionName ? `Songs using ${progressionName}` : "Library"}
        </h2>
        {spotted.length > 0 ? (
          <ol>
            {spotted.map((song) => {
              const isActive =
                activeId === song.id &&
                (status === "playing" || status === "loading");

              return (
                <li key={song.id}>
                  <span>
                    <strong>{song.title}</strong>
                    {` · ${song.origin} · ${song.key} ${song.mode} · ${song.meter}`}
                    <br />
                    <small>
                      {song.numerals.join(" ")} — {explainProgression(
                        song.numerals,
                        song.mode
                      )}
                    </small>
                    <br />
                    <small>
                      Skills:{" "}
                      {song.skills
                        .map((skill) => skillsById.get(skill as never)?.title ?? skill)
                        .join(", ")}
                    </small>
                  </span>
                  <strong>
                    <button
                      className="text-button"
                      type="button"
                      onClick={() => playSong(song)}
                    >
                      {isActive ? (
                        <>
                          <Square size={15} aria-hidden="true" /> Stop
                        </>
                      ) : (
                        <>
                          <Play size={15} aria-hidden="true" /> Play
                        </>
                      )}
                    </button>
                  </strong>
                </li>
              );
            })}
          </ol>
        ) : (
          <p>
            No library song matches that exact progression. Try another, or open
            the <Link to="/tools/progression">progression playground</Link>.
          </p>
        )}
      </section>

      <section className="workspace-band" aria-label="Try it yourself">
        <div className="workspace-band__main">
          <span className="eyebrow">
            <Sparkles size={15} aria-hidden="true" /> Make it your own
          </span>
          <h2>Remix a progression</h2>
          <p>
            Take any of these loops into the Song Lab and build a sketch on top.
          </p>
          <Link className="button button--secondary" to="/lab/song">
            Open Song Lab
          </Link>
        </div>
      </section>
    </div>
  );
}
