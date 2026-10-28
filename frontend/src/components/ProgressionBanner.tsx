import React from 'react';
import { Target, Timer, Trophy, ArrowRight } from 'lucide-react';
import type { GoalProgression, Scorecard } from '../types';

interface ProgressionBannerProps {
  progression: GoalProgression | null;
  scorecard?: Scorecard;
  louisScorecard?: Scorecard;
  claraScorecard?: Scorecard;
  onSelectActivity?: (activityId: number | string) => void;
}

export const ProgressionBanner: React.FC<ProgressionBannerProps> = ({
  progression,
  scorecard,
  louisScorecard,
  claraScorecard,
  onSelectActivity,
}) => {
  const percent = progression?.progress_percent ?? 80;
  const completed = scorecard?.completed_sessions ?? 5;
  const total = scorecard?.total_planned_sessions ?? 6;

  return (
    <div className="bg-[#0B0F19] border border-white/[0.05] rounded-2xl p-4 sm:p-5 mb-5 relative overflow-hidden">
      {/* Top Telemetry Header : Countdown & Cycle Metric */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.05]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] uppercase tracking-[0.2em] text-zinc-500 font-semibold font-mono flex items-center gap-1.5">
              <Timer className="w-3.5 h-3.5 text-amber-400" />
              CYCLE DE PRÉPARATION 10 KM • DUEL EN DIRECT
            </span>
            <span className="text-[9px] font-mono uppercase tracking-[0.18em] px-2 py-0.5 rounded border border-white/[0.06] bg-white/[0.02] text-zinc-400">
              ÉCHÉANCE 18 AVRIL 2027
            </span>
          </div>
          <div className="flex items-baseline gap-3 mt-1">
            <span className="font-mono text-3xl sm:text-4xl tracking-tight text-white font-bold">
              J-171
            </span>
            <span className="text-xs font-mono text-zinc-400">
              24 semaines d'entraînement polarisé 80/20
            </span>
          </div>
        </div>

        {/* Global Strain & Completion */}
        <div className="flex items-center gap-4 sm:gap-6 self-start sm:self-auto font-mono">
          <div className="px-3.5 py-2 rounded-xl bg-[#04070D] border border-white/[0.05]">
            <div className="text-[11px] uppercase tracking-[0.2em] text-zinc-500 font-semibold">
              CHARGE SEMAINE
            </div>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="font-mono text-2xl font-bold text-white">
                {completed}
              </span>
              <span className="text-xs text-zinc-500 font-mono">/ {total} SÉANCES</span>
            </div>
          </div>

          <div className="px-3.5 py-2 rounded-xl bg-[#04070D] border border-white/[0.05]">
            <div className="text-[11px] uppercase tracking-[0.2em] text-zinc-500 font-semibold">
              CYCLE GLOBAL
            </div>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="font-mono text-2xl font-bold text-emerald-400">
                {percent}%
              </span>
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">PHASE 2</span>
            </div>
          </div>
        </div>
      </div>

      {/* DUEL LOUIS VS CLARA : SPLIT TELEMETRY (Pit Wall Dual Columns) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 pt-4">
        {/* PILOTE A : LOUIS POUTRAIN */}
        <div className="p-4 rounded-xl bg-[#04070D] border-l-2 border-[#00E5FF] border-r border-t border-b border-white/[0.03] space-y-3 relative group">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded border border-[#00E5FF]/30 text-[#00E5FF] bg-[#00E5FF]/10 text-[10px] font-mono font-bold tracking-[0.18em] uppercase">
                ATHLÈTE 1 • LOUIS
              </span>
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                CLUB ULTIMATE
              </span>
            </div>
            <button
              type="button"
              onClick={() => onSelectActivity?.(22496284245)}
              className="text-[10px] font-mono text-[#00E5FF] hover:text-white flex items-center gap-1 transition-colors group-hover:translate-x-0.5 transition-transform"
              title="Voir les splits officiels du Record 10 km de Chinon"
            >
              <span>SPLITS PR (CHINON)</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div>
            <div className="text-[11px] uppercase tracking-[0.2em] text-zinc-500 font-semibold">
              ALLURE CIBLE SUB-40
            </div>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="font-mono text-3xl sm:text-4xl tracking-tight text-white font-bold">
                3:59
              </span>
              <span className="text-xs font-mono text-zinc-500 uppercase tracking-wider">
                MIN/KM (15.0 KM/H)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/[0.04] font-mono text-xs">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-zinc-500">Record Actuel</div>
              <div className="text-zinc-200 font-bold mt-0.5">43:34 (4:21/km)</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-zinc-500">Delta Requis</div>
              <div className="text-[#00E5FF] font-bold mt-0.5">-3'35" (-21s/km)</div>
            </div>
          </div>

          {/* Sub-bar segment LED */}
          <div className="pt-1">
            <div className="flex justify-between text-[10px] font-mono text-zinc-500 pb-1">
              <span>PROGRESSION SUB-40</span>
              <span className="text-white font-bold">{louisScorecard ? `${louisScorecard.completion_rate_percent}%` : '82%'}</span>
            </div>
            <div className="h-1.5 w-full bg-white/[0.04] rounded-full overflow-hidden">
              <div
                style={{ width: `${louisScorecard ? louisScorecard.completion_rate_percent : 82}%` }}
                className="h-full rounded-full bg-[#00E5FF] shadow-[0_0_8px_rgba(0,229,255,0.4)]"
              />
            </div>
          </div>
        </div>

        {/* PILOTE B : CLARA */}
        <div className="p-4 rounded-xl bg-[#04070D] border-l-2 border-[#FB7185] border-r border-t border-b border-white/[0.03] space-y-3 relative group">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded border border-[#FB7185]/30 text-[#FB7185] bg-[#FB7185]/10 text-[10px] font-mono font-bold tracking-[0.18em] uppercase">
                ATHLÈTE 2 • CLARA
              </span>
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                4 RUNS/SEM
              </span>
            </div>
            <span className="text-[10px] font-mono text-[#FB7185] flex items-center gap-1">
              <Trophy className="w-3 h-3" />
              <span>OBJECTIF MAJEUR</span>
            </span>
          </div>

          <div>
            <div className="text-[11px] uppercase tracking-[0.2em] text-zinc-500 font-semibold">
              ALLURE CIBLE SUB-50
            </div>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="font-mono text-3xl sm:text-4xl tracking-tight text-white font-bold">
                4:59
              </span>
              <span className="text-xs font-mono text-zinc-500 uppercase tracking-wider">
                MIN/KM (12.0 KM/H)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/[0.04] font-mono text-xs">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-zinc-500">Record Actuel</div>
              <div className="text-zinc-200 font-bold mt-0.5">53:40 (5:22/km)</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-zinc-500">Delta Requis</div>
              <div className="text-[#FB7185] font-bold mt-0.5">-3'41" (-23s/km)</div>
            </div>
          </div>

          {/* Sub-bar segment LED */}
          <div className="pt-1">
            <div className="flex justify-between text-[10px] font-mono text-zinc-500 pb-1">
              <span>PROGRESSION SUB-50</span>
              <span className="text-white font-bold">{claraScorecard ? `${claraScorecard.completion_rate_percent}%` : '78%'}</span>
            </div>
            <div className="h-1.5 w-full bg-white/[0.04] rounded-full overflow-hidden">
              <div
                style={{ width: `${claraScorecard ? claraScorecard.completion_rate_percent : 78}%` }}
                className="h-full rounded-full bg-[#FB7185] shadow-[0_0_8px_rgba(251,113,133,0.4)]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Ultra-thin Whoop 2px Progress Line */}
      <div className="mt-4 pt-3 border-t border-white/[0.04] flex items-center justify-between text-[11px] font-mono text-zinc-500">
        <span className="flex items-center gap-1.5">
          <Target className="w-3.5 h-3.5 text-zinc-400" />
          <span>PHASE ACTUELLE : REPRISE FONDAMENTALE Z2 & HABITUATION TENDINEUSE</span>
        </span>
        <span className="text-zinc-400 hidden sm:inline">PROCHAIN PALIER : CYCLE SEMAINE 2 FRACTIONNÉ</span>
      </div>
    </div>
  );
};

export default ProgressionBanner;
