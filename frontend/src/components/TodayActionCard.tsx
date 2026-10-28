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
        <span className="px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-1.5">
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          Fait
        </span>
      );
    }

    if (isOff) {
      return (
        <span className="px-3 py-1.5 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-bold">
          Repos
        </span>
      );
    }

    if (isRun) {
      return isSched ? (
        <span className="px-3 py-1.5 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-bold flex items-center gap-1.5">
          <Watch className="w-3.5 h-3.5" />
          Montre OK
        </span>
      ) : (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onOpenCustomizer(day)}
            className="p-2 rounded-xl bg-slate-900 border border-white/10 hover:border-cyan-500/30 text-slate-300 hover:text-cyan-300 transition-colors"
            title="Personnaliser"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onScheduleWorkout(day, athleteKey)}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#FF5E36] to-[#E11D48] hover:from-[#FF5E36]/90 hover:to-[#E11D48]/90 text-xs font-bold text-white shadow-md transition-all flex items-center gap-1.5"
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
          className="px-3 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 text-xs font-bold transition-all flex items-center gap-1.5"
        >
          <Check className="w-3.5 h-3.5" />
          Valider fait
        </button>
      );
    }

    return null;
  };

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-[#0E1320] border border-white/[0.08] shadow-sm relative">

      {isDuoCard && todaySession.louis && todaySession.clara ? (
        /* DUO MODE TODAY CARD */
        <div className="space-y-3.5">
          <div className="flex items-center justify-between gap-3 pb-2 border-b border-white/5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-gradient-to-r from-[#F59E0B] via-[#EC4899] to-[#8B5CF6] text-white shadow-sm flex items-center gap-1">
                <HeartHandshake className="w-3 h-3" />
                AUJOURD'HUI EN DUO
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {todaySession.date_formatted || todaySession.date_short}
              </span>
            </div>
            {todaySession.shared_notes && (
              <span className="text-xs text-amber-300 font-medium italic">
                🤝 {todaySession.shared_notes}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Louis Subcard */}
            <div className="p-3 rounded-xl bg-slate-950/60 border border-[#FF5E36]/20 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-[#FF5E36]/20 border border-[#FF5E36]/30 text-[#FF7854] flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {todaySession.louis.sport_icon || '🏃‍♂️'}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-[#FF7854] uppercase tracking-wider">Louis</span>
                    <span className="text-xs font-bold text-white truncate">{todaySession.louis.type}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    {todaySession.louis.duration} • {todaySession.louis.intensity || 'Zone 2'}
                  </div>
                </div>
              </div>
              <div className="flex-shrink-0">{renderActions(todaySession.louis, 'louis')}</div>
            </div>

            {/* Clara Subcard */}
            <div className="p-3 rounded-xl bg-slate-950/60 border border-purple-500/20 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-300 flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {todaySession.clara.sport_icon || '🏃‍♀️'}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-purple-300 uppercase tracking-wider">Clara</span>
                    <span className="text-xs font-bold text-white truncate">{todaySession.clara.type}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
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
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#FF5E36] to-[#E11D48] text-white flex items-center justify-center text-xl shadow-lg shadow-[#FF5E36]/25 flex-shrink-0">
              {icon}
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full text-white ${
                    todaySession.is_shared
                      ? 'bg-gradient-to-r from-[#F59E0B] to-[#EC4899] shadow-md shadow-[#F59E0B]/30'
                      : 'bg-[#FF5E36]'
                  }`}
                >
                  {todaySession.is_shared
                    ? '🤝 DUO SÉANCE COMMUNE'
                    : `AUJOURD'HUI • ${todaySession.day_name || todaySession.day}`}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {todaySession.date_formatted || todaySession.date_short}
                </span>
                {todaySession.is_key && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    Séance Clé
                  </span>
                )}
              </div>

              <h3 className="text-base sm:text-lg font-extrabold text-white">
                {todaySession.type}
              </h3>

              {todaySession.shared_notes && (
                <div className="text-xs font-medium text-amber-300/90 flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg">
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
            <div className="text-right px-3 py-1.5 rounded-xl bg-slate-950/60 border border-white/5">
              <div className="text-xs font-bold text-slate-100 font-mono">
                {todaySession.duration}
              </div>
              {todaySession.intensity && (
                <div className="text-[10px] text-slate-400">
                  {todaySession.intensity}
                </div>
              )}
            </div>

            {/* Action Button */}
            {isRunning && !isCompleted && (
              <>
                {isScheduled ? (
                  <div className="px-4 py-2 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-bold flex items-center gap-2 shadow-sm">
                    <Watch className="w-4 h-4 text-cyan-400" />
                    Prêt sur votre montre Garmin
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onOpenCustomizer(todaySession)}
                      className="p-2.5 rounded-xl bg-slate-900 border border-white/10 hover:border-cyan-500/30 text-slate-300 hover:text-cyan-300 transition-colors"
                      title="Personnaliser les répétitions et allures"
                    >
                      <Sliders className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => onScheduleWorkout(todaySession)}
                      className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#FF5E36] to-[#E11D48] hover:from-[#FF5E36]/90 hover:to-[#E11D48]/90 text-xs font-bold text-white shadow-lg shadow-[#FF5E36]/25 transition-all flex items-center gap-2 active:scale-95"
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
                className="px-4 py-2.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 text-xs font-bold transition-all flex items-center gap-2 shadow-sm active:scale-95"
              >
                <Check className="w-4 h-4" />
                Valider l'Ultimate fait
              </button>
            )}

            {isCompleted && (
              <div className="px-4 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" />
                Séance terminée
              </div>
            )}

            {isRest && (
              <div className="px-4 py-2 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-bold">
                Repos & Récupération
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
