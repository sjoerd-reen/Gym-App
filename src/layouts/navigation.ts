import { Dumbbell, History, LayoutGrid, type LucideIcon } from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { to: "/dashboard", label: "Overzicht", icon: LayoutGrid },
  { to: "/workout", label: "Trainen", icon: Dumbbell },
  { to: "/history", label: "Historie", icon: History },
];
