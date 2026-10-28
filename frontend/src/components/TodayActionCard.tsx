import React from 'react';
import { Watch, Sliders, Check } from 'lucide-react';
import type { DayPlan } from '../types';

interface TodayActionCardProps {
  todaySession: DayPlan | null;
  onScheduleWorkout: (day: DayPlan, targetAthlete?: string) => Promise<void>;
  onOpenCustomizer: (day: DayPlan) => void;
  onOpenManualModal: (day: DayPlan) => void;
}

export const TodayActionCard: React.FC<TodayActionCardProps> = ({
  todaySession,
  onScheduleWorkout,
  onOpenCustomizer,
  onOpenManualModal,
}) => {
  if (!todaySession) return null;

  const isDuoCard = Boolean(todaySession.louis && todaySession.clara);
  const isRunning = todaySession.sport === 'running';
  const isUltimate = todaySession.sport === 'ultimate';
  const isRest = todaySession.sport === 'recovery' || (todaySession.type?.toLowerCase().includes('repos') ?? false);
  const isScheduled = !!todaySession.garmin_scheduled;
  const isCompleted = todaySession.status === 'completed' || todaySession.status === 'completed_manual';

  // Helper for single athlete ghost / border actions
  const renderDiscreetActions = (day: DayPlan, athleteKey: 'louis' | 'clara') => {
    const isRun = day.sport === 'running';
    const isUlt = day.sport === 'ultimate';
    const isDone = day.status === 'completed' || day.status === 'completed_manual';
    const isSched = !!day.garmin_scheduled;
    const isOff = day.sport === 'recovery' || (day.type?.toLowerCase().includes('repos') ?? false);
    const accentBorder = athleteKey === 'louis' ? 'border-[#00E5FF]/30 text-[#00E5FF] hover:bg-[#00E5FF]/10' : 'border-[#FB7185]/30 text-[#FB7185] hover:bg-[#FB7185]/10';

    if (isDone) {
      return (
        <span className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold flex items-center gap-1.5">
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          TERMINÉ
        </span>
      );
    }

    if (isOff) {
      return (
        <span className="px-3 py-1.5 rounded-lg bg-white/[0.02] border border-white/[0.05] text-zinc-500 text-xs font-mono font-bold tracking-wider">
          REPOS ACTIF
        </span>
      );
    }

    if (isRun) {
      return isSched ? (
        <span className="px-3 py-1.5 rounded-lg bg-[#00E5FF]/10 border border-[#00E5FF]/30 text-[#00E5FF] text-xs font-mono font-bold flex items-center gap-1.5">
          <Watch className="w-3.5 h-3.5" />
          MONTRE OK
        </span>
      ) : (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onOpenCustomizer(day)}
            className="p-2 rounded-lg bg-[#04070D] border border-white/[0.06] hover:border-white/20 text-zinc-400 hover:text-white transition-colors"
            title="Ajuster allures ou intervalles"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onScheduleWorkout(day, athleteKey)}
            className={`px-3.5 py-1.5 rounded-lg bg-[#04070D] border ${accentBorder} text-xs font-mono font-semibold flex items-center gap-1.5 transition-all hover:text-white`}
          >
            <Watch className="w-3.5 h-3.5" />
            <span>Programmer</span>
          </button>
        </div>
      );
    }

    if (isUlt) {
      return (
        <button
          type="button"
          onClick={() => onOpenManualModal(day)}
          className="px-3.5 py-1.5 rounded-lg bg-[#04070D] border border-[#00E5FF]/30 hover:bg-[#00E5FF]/10 text-[#00E5FF] hover:text-white text-xs font-mono font-semibold flex items-center gap-1.5 transition-all"
        >
          <Check className="w-3.5 h-3.5" />
          <span>Valider fait</span>
        </button>
      );
    }

    return null;
  };

  return (
    <div className="bg-[#0B0F19] border border-white/[0.05] rounded-2xl p-4 sm:p-5 mb-5 relative overflow-hidden">
      {/* Telemetry Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-white/[0.05]">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#10B981] animate-pulse" />
          <span className="text-[11px] uppercase tracking-[0.2em] text-zinc-500 font-semibold font-mono">
            SÉANCE DU JOUR • LIVE TELEMETRY
          </span>
          <span className="text-[10px] font-mono text-zinc-400 px-2 py-0.5 rounded border border-white/[0.06] bg-white/[0.02]">
            {todaySession.date_formatted || todaySession.date_short || 'AUJOURD’HUI'}
          </span>
        </div>

        {todaySession.shared_notes && (
          <div className="text-xs font-mono text-amber-300/90 italic flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span>{todaySession.shared_notes}</span>
          </div>
        )}
      </div>

      {isDuoCard && todaySession.louis && todaySession.clara ? (
        /* DUEL LOUIS VS CLARA : SPLIT TELEMETRY (Facing half-screens) */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
          {/* LOUIS COLUMN */}
          <div className="p-4 rounded-xl bg-[#04070D] border-l-2 border-[#00E5FF] border-r border-t border-b border-white/[0.03] space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded border border-[#00E5FF]/30 text-[#00E5FF] bg-[#00E5FF]/10 text-[10px] font-mono font-bold tracking-[0.18em] uppercase">
                ATHLÈTE 1 • LOUIS
              </span>
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                {todaySession.louis.sport}
              </span>
            </div>

            <div>
              <div className="text-[11px] uppercase tracking-[0.2em] text-zinc-500 font-semibold font-mono">
                SÉANCE PROGRAMMÉE
              </div>
              <h4 className="text-base font-bold text-white tracking-tight mt-0.5">
                {todaySession.louis.type}
              </h4>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/[0.04]">
              <div>
                <div className="text-[11px] uppercase tracking-[0.2em] text-zinc-500 font-semibold font-mono">
                  DURÉE
                </div>
                <div className="font-mono text-2xl sm:text-3xl font-bold tracking-tight text-white mt-0.5">
                  {todaySession.louis.duration}
                </div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-[0.2em] text-zinc-500 font-semibold font-mono">
                  INTENSITÉ
                </div>
                <div className="font-mono text-sm sm:text-base font-bold text-[#00E5FF] mt-1">
                  {todaySession.louis.intensity || 'Zone 2 Aérobie'}
                </div>
              </div>
            </div>

            {todaySession.louis.focus && (
              <p className="text-xs font-mono text-zinc-400 pt-1 leading-relaxed border-t border-white/[0.03]">
                Focus : {todaySession.louis.focus}
              </p>
            )}

            <div className="pt-2 flex justify-end">
              {renderDiscreetActions(todaySession.louis, 'louis')}
            </div>
          </div>

          {/* CLARA COLUMN */}
          <div className="p-4 rounded-xl bg-[#04070D] border-l-2 border-[#FB7185] border-r border-t border-b border-white/[0.03] space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded border border-[#FB7185]/30 text-[#FB7185] bg-[#FB7185]/10 text-[10px] font-mono font-bold tracking-[0.18em] uppercase">
                ATHLÈTE 2 • CLARA
              </span>
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                {todaySession.clara.sport}
              </span>
            </div>

            <div>
              <div className="text-[11px] uppercase tracking-[0.2em] text-zinc-500 font-semibold font-mono">
                SÉANCE PROGRAMMÉE
              </div>
              <h4 className="text-base font-bold text-white tracking-tight mt-0.5">
                {todaySession.clara.type}
              </h4>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/[0.04]">
              <div>
                <div className="text-[11px] uppercase tracking-[0.2em] text-zinc-500 font-semibold font-mono">
                  DURÉE
                </div>
                <div className="font-mono text-2xl sm:text-3xl font-bold tracking-tight text-white mt-0.5">
                  {todaySession.clara.duration}
                </div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-[0.2em] text-zinc-500 font-semibold font-mono">
                  INTENSITÉ
                </div>
                <div className="font-mono text-sm sm:text-base font-bold text-[#FB7185] mt-1">
                  {todaySession.clara.intensity || 'Zone 2 Foncier'}
                </div>
              </div>
            </div>

            {todaySession.clara.focus && (
              <p className="text-xs font-mono text-zinc-400 pt-1 leading-relaxed border-t border-white/[0.03]">
                Focus : {todaySession.clara.focus}
              </p>
            )}

            <div className="pt-2 flex justify-end">
              {renderDiscreetActions(todaySession.clara, 'clara')}
            </div>
          </div>
        </div>
      ) : (
        /* SINGLE ATHLETE MODE */
        <div className="pt-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded border border-[#00E5FF]/30 text-[#00E5FF] bg-[#00E5FF]/10 text-[10px] font-mono font-bold tracking-[0.18em] uppercase">
                {todaySession.day_name || todaySession.day}
              </span>
              {todaySession.is_key && (
                <span className="px-2 py-0.5 rounded border border-amber-400/30 text-amber-300 bg-amber-400/10 text-[10px] font-mono font-bold tracking-[0.18em] uppercase">
                  SÉANCE CLÉ
                </span>
              )}
            </div>

            <div>
              <div className="text-[11px] uppercase tracking-[0.2em] text-zinc-500 font-semibold font-mono">
                SÉANCE DU JOUR
              </div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                {todaySession.type}
              </h3>
            </div>

            {todaySession.focus && (
              <p className="text-xs font-mono text-zinc-400 max-w-xl">
                {todaySession.focus}
              </p>
            )}
          </div>

          <div className="flex items-center gap-4 self-end md:self-center font-mono">
            <div className="text-right px-3.5 py-2 rounded-xl bg-[#04070D] border border-white/[0.05]">
              <div className="text-[11px] uppercase tracking-[0.2em] text-zinc-500 font-semibold">
                DURÉE
              </div>
              <div className="font-mono text-2xl font-bold text-white">
                {todaySession.duration}
              </div>
            </div>

            {isRunning && !isCompleted && (
              isScheduled ? (
                <div className="px-3.5 py-2 rounded-lg bg-[#00E5FF]/10 border border-[#00E5FF]/30 text-[#00E5FF] text-xs font-mono font-bold flex items-center gap-2">
                  <Watch className="w-4 h-4" />
                  <span>Prêt sur votre montre Garmin</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenCustomizer(todaySession)}
                    className="p-2.5 rounded-lg bg-[#04070D] border border-white/[0.06] hover:border-white/20 text-zinc-400 hover:text-white transition-colors"
                    title="Personnaliser répétitions et allures"
                  >
                    <Sliders className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onScheduleWorkout(todaySession)}
                    className="px-4 py-2 rounded-lg bg-[#04070D] border border-[#00E5FF]/30 hover:bg-[#00E5FF]/10 text-[#00E5FF] hover:text-white text-xs font-mono font-semibold flex items-center gap-1.5 transition-all shadow-[0_0_12px_rgba(0,229,255,0.1)]"
                  >
                    <Watch className="w-4 h-4" />
                    <span>Programmer sur Garmin</span>
                  </button>
                </div>
              )
            )}

            {isUltimate && !isCompleted && (
              <button
                type="button"
                onClick={() => onOpenManualModal(todaySession)}
                className="px-4 py-2 rounded-lg bg-[#04070D] border border-[#00E5FF]/30 hover:bg-[#00E5FF]/10 text-[#00E5FF] hover:text-white text-xs font-mono font-semibold flex items-center gap-1.5 transition-all"
              >
                <Check className="w-4 h-4" />
                <span>Valider fait</span>
              </button>
            )}

            {isCompleted && (
              <div className="px-3.5 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold flex items-center gap-1.5">
                <Check className="w-4 h-4" />
                <span>TERMINÉ</span>
              </div>
            )}

            {isRest && (
              <div className="px-3.5 py-2 rounded-lg bg-white/[0.02] border border-white/[0.05] text-zinc-500 text-xs font-mono font-bold">
                REPOS & RÉCUPÉRATION
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TodayActionCard;
