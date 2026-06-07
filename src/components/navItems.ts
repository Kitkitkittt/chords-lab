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
  type LucideIcon,
  Music2,
  Music3,
  RotateCcw
} from "lucide-react";

export type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Matched by NavLink `end` (exact) for the home route. */
  end?: boolean;
};

export type NavGroup = {
  heading: string;
  items: NavItem[];
};

/** Always-visible primary destinations (top bar + mobile bottom bar). */
export const primaryNavItems: NavItem[] = [
  { to: "/", label: "Home", icon: Music2, end: true },
  { to: "/learn", label: "Learn", icon: GraduationCap },
  { to: "/practice", label: "Practice", icon: Dumbbell },
  { to: "/tools/circle", label: "Tools", icon: Compass }
];

/** Secondary destinations, grouped, shown in the "More" menu. */
export const moreNavGroups: NavGroup[] = [
  {
    heading: "Practice & play",
    items: [
      { to: "/review", label: "Review", icon: RotateCcw },
      { to: "/instruments", label: "Instruments", icon: Guitar },
      { to: "/lab/song", label: "Song Lab", icon: Music3 }
    ]
  },
  {
    heading: "Reference",
    items: [
      { to: "/glossary", label: "Glossary", icon: BookOpen },
      { to: "/sources", label: "Sources", icon: Library }
    ]
  },
  {
    heading: "Your data & info",
    items: [
      { to: "/progress", label: "Progress", icon: CircleHelp },
      { to: "/about", label: "About", icon: Info },
      { to: "/plan", label: "Plan", icon: ClipboardList }
    ]
  }
];

/** Flat list of all secondary items (e.g. for footer quick-links). */
export const moreNavItems: NavItem[] = moreNavGroups.flatMap(
  (group) => group.items
);

/** Routes that should mark the "More" entry active. */
export const moreNavPaths: string[] = moreNavItems.map((item) => item.to);
