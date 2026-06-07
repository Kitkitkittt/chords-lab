import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { moreNavGroups, moreNavPaths } from "./navItems";

/**
 * Accessible "More" disclosure for secondary navigation. Renders as a popover on
 * desktop and a bottom sheet on mobile (CSS-driven). Closes on outside click,
 * Escape, and route change.
 */
type MoreMenuProps = {
  /** Distinguishes the desktop vs mobile instance for unique element ids. */
  variant?: "top" | "bottom";
};

export function MoreMenu({ variant = "top" }: MoreMenuProps) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelId = `more-menu-panel-${variant}`;

  const isActive = moreNavPaths.some((path) =>
    path === "/" ? false : location.pathname.startsWith(path)
  );

  // Close when the route changes.
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  // Close on Escape and outside click while open.
  useEffect(() => {
    if (!open) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }

    function onPointerDown(event: PointerEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  return (
    <div className={`more-menu more-menu--${variant}`} ref={containerRef}>
      <button
        ref={buttonRef}
        type="button"
        className={
          isActive
            ? "primary-nav__link more-menu__button is-active"
            : "primary-nav__link more-menu__button"
        }
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
      >
        <Menu size={18} aria-hidden="true" />
        <span>More</span>
      </button>

      {open ? (
        <>
          <div className="more-menu__scrim" aria-hidden="true" />
          <div
            id={panelId}
            className="more-menu__panel"
            role="menu"
            aria-label="More navigation"
          >
            <div className="more-menu__panel-header">
              <strong>More</strong>
              <button
                type="button"
                className="more-menu__close"
                aria-label="Close menu"
                onClick={() => {
                  setOpen(false);
                  buttonRef.current?.focus();
                }}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            {moreNavGroups.map((group) => (
              <div className="more-menu__group" key={group.heading}>
                <p className="more-menu__group-heading">{group.heading}</p>
                {group.items.map((item) => {
                  const Icon = item.icon;

                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      role="menuitem"
                      className={({ isActive: linkActive }) =>
                        linkActive
                          ? "more-menu__item is-active"
                          : "more-menu__item"
                      }
                    >
                      <Icon size={18} aria-hidden="true" />
                      <span>{item.label}</span>
                    </NavLink>
                  );
                })}
              </div>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
