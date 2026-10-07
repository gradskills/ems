// ─────────────────────────────────────────────────────────────
// In-app branding helpers — the editable "mark" (logo) + app name.
// The admin picks an icon (or uploads an image) and a name in Settings;
// these feed the sidebar, top bar and login screen via <AppLogo/>.
// ─────────────────────────────────────────────────────────────
import {
  Sparkles, Star, Zap, Rocket, Flame, Gem, Crown, Shield, Hexagon,
  Aperture, Atom, Boxes, Briefcase, Building2, CircuitBoard, Compass,
  Globe, GraduationCap, Layers, Leaf, Orbit, Sun, Target, TrendingUp,
  type LucideIcon,
} from "lucide-react";

export const APP_ICONS: Record<string, LucideIcon> = {
  Sparkles, Star, Zap, Rocket, Flame, Gem, Crown, Shield, Hexagon,
  Aperture, Atom, Boxes, Briefcase, Building2, CircuitBoard, Compass,
  Globe, GraduationCap, Layers, Leaf, Orbit, Sun, Target, TrendingUp,
};

/** Ordered list of selectable icon names for the picker. */
export const APP_ICON_NAMES = Object.keys(APP_ICONS);

export const DEFAULT_APP_ICON = "Sparkles";

/** Resolve a stored icon name to a Lucide component, with a safe fallback. */
export function appIconComponent(name?: string): LucideIcon {
  return (name && APP_ICONS[name]) || APP_ICONS[DEFAULT_APP_ICON];
}
