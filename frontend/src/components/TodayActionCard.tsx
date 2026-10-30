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
    const accentBorder = athleteKey === 'louis' ? 'border-athlete-cyan/30 text-athlete-cyan hover:bg-athlete-cyan/10' : 'border-athlete-coral/30 text-athlete-coral hover:bg-athlete-coral/10';

    if (isDone) {
      return (
        <span className="px-3 py-1.5 rounded-tile bg-metric-good/10 border border-metric-good/30 text-metric-good text-xs font-mono font-bold flex items-center gap-1.5">
          <Check className="w-3.5 h-3.5 text-metric-good" />
          TERMINÉ
        </span>
      );
    }

    if (isOff) {
      return (
        <span className="px-3 py-1.5 rounded-tile bg-surface-2 border border-border text-ink-faint text-xs font-mono font-bold tracking-wider">
          REPOS ACTIF
        </span>
      );
    }

    if (isRun) {
      return isSched ? (
        <span className="px-3 py-1.5 rounded-tile bg-athlete-cyan/10 border border-athlete-cyan/30 text-athlete-cyan text-xs font-mono font-bold flex items-center gap-1.5">
          <Watch className="w-3.5 h-3.5" />
          MONTRE OK
        </span>
      ) : (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onOpenCustomizer(day)}
            className="p-2 rounded-tile bg-surface-2 border border-border hover:border-border-strong text-ink-muted hover:text-ink transition-colors"
            title="Ajuster allures ou intervalles"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onScheduleWorkout(day, athleteKey)}
            className={`px-3.5 py-1.5 rounded-tile bg-surface-2 border ${accentBorder} text-xs font-mono font-semibold flex items-center gap-1.5 transition-all hover:text-ink`}
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
          className="px-3.5 py-1.5 rounded-tile bg-surface-2 border border-athlete-cyan/30 hover:bg-athlete-cyan/10 text-athlete-cyan hover:text-ink text-xs font-mono font-semibold flex items-center gap-1.5 transition-all"
        >
          <Check className="w-3.5 h-3.5" />
          <span>Valider fait</span>
        </button>
      );
    }

    return null;
  };

  return (
    <div className="bg-surface-1 border border-border rounded-card p-4 sm:p-5 mb-5 relative overflow-hidden">
      {/* Telemetry Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-pill bg-metric-good shadow-[0_0_8px_rgba(52,211,153,0.5)] animate-pulse" />
          <span className="text-label uppercase tracking-[0.2em] text-ink-faint font-semibold font-mono">
            SÉANCE DU JOUR • LIVE TELEMETRY
          </span>
          <span className="text-micro font-mono text-ink-muted px-2 py-0.5 rounded-tile border border-border bg-surface-2">
            {todaySession.date_formatted || todaySession.date_short || 'AUJOURD’HUI'}
          </span>
        </div>

        {todaySession.shared_notes && (
          <div className="text-xs font-mono text-duo/90 italic flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-pill bg-duo" />
            <span>{todaySession.shared_notes}</span>
          </div>
        )}
      </div>

      {isDuoCard && todaySession.louis && todaySession.clara ? (
        /* DUEL LOUIS VS CLARA : SPLIT TELEMETRY (Facing half-screens) */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
          {/* LOUIS COLUMN */}
          <div className="p-4 rounded-tile bg-surface-2 border-l-2 border-athlete-cyan border-r border-t border-b border-border space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded-tile border border-athlete-cyan/30 text-athlete-cyan bg-athlete-cyan/10 text-micro font-mono font-bold tracking-[0.18em] uppercase">
                ATHLÈTE 1 • LOUIS
              </span>
              <span className="text-micro font-mono text-ink-faint uppercase tracking-widest">
                {todaySession.louis.sport}
              </span>
            </div>

            <div>
              <div className="text-label uppercase tracking-[0.2em] text-ink-faint font-semibold font-mono">
                SÉANCE PROGRAMMÉE
              </div>
              <h4 className="text-base font-bold text-ink tracking-tight mt-0.5">
                {todaySession.louis.type}
              </h4>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border">
              <div>
                <div className="text-label uppercase tracking-[0.2em] text-ink-faint font-semibold font-mono">
                  DURÉE
                </div>
                <div className="font-mono text-hero font-bold tracking-tight text-ink mt-0.5">
                  {todaySession.louis.duration}
                </div>
              </div>
              <div>
                <div className="text-label uppercase tracking-[0.2em] text-ink-faint font-semibold font-mono">
                  INTENSITÉ
                </div>
                <div className="font-mono text-sm sm:text-base font-bold text-athlete-cyan mt-1">
                  {todaySession.louis.intensity || 'Zone 2 Aérobie'}
                </div>
              </div>
            </div>

            {todaySession.louis.focus && (
              <p className="text-xs font-mono text-ink-muted pt-1 leading-relaxed border-t border-border">
                Focus : {todaySession.louis.focus}
              </p>
            )}

            <div className="pt-2 flex justify-end">
              {renderDiscreetActions(todaySession.louis, 'louis')}
            </div>
          </div>

          {/* CLARA COLUMN */}
          <div className="p-4 rounded-tile bg-surface-2 border-l-2 border-athlete-coral border-r border-t border-b border-border space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded-tile border border-athlete-coral/30 text-athlete-coral bg-athlete-coral/10 text-micro font-mono font-bold tracking-[0.18em] uppercase">
                ATHLÈTE 2 • CLARA
              </span>
              <span className="text-micro font-mono text-ink-faint uppercase tracking-widest">
                {todaySession.clara.sport}
              </span>
            </div>

            <div>
              <div className="text-label uppercase tracking-[0.2em] text-ink-faint font-semibold font-mono">
                SÉANCE PROGRAMMÉE
              </div>
              <h4 className="text-base font-bold text-ink tracking-tight mt-0.5">
                {todaySession.clara.type}
              </h4>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border">
              <div>
                <div className="text-label uppercase tracking-[0.2em] text-ink-faint font-semibold font-mono">
                  DURÉE
                </div>
                <div className="font-mono text-hero font-bold tracking-tight text-ink mt-0.5">
                  {todaySession.clara.duration}
                </div>
              </div>
              <div>
                <div className="text-label uppercase tracking-[0.2em] text-ink-faint font-semibold font-mono">
                  INTENSITÉ
                </div>
                <div className="font-mono text-sm sm:text-base font-bold text-athlete-coral mt-1">
                  {todaySession.clara.intensity || 'Zone 2 Foncier'}
                </div>
              </div>
            </div>

            {todaySession.clara.focus && (
              <p className="text-xs font-mono text-ink-muted pt-1 leading-relaxed border-t border-border">
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
              <span className="px-2 py-0.5 rounded-tile border border-athlete-cyan/30 text-athlete-cyan bg-athlete-cyan/10 text-micro font-mono font-bold tracking-[0.18em] uppercase">
                {todaySession.day_name || todaySession.day}
              </span>
              {todaySession.is_key && (
                <span className="px-2 py-0.5 rounded-tile border border-duo/30 text-duo bg-duo/10 text-micro font-mono font-bold tracking-[0.18em] uppercase">
                  SÉANCE CLÉ
                </span>
              )}
            </div>

            <div>
              <div className="text-label uppercase tracking-[0.2em] text-ink-faint font-semibold font-mono">
                SÉANCE DU JOUR
              </div>
              <h3 className="text-lg font-bold text-ink tracking-tight">
                {todaySession.type}
              </h3>
            </div>

            {todaySession.focus && (
              <p className="text-xs font-mono text-ink-muted max-w-xl">
                {todaySession.focus}
              </p>
            )}
          </div>

          <div className="flex items-center gap-4 self-end md:self-center font-mono">
            <div className="text-right px-3.5 py-2 rounded-tile bg-surface-2 border border-border">
              <div className="text-label uppercase tracking-[0.2em] text-ink-faint font-semibold">
                DURÉE
              </div>
              <div className="font-mono text-hero font-bold text-ink">
                {todaySession.duration}
              </div>
            </div>

            {isRunning && !isCompleted && (
              isScheduled ? (
                <div className="px-3.5 py-2 rounded-tile bg-athlete-cyan/10 border border-athlete-cyan/30 text-athlete-cyan text-xs font-mono font-bold flex items-center gap-2">
                  <Watch className="w-4 h-4" />
                  <span>Prêt sur votre montre Garmin</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenCustomizer(todaySession)}
                    className="p-2.5 rounded-tile bg-surface-2 border border-border hover:border-border-strong text-ink-muted hover:text-ink transition-colors"
                    title="Personnaliser répétitions et allures"
                  >
                    <Sliders className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onScheduleWorkout(todaySession)}
                    className="px-4 py-2 rounded-tile bg-surface-2 border border-athlete-cyan/30 hover:bg-athlete-cyan/10 text-athlete-cyan hover:text-ink text-xs font-mono font-semibold flex items-center gap-1.5 transition-all shadow-[0_0_12px_-2px_rgba(37,99,235,0.30)]"
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
                className="px-4 py-2 rounded-tile bg-surface-2 border border-athlete-cyan/30 hover:bg-athlete-cyan/10 text-athlete-cyan hover:text-ink text-xs font-mono font-semibold flex items-center gap-1.5 transition-all"
              >
                <Check className="w-4 h-4" />
                <span>Valider fait</span>
              </button>
            )}

            {isCompleted && (
              <div className="px-3.5 py-2 rounded-tile bg-metric-good/10 border border-metric-good/30 text-metric-good text-xs font-mono font-bold flex items-center gap-1.5">
                <Check className="w-4 h-4" />
                <span>TERMINÉ</span>
              </div>
            )}

            {isRest && (
              <div className="px-3.5 py-2 rounded-tile bg-surface-2 border border-border text-ink-faint text-xs font-mono font-bold">
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
