import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Compass, Dumbbell, GraduationCap, Music3, X } from "lucide-react";

/**
 * First-run welcome tour. A calm, dismissible overlay shown once per browser.
 * It uses its own localStorage key (not the progress store), so it never
 * affects learner progress data and respects the no-pressure design.
 */
export const TOUR_STORAGE_KEY = "chordslab.tour.v1";

const STEPS = [
  {
    icon: GraduationCap,
    title: "Learn at your pace",
    body: "Short lessons with audio, notation, and quick checks. Nothing is timed or locked."
  },
  {
    icon: Dumbbell,
    title: "Practice and review",
    body: "Generated drills adapt to you. Missed prompts come back until they stick."
  },
  {
    icon: Compass,
    title: "Explore the tools",
    body: "A circle of fifths and a chord progression playground, derived for any key."
  },
  {
    icon: Music3,
    title: "Build in the Song Lab",
    body: "Sketch eight-bar loops with chords, bass, and melody. Everything stays on your device."
  }
];

function hasSeenTour(): boolean {
  try {
    return window.localStorage.getItem(TOUR_STORAGE_KEY) === "seen";
  } catch {
    return true; // If storage is unavailable, do not nag.
  }
}

function markTourSeen() {
  try {
    window.localStorage.setItem(TOUR_STORAGE_KEY, "seen");
  } catch {
    // Ignore storage errors; the tour simply may reappear.
  }
}

export function WelcomeTour() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!hasSeenTour()) {
      setOpen(true);
    }
  }, []);

  function dismiss() {
    markTourSeen();
    setOpen(false);
  }

  if (!open) {
    return null;
  }

  return (
    <div
      className="welcome-tour"
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-tour-title"
    >
      <div className="welcome-tour__card">
        <button
          className="welcome-tour__close"
          type="button"
          onClick={dismiss}
          aria-label="Close welcome"
        >
          <X size={18} aria-hidden="true" />
        </button>
        <span className="eyebrow">Welcome</span>
        <h2 id="welcome-tour-title">A calm way to learn music theory</h2>
        <p>
          Chords Lab is local-first: no accounts, no tracking, works offline.
          Here is what you can do.
        </p>
        <ul className="welcome-tour__steps">
          {STEPS.map((step) => {
            const Icon = step.icon;

            return (
              <li key={step.title}>
                <Icon size={20} aria-hidden="true" />
                <div>
                  <strong>{step.title}</strong>
                  <span>{step.body}</span>
                </div>
              </li>
            );
          })}
        </ul>
        <div className="welcome-tour__actions">
          <button className="button" type="button" onClick={dismiss}>
            Start learning
          </button>
          <Link className="button button--quiet" to="/about" onClick={dismiss}>
            How it works
          </Link>
        </div>
      </div>
    </div>
  );
}
