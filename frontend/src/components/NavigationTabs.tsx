import React from 'react';
import { Target, Activity, Calendar, TrendingUp, MessageSquare } from 'lucide-react';
import type { AthleteId } from '../types';

interface NavigationTabsProps {
  athlete?: AthleteId;
  hasAdaptation?: boolean;
}

export const NavigationTabs: React.FC<NavigationTabsProps> = ({
  athlete = 'louis',
  hasAdaptation = false,
}) => {
  const isDuo = athlete === 'duo';
  const isClara = athlete === 'clara';

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const items = [
    { id: 'today', label: "Aujourd'hui", icon: Target },
    { id: 'biometrics', label: 'Biométries', icon: Activity },
    { id: 'planning', label: isDuo ? 'Planning Duo' : 'Planning Hebdo', icon: Calendar },
    { id: 'performance', label: isDuo ? 'Objectif 10k & Sorties' : isClara ? 'Sub-50 & Sorties' : 'Sub-40 & Sorties', icon: TrendingUp },
    { id: 'coach', label: 'Coach IA', icon: MessageSquare, badge: hasAdaptation ? 'Alerte' : undefined },
  ];

  return (
    <nav className="mb-5">
      <div className="bg-[#0E1320] p-1 rounded-2xl border border-white/[0.08] shadow-sm flex items-center justify-between gap-1 overflow-x-auto no-scrollbar">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button
              type="button"
              key={item.id}
              onClick={() => scrollTo(item.id)}
              className="flex-1 min-w-[125px] sm:min-w-0 py-2 px-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/[0.05] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Icon className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
              <span className="truncate">{item.label}</span>
              {item.badge && (
                <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
