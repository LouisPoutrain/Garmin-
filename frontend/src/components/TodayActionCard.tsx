import React from 'react';
import { Watch, Sliders, Check, HeartHandshake } from 'lucide-react';
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

  const icon =
    todaySession.sport_icon ||
    (isUltimate ? '🥏' : isRunning ? '🏃‍♂️' : isRest ? '🧘' : '⚡');

  // Helper for single athlete action buttons
  const renderActions = (day: DayPlan, athleteKey: 'louis' | 'clara') => {
    const isRun = day.sport === 'running';
    const isUlt = day.sport === 'ultimate';
    const isDone = day.status === 'completed' || day.status === 'completed_manual';
    const isSched = !!day.garmin_scheduled;
    const isOff = day.sport === 'recovery' || (day.type?.toLowerCase().includes('repos') ?? false);

    if (isDone) {
      return (
        <span className="px-3 py-1.5 rounded-xl bg-[#10B981]/15 border border-[#10B981]/30 text-[#10B981] text-xs font-mono font-bold flex items-center gap-1.5">
          <Check className="w-3.5 h-3.5 text-[#10B981]" />
          FAIT
        </span>
      );
    }

    if (isOff) {
      return (
        <span className="px-3 py-1.5 rounded-xl bg-slate-800/80 border border-white/[0.08] text-slate-400 text-xs font-mono font-bold">
          REPOS
        </span>
      );
    }

    if (isRun) {
      return isSched ? (
        <span className="px-3 py-1.5 rounded-xl bg-[#00A7E1]/15 border border-[#00A7E1]/30 text-[#00A7E1] text-xs font-mono font-bold flex items-center gap-1.5">
          <Watch className="w-3.5 h-3.5" />
          MONTRE OK
        </span>
      ) : (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onOpenCustomizer(day)}
            className="p-2 rounded-xl bg-[#171D2A] border border-white/[0.08] hover:border-[#00A7E1]/40 text-slate-300 hover:text-[#00A7E1] transition-colors"
            title="Personnaliser les allures ou intervalles"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onScheduleWorkout(day, athleteKey)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              athleteKey === 'louis' ? 'btn-telemetry-cyan' : 'btn-telemetry-coral'
            }`}
          >
            <Watch className="w-3.5 h-3.5" />
            Programmer
          </button>
        </div>
      );
    }

    if (isUlt) {
      return (
        <button
          onClick={() => onOpenManualModal(day)}
          className="px-3 py-1.5 rounded-xl bg-[#00A7E1]/15 hover:bg-[#00A7E1]/25 border border-[#00A7E1]/30 text-[#00A7E1] text-xs font-bold transition-all flex items-center gap-1.5"
        >
          <Check className="w-3.5 h-3.5" />
          Valider fait
        </button>
      );
    }

    return null;
  };

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-[#121722] border border-[#00A7E1]/30 shadow-[0_0_25px_rgba(0,167,225,0.12)] relative text-slate-200">
      {isDuoCard && todaySession.louis && todaySession.clara ? (
        /* DUO MODE TODAY CARD */
        <div className="space-y-3.5">
          <div className="flex items-center justify-between gap-3 pb-2.5 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/40 flex items-center gap-1">
                <HeartHandshake className="w-3 h-3 text-[#F59E0B]" />
                AUJOURD'HUI EN DUO
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {todaySession.date_formatted || todaySession.date_short}
              </span>
            </div>
            {todaySession.shared_notes && (
              <span className="text-xs text-amber-200/90 font-medium italic">
                🤝 {todaySession.shared_notes}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Louis Subcard */}
            <div className="p-3.5 rounded-xl bg-[#0F141F] border border-[#00A7E1]/30 flex items-center justify-between gap-3 shadow-[0_0_15px_rgba(0,167,225,0.06)]">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-[#00A7E1]/15 border border-[#00A7E1]/30 text-[#00A7E1] flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {todaySession.louis.sport_icon || '🏃‍♂️'}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono font-bold text-[#00A7E1] uppercase tracking-wider">Louis</span>
                    <span className="text-xs font-bold text-white truncate">{todaySession.louis.type}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                    {todaySession.louis.duration} • {todaySession.louis.intensity || 'Zone 2'}
                  </div>
                </div>
              </div>
              <div className="flex-shrink-0">{renderActions(todaySession.louis, 'louis')}</div>
            </div>

            {/* Clara Subcard */}
            <div className="p-3.5 rounded-xl bg-[#0F141F] border border-[#F43F5E]/30 flex items-center justify-between gap-3 shadow-[0_0_15px_rgba(244,63,94,0.06)]">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-[#F43F5E]/15 border border-[#F43F5E]/30 text-[#F43F5E] flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {todaySession.clara.sport_icon || '🏃‍♀️'}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono font-bold text-[#F43F5E] uppercase tracking-wider">Clara</span>
                    <span className="text-xs font-bold text-white truncate">{todaySession.clara.type}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                    {todaySession.clara.duration} • {todaySession.clara.intensity || 'Zone 2'}
                  </div>
                </div>
              </div>
              <div className="flex-shrink-0">{renderActions(todaySession.clara, 'clara')}</div>
            </div>
          </div>
        </div>
      ) : (
        /* SINGLE ATHLETE TODAY CARD */
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Left: Day & Session Info */}
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#00A7E1]/20 border border-[#00A7E1]/40 text-[#00A7E1] flex items-center justify-center text-xl shadow-[0_0_15px_rgba(0,167,225,0.2)] flex-shrink-0">
              {icon}
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#00A7E1]/20 text-[#00A7E1] border border-[#00A7E1]/30">
                  AUJOURD'HUI • {todaySession.day_name || todaySession.day}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {todaySession.date_formatted || todaySession.date_short}
                </span>
                {todaySession.is_key && (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/30">
                    SÉANCE CLÉ
                  </span>
                )}
              </div>

              <h3 className="text-base sm:text-lg font-extrabold text-white">
                {todaySession.type}
              </h3>

              {todaySession.shared_notes && (
                <div className="text-xs font-medium text-amber-200/90 flex items-center gap-1.5 bg-[#F59E0B]/10 border border-[#F59E0B]/20 px-2.5 py-1 rounded-lg">
                  <span>🤝 Note Duo :</span>
                  <span>{todaySession.shared_notes}</span>
                </div>
              )}

              {todaySession.focus && (
                <p className="text-xs text-slate-300 max-w-xl">
                  {todaySession.focus}
                </p>
              )}
            </div>
          </div>

          {/* Right: Metrics & Immediate Action Button */}
          <div className="flex flex-wrap items-center gap-3 self-end lg:self-center">
            {/* Duration & Intensity badge */}
            <div className="text-right px-3 py-1.5 rounded-xl bg-[#0F141F] border border-white/[0.06]">
              <div className="text-xs font-bold text-slate-100 font-mono">
                {todaySession.duration}
              </div>
              {todaySession.intensity && (
                <div className="text-[10px] font-mono text-slate-400">
                  {todaySession.intensity}
                </div>
              )}
            </div>

            {/* Action Button */}
            {isRunning && !isCompleted && (
              <>
                {isScheduled ? (
                  <div className="px-4 py-2 rounded-xl bg-[#00A7E1]/15 border border-[#00A7E1]/30 text-[#00A7E1] text-xs font-mono font-bold flex items-center gap-2 shadow-sm">
                    <Watch className="w-4 h-4 text-[#00A7E1]" />
                    Prêt sur votre montre Garmin
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onOpenCustomizer(todaySession)}
                      className="p-2.5 rounded-xl bg-[#171D2A] border border-white/[0.08] hover:border-[#00A7E1]/40 text-slate-300 hover:text-[#00A7E1] transition-colors"
                      title="Personnaliser les répétitions et allures"
                    >
                      <Sliders className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => onScheduleWorkout(todaySession)}
                      className="px-4 py-2.5 rounded-xl btn-telemetry-cyan text-xs font-semibold flex items-center gap-2 active:scale-95 transition-all"
                    >
                      <Watch className="w-4 h-4" />
                      Programmer sur Garmin
                    </button>
                  </div>
                )}
              </>
            )}

            {isUltimate && !isCompleted && (
              <button
                onClick={() => onOpenManualModal(todaySession)}
                className="px-4 py-2.5 rounded-xl bg-[#00A7E1]/15 hover:bg-[#00A7E1]/25 border border-[#00A7E1]/30 text-[#00A7E1] text-xs font-bold transition-all flex items-center gap-2 shadow-sm active:scale-95"
              >
                <Check className="w-4 h-4" />
                Valider l'Ultimate fait
              </button>
            )}

            {isCompleted && (
              <div className="px-4 py-2 rounded-xl bg-[#10B981]/15 border border-[#10B981]/30 text-[#10B981] text-xs font-mono font-bold flex items-center gap-2">
                <Check className="w-4 h-4 text-[#10B981]" />
                SÉANCE TERMINÉE
              </div>
            )}

            {isRest && (
              <div className="px-4 py-2 rounded-xl bg-slate-800 border border-white/[0.08] text-slate-400 text-xs font-mono font-bold">
                REPOS & RÉCUPÉRATION
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
