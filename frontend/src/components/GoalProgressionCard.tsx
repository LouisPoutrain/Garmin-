import React from 'react';
import { motion } from 'motion/react';
import { Target, Flag, Trophy, TrendingUp, Sparkles } from 'lucide-react';
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
    return <Skeleton className="h-48 rounded-2xl mb-4" />;
  }

  const prog = progression || {
    goal_title: 'Passer sous les 40 min au 10 km',
    target_deadline: '6 mois (Avril 2027)',
    target_time: '39:59',
    target_pace: '3:59 min/km (15.0 km/h)',
    current_pr: '43:34 (Chinon)',
    current_pace: '4:21 min/km',
    delta_seconds: 215,
    delta_text: '-3 min 35 s (-21 s / km)',
    progress_percent: 80,
    weekly_hybrid: '3 séances Ultimate + 2 séances Running clés',
    next_milestone: 'Palier 1 : 41:59 (4:12 min/km)',
  };

  return (
    <div className="bg-[#0E1320] p-4 rounded-2xl mb-4 relative border border-white/[0.08] shadow-sm">

      {/* Card Header */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#FF5E36] to-[#E11D48] flex items-center justify-center text-white font-black shadow-md shadow-[#FF5E36]/20">
            <Target className="w-4 h-4 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-white tracking-tight">
                {prog.goal_title}
              </h3>
              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-[#FF5E36]/15 text-[#FF7854] border border-[#FF5E36]/30">
                Objectif Clé
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Échéance : <span className="text-slate-200 font-semibold">{prog.target_deadline}</span> • Allure : <span className="text-[#FF7854] font-semibold">{prog.target_pace}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Chrono Comparison Dual Pill */}
      <div className="grid grid-cols-2 gap-2.5 my-3 p-2.5 rounded-xl bg-slate-950/70 border border-white/5">
        <div
          onClick={() => {
            if (prog.current_pr.includes('Chinon')) {
              onSelectActivity?.(22496284245);
            }
          }}
          className={`flex flex-col p-1.5 -m-1.5 rounded-lg transition-colors group ${
            prog.current_pr.includes('Chinon') ? 'cursor-pointer hover:bg-cyan-500/10' : ''
          }`}
          title={prog.current_pr.includes('Chinon') ? "Cliquer pour afficher les splits et le cardio complets de ce record" : undefined}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-cyan-400 flex items-center gap-1">
              <Trophy className="w-3 h-3 text-cyan-400" /> Record Actuel (PR)
            </span>
            {prog.current_pr.includes('Chinon') && (
              <span className="text-[9px] text-cyan-400/80 group-hover:text-cyan-300 font-bold flex items-center gap-0.5">
                Splits →
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-xl font-black font-mono text-cyan-300 tracking-tight group-hover:scale-105 transition-transform">
              {prog.current_pr.split(' ')[0]}
            </span>
            <span className="text-[11px] font-mono text-cyan-400/90 font-bold">
              {prog.current_pace}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 truncate">
            {prog.current_pr.includes('Chinon') ? 'Chinon (12/04/2026)' : 'Objectif en cours'}
          </span>
        </div>

        <div className="flex flex-col border-l border-white/10 pl-3">
          <span className="text-[10px] uppercase font-bold tracking-wider text-[#FF7854] flex items-center gap-1">
            <Flag className="w-3 h-3 text-[#FF5E36]" /> Cible Chrono
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-xl font-black font-mono text-orange-300 tracking-tight">
              {prog.target_time}
            </span>
            <span className="text-[11px] font-mono text-orange-400/90 font-bold">
              {prog.target_pace}
            </span>
          </div>
          <span className="text-[10px] text-amber-300 font-bold flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            {prog.delta_text}
          </span>
        </div>
      </div>

      {/* Visual Progression Timeline */}
      <div className="space-y-1.5 mt-3">
        <div className="flex justify-between text-[10px] font-mono font-bold text-slate-400">
          <span>Départ</span>
          <span className="text-cyan-400">Actuel ({prog.current_pace})</span>
          <span className="text-[#FF7854]">Cible ({prog.target_pace})</span>
        </div>
        <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden p-[2px] border border-white/10">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${prog.progress_percent}%` }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-indigo-500 to-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.5)]"
          />
        </div>
        <div className="flex items-center justify-between text-[11px] pt-1">
          <span className="text-slate-300 text-[10.5px]">
            Progression : <strong className="text-white font-mono font-bold">{prog.progress_percent}%</strong>
          </span>
          <span className="text-amber-300 text-[10.5px] font-bold flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-400" />
            {prog.next_milestone}
          </span>
        </div>
      </div>
    </div>
  );
};
