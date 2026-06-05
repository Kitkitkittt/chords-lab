import { Link } from "react-router-dom";
import { Download, Heart, ShieldCheck, WifiOff } from "lucide-react";
import { PROGRESS_STORAGE_KEY } from "../lib/progressStorage";

export function AboutPage() {
  return (
    <div className="page-stack">
      <section className="section-heading">
        <span className="eyebrow">About</span>
        <h1>About Chords Lab and your privacy</h1>
        <p>
          Chords Lab is a calm, local-first music theory app for
          beginner-to-early-intermediate learners. It teaches through short
          lessons, generated practice, ear training, interactive theory tools,
          and a Song Lab sketchpad.
        </p>
      </section>

      <section className="about-grid" aria-label="What makes Chords Lab calm">
        <article className="about-card">
          <ShieldCheck size={20} aria-hidden="true" />
          <h2>No accounts, no tracking</h2>
          <p>
            There is no sign-up, no backend, no analytics, and no advertising.
            Nothing you do is sent to a server.
          </p>
        </article>
        <article className="about-card">
          <WifiOff size={20} aria-hidden="true" />
          <h2>Works offline</h2>
          <p>
            After your first visit, the app shell is cached so lessons and
            practice keep working without a connection.
          </p>
        </article>
        <article className="about-card">
          <Heart size={20} aria-hidden="true" />
          <h2>Calm by design</h2>
          <p>
            No timers, no autoplay audio, and no streak pressure. Audio only
            plays when you press a button.
          </p>
        </article>
      </section>

      <section className="about-prose" aria-labelledby="privacy-title">
        <h2 id="privacy-title">Where your data lives</h2>
        <p>
          All of your progress, bookmarks, settings, and saved Song Lab sketches
          are stored only in your browser&apos;s local storage under the key{" "}
          <code>{PROGRESS_STORAGE_KEY}</code>. It never leaves your device.
        </p>
        <p>
          Clearing your browser storage, using private browsing, or switching
          browsers or devices will not carry your progress over. You can move it
          yourself: export and import the full progress file from the{" "}
          <Link to="/progress/export">progress export page</Link>.
        </p>

        <h2>Audio and microphone</h2>
        <p>
          Chords Lab generates short sounds with the Web Audio API after you
          press play. It does not request microphone access and does no
          recording or pitch listening.
        </p>

        <h2>Credits</h2>
        <p>
          Built with React, Vite, Tonal for the theory engine, VexFlow for
          notation, and Tone.js for audio. Lesson content is original; see the{" "}
          <Link to="/sources">sources page</Link> for references and use notes.
        </p>

        <div className="about-actions">
          <Link className="button" to="/progress/export">
            <Download size={17} aria-hidden="true" />
            Export or import progress
          </Link>
          <Link className="button button--quiet" to="/sources">
            View sources
          </Link>
        </div>
      </section>
    </div>
  );
}
