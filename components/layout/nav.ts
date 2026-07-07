import { Waypoints, Sunrise, NotebookText, Activity, type LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const NAV: NavItem[] = [
  { href: "/app/map", label: "Map", icon: Waypoints },
  { href: "/app/today", label: "Today", icon: Sunrise },
  { href: "/app/notebook", label: "Notebook", icon: NotebookText },
  { href: "/app/review", label: "Review", icon: Activity },
];
