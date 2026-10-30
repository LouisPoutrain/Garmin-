import type { ComponentType, SVGProps } from 'react';
import { Footprints, Bike, Disc, Moon, Zap } from 'lucide-react';

/**
 * Mappe un sport (string API ou libellé) vers une icône lucide-react.
 * Remplace les emojis (🏃 🚴 ⚡) utilisés comme icônes de sport.
 */
export function getSportIcon(sport?: string | null): ComponentType<SVGProps<SVGSVGElement>> {
  const s = (sport || '').toLowerCase();
  if (s.includes('run') || s.includes('course') || s.includes('trail')) return Footprints;
  if (s.includes('cycl') || s.includes('vélo') || s.includes('bike')) return Bike;
  if (s.includes('ultimate') || s.includes('frisbee') || s.includes('disc')) return Disc;
  if (s.includes('recover') || s.includes('repos') || s.includes('rest') || s.includes('récup')) return Moon;
  if (s.includes('swim') || s.includes('nata')) return Footprints;
  return Zap;
}
