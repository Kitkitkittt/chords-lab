import { CircleHelp, Music2 } from "lucide-react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { lessons } from "../data/course";
import { useProgress } from "../state/progress";
import type { AppMode } from "../types/course";
import { MoreMenu } from "./MoreMenu";
import { moreNavItems, primaryNavItems } from "./navItems";
import { ProgressBar } from "./ProgressBar";
import { WelcomeTour } from "./WelcomeTour";

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
            <small>Music theory</small>
          </span>
        </NavLink>
        <nav className="primary-nav" aria-label="Primary navigation">
          {primaryNavItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
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
          <MoreMenu />
        </nav>
      </header>

      <main id="main-content" className="app-main">
        <Outlet />
      </main>

      <nav className="bottom-nav" aria-label="Primary navigation (mobile)">
        {primaryNavItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                isActive ? "bottom-nav__link is-active" : "bottom-nav__link"
              }
            >
              <Icon size={20} aria-hidden="true" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
        <MoreMenu variant="bottom" />
      </nav>

      <footer className="app-footer">
        <ProgressBar
          value={completedCount}
          max={lessons.length}
          label="Course completion"
        />
        <nav className="app-footer__links" aria-label="More pages">
          {moreNavItems.map((item) => (
            <NavLink key={item.to} to={item.to}>
              {item.label}
            </NavLink>
          ))}
        </nav>
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
