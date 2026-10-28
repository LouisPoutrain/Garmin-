import React from 'react';
import { Target, Calendar, Flame, Trophy } from 'lucide-react';
import type { GoalProgression, Scorecard } from '../types';

interface ProgressionBannerProps {
  progression: GoalProgression | null;
  scorecard?: Scorecard;
  louisScorecard?: Scorecard;
  claraScorecard?: Scorecard;
}

export const ProgressionBanner: React.FC<ProgressionBannerProps> = ({
  progression,
  scorecard,
  louisScorecard,
  claraScorecard,
}) => {
  const percent = progression?.progress_percent ?? 80;
  const completed = scorecard?.completed_sessions ?? 0;
  const total = scorecard?.total_planned_sessions ?? 6;

  return (
    <div className="matte-card rounded-2xl p-4 sm:p-5 mb-5 text-slate-200">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-[#1E2535]">
        {/* Left: Overall 10k Targets */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#1C2333] border border-[#2B354C] flex items-center justify-center text-[#E0583A] flex-shrink-0">
            <Trophy className="w-5 h-5 text-[#E0583A]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                Objectif Préparation 10 km en Duo
              </h2>
              <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md bg-[#252C3D] text-slate-300 border border-[#323B50]">
                Échéance Avril 2027
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 mt-0.5">
              <span>
                <strong className="text-[#E0583A]">Louis :</strong> Cible &lt; 40 min <span className="text-slate-500 font-mono">(3:59/km)</span>
              </span>
              <span className="text-slate-600">•</span>
              <span>
                <strong className="text-[#9D78DE]">Clara :</strong> Cible &lt; 50 min <span className="text-slate-500 font-mono">(4:59/km)</span>
              </span>
            </div>
          </div>
        </div>

        {/* Right: Weekly completion metric */}
        <div className="flex items-center gap-3 sm:gap-6 self-start md:self-auto text-xs">
          <div className="flex items-center gap-2 bg-[#171C2B] border border-[#232B3E] px-3 py-1.5 rounded-xl">
            <Flame className="w-4 h-4 text-[#D99738]" />
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400">Complétion Semaine</div>
              <div className="font-mono font-bold text-white flex items-center gap-1.5">
                <span>{completed} / {total}</span>
                {louisScorecard && claraScorecard && (
                  <span className="text-[10px] text-slate-400 font-normal">
                    (<span className="text-[#E0583A]">{louisScorecard.completed_sessions}</span>/
                    <span className="text-[#9D78DE]">{claraScorecard.completed_sessions}</span>)
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 bg-[#171C2B] border border-[#232B3E] px-3 py-1.5 rounded-xl">
            <Calendar className="w-4 h-4 text-[#4EA8DE]" />
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400">J-171</div>
              <div className="font-mono font-bold text-slate-200">18 Avril 2027</div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Track */}
      <div className="pt-3 space-y-1.5">
        <div className="flex items-center justify-between text-xs font-medium">
          <span className="text-slate-400 flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-slate-400" />
            <span>Progression du plan d'entraînement</span>
          </span>
          <span className="font-mono font-bold text-slate-200">{percent}%</span>
        </div>

        <div className="h-2 w-full bg-[#181D2A] rounded-full overflow-hidden border border-[#22293B]">
          <div
            style={{ width: `${percent}%` }}
            className="h-full rounded-full bg-[#E0583A] transition-all duration-500"
          />
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
          <span>Phase 1 : Reprise aérobie</span>
          <span className="text-slate-400">Phase 2 : Seuil & Allure Spécifique</span>
          <span>Phase 3 : Affûtage & Compétition</span>
        </div>
      </div>
    </div>
  );
};
