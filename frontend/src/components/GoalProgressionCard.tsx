import React from 'react';
import { Target, Flag, Trophy, TrendingUp, ArrowRight } from 'lucide-react';
import type { GoalProgression } from '../types';
import { Skeleton } from './Skeleton';

interface GoalProgressionCardProps {
  progression: GoalProgression | null;
  loading: boolean;
  onSelectActivity?: (activityId: number | string) => void;
}

export const GoalProgressionCard: React.FC<GoalProgressionCardProps> = ({
  progression,
  loading,
  onSelectActivity,
}) => {
  if (loading && !progression) {
    return <Skeleton className="h-44 rounded-2xl mb-4" />;
  }

  const prog = progression || {
    goal_title: 'Passer sous les 40 min au 10 km',
    target_deadline: '6 mois (18 Avril 2027)',
    target_time: '39:59',
    target_pace: '3:59 min/km',
    current_pr: '43:34 (Chinon)',
    current_pace: '4:21 min/km',
    delta_seconds: 215,
    delta_text: "-3'35\" (-21s/km)",
    progress_percent: 82,
    weekly_hybrid: '3 séances Ultimate + 2 séances Running clés',
    next_milestone: 'Palier 1 : 41:59 (4:12 min/km)',
  };

  return (
    <div className="bg-[#0B0F19] border border-white/[0.05] rounded-2xl p-4 sm:p-5 mb-4 relative overflow-hidden">
      {/* Telemetry Header */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-white/[0.05]">
        <div className="flex items-center gap-2">
          <span className="text-[11px] uppercase tracking-[0.2em] text-zinc-500 font-semibold font-mono flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-[#00E5FF]" />
            TÉLÉMÉTRIE D'OBJECTIF • 10 KM SUB-40
          </span>
          <span className="text-[9px] font-mono uppercase tracking-[0.18em] px-2 py-0.5 rounded border border-white/[0.06] bg-white/[0.02] text-zinc-400">
            J-171
          </span>
        </div>
        <div className="text-[11px] font-mono text-zinc-500">
          ÉCHÉANCE : <span className="text-zinc-300 font-bold">{prog.target_deadline}</span>
        </div>
      </div>

      {/* Dual Metrics Telemetry Box */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-3">
        {/* Current PR Box */}
        <div
          onClick={() => onSelectActivity?.(22496284245)}
          className="p-3.5 rounded-xl bg-[#04070D] border-l-2 border-[#00E5FF] border-r border-t border-b border-white/[0.03] cursor-pointer hover:bg-white/[0.02] transition-colors group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-[0.2em] text-zinc-500 font-semibold font-mono flex items-center gap-1">
              <Trophy className="w-3.5 h-3.5 text-[#00E5FF]" />
              RECORD OFFICIEL (PR)
            </span>
            <span className="text-[10px] font-mono text-[#00E5FF] flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
              Splits Chinon <ArrowRight className="w-3 h-3" />
            </span>
          </div>

          <div className="flex items-baseline gap-2 mt-1">
            <span className="font-mono text-3xl sm:text-4xl tracking-tight text-white font-bold">
              43:34
            </span>
            <span className="text-xs font-mono text-zinc-500 uppercase">
              4:21 MIN/KM
            </span>
          </div>

          <div className="text-[11px] font-mono text-zinc-500 mt-1">
            10.03 km • 12 Avril 2026 à Chinon
          </div>
        </div>

        {/* Target Box */}
        <div className="p-3.5 rounded-xl bg-[#04070D] border-l-2 border-[#FB7185] border-r border-t border-b border-white/[0.03]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-[0.2em] text-zinc-500 font-semibold font-mono flex items-center gap-1">
              <Flag className="w-3.5 h-3.5 text-[#FB7185]" />
              CIBLE CHRONOMÉTRIQUE
            </span>
            <span className="px-2 py-0.5 rounded border border-[#FB7185]/30 text-[#FB7185] bg-[#FB7185]/10 text-[9px] font-mono font-bold tracking-[0.18em]">
              OBJECTIF
            </span>
          </div>

          <div className="flex items-baseline gap-2 mt-1">
            <span className="font-mono text-3xl sm:text-4xl tracking-tight text-white font-bold">
              39:59
            </span>
            <span className="text-xs font-mono text-zinc-500 uppercase">
              3:59 MIN/KM
            </span>
          </div>

          <div className="text-[11px] font-mono text-emerald-400 mt-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            <span>Delta : {prog.delta_text}</span>
          </div>
        </div>
      </div>

      {/* Progress Track */}
      <div className="pt-2">
        <div className="flex justify-between text-[11px] font-mono text-zinc-500 pb-1">
          <span>PROGRESSION GLOBALE DU PLAN</span>
          <span className="text-white font-bold">{prog.progress_percent}%</span>
        </div>
        <div className="h-1.5 w-full bg-white/[0.04] rounded-full overflow-hidden">
          <div
            style={{ width: `${prog.progress_percent}%` }}
            className="h-full rounded-full bg-gradient-to-r from-[#00E5FF] to-[#FB7185]"
          />
        </div>
      </div>
    </div>
  );
};

export default GoalProgressionCard;
