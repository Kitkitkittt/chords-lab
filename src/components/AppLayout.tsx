import {
  BookOpen,
  CircleHelp,
  ClipboardList,
  Compass,
  Dumbbell,
  Guitar,
  GraduationCap,
  Info,
  Library,
  Music2,
  Music3,
  RotateCcw
} from "lucide-react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { lessons } from "../data/course";
import { useProgress } from "../state/progress";
import type { AppMode } from "../types/course";
import { ProgressBar } from "./ProgressBar";
import { WelcomeTour } from "./WelcomeTour";

const navItems = [
  { to: "/", label: "Home", icon: Music2 },
  { to: "/learn", label: "Learn", icon: GraduationCap },
  { to: "/practice", label: "Practice", icon: Dumbbell },
  { to: "/instruments", label: "Instruments", icon: Guitar },
  { to: "/review", label: "Review", icon: RotateCcw },
  { to: "/lab/song", label: "Song Lab", icon: Music3 },
  { to: "/tools/circle", label: "Tools", icon: Compass },
  { to: "/glossary", label: "Glossary", icon: BookOpen },
  { to: "/sources", label: "Sources", icon: Library },
  { to: "/about", label: "About", icon: Info },
  { to: "/progress", label: "Progress", icon: CircleHelp },
  { to: "/plan", label: "Plan", icon: ClipboardList }
];

function appModeForPath(pathname: string): AppMode {
  if (pathname.startsWith("/learn/")) {
    return "learning";
  }

  if (pathname.startsWith("/practice")) {
    return "drilling";
  }

  if (pathname.startsWith("/review")) {
    return "reviewing";
  }

  if (pathname.startsWith("/lab/song")) {
    return "experimenting";
  }

  if (pathname.startsWith("/instruments")) {
    return "instrumenting";
  }

  return "idle";
}

export function AppLayout() {
  const { completedCount } = useProgress();
  const location = useLocation();
  const appMode = appModeForPath(location.pathname);

  return (
    <div className="app-shell" data-app-mode={appMode}>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="app-header">
        <NavLink to="/" className="brand-mark" aria-label="Chords Lab home">
          <span className="brand-mark__icon" aria-hidden="true">
            <Music2 size={22} />
          </span>
          <span>
            <strong>Chords Lab</strong>
            <small>Reference course</small>
          </span>
        </NavLink>
        <nav className="primary-nav" aria-label="Primary navigation">
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                aria-label={item.label}
                title={item.label}
                className={({ isActive }) =>
                  isActive ? "primary-nav__link is-active" : "primary-nav__link"
                }
              >
                <Icon size={18} aria-hidden="true" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </header>
      <main id="main-content" className="app-main">
        <Outlet />
      </main>
      <footer className="app-footer">
        <ProgressBar
          value={completedCount}
          max={lessons.length}
          label="Course completion"
        />
        <p>
          <CircleHelp size={16} aria-hidden="true" />
          Original lesson text with source citations. Progress stays on this
          device.
        </p>
      </footer>
      <WelcomeTour />
    </div>
  );
}
