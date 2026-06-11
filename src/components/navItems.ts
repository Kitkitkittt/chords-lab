import {
  BookOpen,
  BookOpenCheck,
  CircleHelp,
  ClipboardList,
  Compass,
  Dumbbell,
  Ear,
  GitBranch,
  Guitar,
  GraduationCap,
  Info,
  Library,
  ListChecks,
  type LucideIcon,
  Music2,
  Music3,
  RotateCcw,
  Sparkles,
  Waypoints
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
  { to: "/play", label: "Play", icon: Sparkles },
  { to: "/practice", label: "Practice", icon: Dumbbell }
];

/** Secondary destinations, grouped, shown in the "More" menu. */
export const moreNavGroups: NavGroup[] = [
  {
    heading: "Practice & play",
    items: [
      { to: "/practice/smart", label: "Smart session", icon: Sparkles },
      { to: "/practice/dictation", label: "Dictation", icon: Ear },
      { to: "/practice/sight-reading", label: "Sight-reading", icon: BookOpenCheck },
      { to: "/practice/advanced-harmony", label: "Advanced harmony", icon: Waypoints },
      { to: "/practice/counterpoint", label: "Counterpoint", icon: GitBranch },
      { to: "/review", label: "Review", icon: RotateCcw },
      { to: "/routines", label: "Routines", icon: ListChecks },
      { to: "/tools/circle", label: "Tools", icon: Compass },
      { to: "/instruments", label: "Instruments", icon: Guitar },
      { to: "/lab/song", label: "Song Lab", icon: Music3 },
      { to: "/lab/arrange", label: "Arranger", icon: Music3 },
      { to: "/lab/repertoire", label: "Repertoire", icon: Library }
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
