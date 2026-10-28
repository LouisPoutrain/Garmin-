import React, { useState } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Watch,
  RotateCcw,
  Check,
  Loader2,
  Sparkles,
  Sliders,
  HeartHandshake,
} from 'lucide-react';
import type { DayPlan, WeeklyScorecard, ManualSessionValidationParams, AthleteId } from '../types';
import { Skeleton } from './Skeleton';
import { ManualSessionModal } from './ManualSessionModal';
import { WorkoutCustomizerModal } from './WorkoutCustomizerModal';

interface WeeklyPlannerProps {
  days: DayPlan[];
  methodology?: string;
  loading: boolean;
  scorecard?: WeeklyScorecard;
  louisScorecard?: WeeklyScorecard;
  claraScorecard?: WeeklyScorecard;
  coordinationNotes?: string;
  athleteId?: AthleteId;
  weekTitle?: string;
  isCurrentWeek?: boolean;
  offsetWeeks?: number;
  todayIso?: string;
  onNavigateWeek?: (offset: number) => void;
  onSelectActivity?: (activityId: number | string) => void;
  onScheduleWorkout?: (day: DayPlan, athleteId?: string) => Promise<void>;
  onToggleManualCompletion?: (params: ManualSessionValidationParams) => Promise<void>;
  onGeneratePlan?: () => Promise<void>;
}

export const WeeklyPlanner: React.FC<WeeklyPlannerProps> = ({
  days,
  loading,
  scorecard: _scorecard,
  louisScorecard: _louisScorecard,
  claraScorecard: _claraScorecard,
  coordinationNotes,
  athleteId: _athleteId = 'louis',
  weekTitle,
  isCurrentWeek = true,
  offsetWeeks = 0,
  todayIso,
  onNavigateWeek,
  onSelectActivity,
  onScheduleWorkout,
  onToggleManualCompletion,
  onGeneratePlan,
}) => {
  const [actionLoadingKey, setActionLoadingKey] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [modalDay, setModalDay] = useState<DayPlan | null>(null);
  const [customizerDay, setCustomizerDay] = useState<DayPlan | null>(null);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);

  const handleSchedule = async (day: DayPlan, targetAthleteId: string = 'louis') => {
    if (!onScheduleWorkout || !day.date_iso) return;
    const key = `${targetAthleteId}_${day.date_iso}`;
    setActionLoadingKey(key);
    try {
      await onScheduleWorkout(day, targetAthleteId);
      const name = targetAthleteId === 'clara' ? 'Clara' : 'Louis';
      setSuccessMessage(`Séance du ${day.date_short || day.day} programmée sur la montre de ${name} !`);
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (e: any) {
      console.error(e);
    } finally {
      setActionLoadingKey(null);
    }
  };

  const handleModalSubmit = async (params: ManualSessionValidationParams) => {
    if (!onToggleManualCompletion) return;
    const targetAthlete = params.athlete_id || (modalDay?.athlete_id || 'louis');
    const key = `${targetAthlete}_${params.date_iso}`;
    setActionLoadingKey(key);
    try {
      await onToggleManualCompletion({ ...params, athlete_id: targetAthlete });
      setSuccessMessage(
        params.push_to_garmin
          ? `Séance synchronisée sur la montre Garmin !`
          : `Séance validée.`
      );
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (e: any) {
      console.error(e);
    } finally {
      setActionLoadingKey(null);
    }
  };

  const handleCancelManual = async (day: DayPlan, targetAthleteId: string = 'louis') => {
    if (!onToggleManualCompletion || !day.date_iso) return;
    const key = `${targetAthleteId}_${day.date_iso}`;
    setActionLoadingKey(key);
    try {
      await onToggleManualCompletion({
        date_iso: day.date_iso,
        athlete_id: targetAthleteId,
        sport: day.sport,
        completed: false,
        duration_minutes: 0,
        activity_name: '',
        description: '',
        start_time: '',
        push_to_garmin: false,
      });
      setSuccessMessage(`Validation annulée.`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (e: any) {
      console.error(e);
    } finally {
      setActionLoadingKey(null);
    }
  };

  const handleCustomizerSubmit = async (customizedData: {
    date_iso: string;
    workout_name: string;
    duration_minutes: number;
    workout_structure: any;
  }) => {
    if (!onScheduleWorkout) return;
    const targetAthlete = customizerDay?.athlete_id || 'louis';
    const key = `${targetAthlete}_${customizedData.date_iso}`;
    setActionLoadingKey(key);
    try {
      await onScheduleWorkout(
        {
          date_iso: customizedData.date_iso,
          athlete_id: targetAthlete,
          type: customizedData.workout_name,
          sport: 'running',
          duration: `${customizedData.duration_minutes} min`,
          workout_structure: customizedData.workout_structure,
          day: customizerDay?.day || 'Séance',
        } as DayPlan,
        targetAthlete
      );
      setSuccessMessage(`Séance "${customizedData.workout_name}" programmée sur Garmin !`);
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (e: any) {
      console.error(e);
    } finally {
      setActionLoadingKey(null);
    }
  };

  const handleGeneratePlanClick = async () => {
    if (!onGeneratePlan) return;
    setIsGeneratingPlan(true);
    try {
      await onGeneratePlan();
      setSuccessMessage('Cycle 3 semaines programmé avec succès !');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (e: any) {
      console.error(e);
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  if (loading && days.length === 0) {
    return (
      <div className="telemetry-card p-4 rounded-2xl space-y-3">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-10 rounded-xl" />
        <Skeleton className="h-14 rounded-xl" />
        <Skeleton className="h-14 rounded-xl" />
        <Skeleton className="h-14 rounded-xl" />
      </div>
    );
  }

  // Render athlete session row helper with telemetry intensity codes
  const renderAthleteRow = (
    item: DayPlan,
    athleteKey: 'louis' | 'clara',
    athleteLabel: string,
    isParentToday: boolean
  ) => {
    const isRest = item.sport === 'recovery' || (item.type?.toLowerCase().includes('repos') ?? false);
    const isKey = item.is_key;
    const isActionLoading = actionLoadingKey === `${athleteKey}_${item.date_iso}`;

    // Intensity color tag
    const rawZone = item.workout_structure?.hr_zone?.toUpperCase() || '';
    const rawType = (item.type || '').toLowerCase();
    let zoneTag = { label: 'Z2 Aérobie', bg: 'bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30' };
    if (rawZone.includes('Z5') || rawType.includes('vma') || rawType.includes('fractionné')) {
      zoneTag = { label: 'Z5 Lactique', bg: 'bg-[#F43F5E]/15 text-[#F43F5E] border-[#F43F5E]/30' };
    } else if (rawZone.includes('Z4') || rawType.includes('seuil')) {
      zoneTag = { label: 'Z4 Seuil', bg: 'bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30' };
    } else if (rawZone.includes('Z3') || rawType.includes('tempo')) {
      zoneTag = { label: 'Z3 Tempo', bg: 'bg-[#00A7E1]/15 text-[#00A7E1] border-[#00A7E1]/30' };
    } else if (isRest) {
      zoneTag = { label: 'Z1 Récup', bg: 'bg-slate-500/15 text-slate-400 border-slate-500/30' };
    }

    return (
      <div
        className={`p-3 rounded-xl border text-xs transition-all space-y-2 flex flex-col justify-between ${
          item.status === 'completed'
            ? 'bg-[#10231D]/80 border-[#10B981]/30'
            : item.status === 'completed_manual'
            ? 'bg-[#10202E]/80 border-[#00A7E1]/30'
            : isParentToday
            ? 'bg-[#151D2C] border-[#00A7E1]/40 shadow-[0_0_12px_rgba(0,167,225,0.1)]'
            : 'bg-[#121722] border-white/[0.05]'
        }`}
      >
        <div className="space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
              <span
                className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border uppercase tracking-wider ${
                  athleteKey === 'louis'
                    ? 'bg-[#00A7E1]/15 text-[#00A7E1] border-[#00A7E1]/30'
                    : 'bg-[#F43F5E]/15 text-[#F43F5E] border-[#F43F5E]/30'
                }`}
              >
                {athleteLabel}
              </span>
              {!isRest && (
                <span className={`text-[9px] font-mono font-semibold px-1.5 py-0.2 rounded border ${zoneTag.bg}`}>
                  {zoneTag.label}
                </span>
              )}
              <span className="text-sm">{item.sport_icon || (athleteKey === 'louis' ? '🏃‍♂️' : '🏃‍♀️')}</span>
              <span className="font-bold text-slate-100 truncate text-xs">{item.type}</span>
              {isKey && (
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30 flex-shrink-0">
                  CLÉ
                </span>
              )}
            </div>

            <div className="text-right flex-shrink-0 font-mono font-bold text-slate-200 text-xs">
              {item.duration}
            </div>
          </div>

          {item.focus && (
            <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
              {item.focus}
            </p>
          )}
        </div>

        {/* Action controls */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/[0.06]">
          <div>
            {item.actual_activity ? (
              <button
                type="button"
                onClick={() => item.actual_activity?.id && onSelectActivity?.(item.actual_activity.id)}
                className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30 flex items-center gap-1 hover:bg-[#10B981]/25 transition-colors cursor-pointer"
                title="Cliquer pour afficher les détails de l'activité"
              >
                <Check className="w-3 h-3 text-[#10B981]" />
                Réalisé {item.actual_activity.distance_km ? `(${item.actual_activity.distance_km} km)` : ''}
              </button>
            ) : item.status === 'completed_manual' ? (
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-[#00A7E1]/15 text-[#00A7E1] border border-[#00A7E1]/30 flex items-center gap-1">
                <Check className="w-3 h-3 text-[#00A7E1]" />
                Validé ({item.duration})
              </span>
            ) : isParentToday ? (
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Aujourd'hui
              </span>
            ) : isRest ? (
              <span className="text-[10px] font-mono text-slate-500">Jour off</span>
            ) : (
              <span className="text-[10px] font-mono text-slate-500">Planifié</span>
            )}
          </div>

          <div className="flex items-center gap-1.5 ml-auto">
            {item.can_manual_toggle && !item.actual_activity && item.status === 'completed_manual' && (
              <button
                type="button"
                onClick={() => handleCancelManual(item, athleteKey)}
                disabled={isActionLoading}
                className="text-[10px] text-slate-400 hover:text-slate-200 px-2 py-0.5 rounded bg-[#171D2A] border border-white/[0.06] flex items-center gap-1"
                title="Annuler la validation manuelle"
              >
                <RotateCcw className="w-2.5 h-2.5" />
                Annuler
              </button>
            )}

            {item.can_manual_toggle && !item.actual_activity && item.status !== 'completed_manual' && !isRest && (
              <button
                type="button"
                onClick={() => setModalDay(item)}
                disabled={isActionLoading}
                className="text-[10px] font-semibold text-slate-300 hover:text-white px-2 py-0.5 rounded bg-[#171D2A] hover:bg-[#1E2638] border border-white/[0.08] transition-colors"
              >
                Valider fait
              </button>
            )}

            {item.can_schedule_garmin && item.status !== 'completed' && item.status !== 'completed_manual' && (
              <>
                {item.garmin_scheduled ? (
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-[#00A7E1]/15 text-[#00A7E1] border border-[#00A7E1]/30 flex items-center gap-1">
                    <Watch className="w-3 h-3" />
                    Sur montre
                  </span>
                ) : (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setCustomizerDay(item)}
                      className="p-1 rounded-md bg-[#171D2A] hover:bg-[#1E2638] text-slate-400 hover:text-slate-200 border border-white/[0.08] transition-colors"
                      title="Personnaliser les allures ou intervalles"
                    >
                      <Sliders className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSchedule(item, athleteKey)}
                      disabled={isActionLoading}
                      className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-md flex items-center gap-1 shadow-sm disabled:opacity-50 transition-all ${
                        athleteKey === 'louis' ? 'btn-telemetry-cyan' : 'btn-telemetry-coral'
                      }`}
                      title="Envoyer directement sur la montre Garmin"
                    >
                      {isActionLoading ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Watch className="w-3 h-3" />
                      )}
                      Garmin
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="telemetry-card rounded-2xl p-4 sm:p-5 space-y-4 text-slate-200">
      {/* 1. Header with Week Navigation & Cycle IA Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.07]">
        <div className="flex items-center gap-2.5">
          <Calendar className="w-4 h-4 text-[#00A7E1]" />
          <div>
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
              Planning Télémétrique • Timeline Sportive
            </h3>
            <p className="text-[11px] font-mono text-slate-400">
              {weekTitle || 'Semaine active'}
            </p>
          </div>
        </div>

        {/* Action & Navigation Buttons */}
        <div className="flex items-center gap-1.5 self-end sm:self-auto font-mono">
          {onGeneratePlan && (
            <button
              type="button"
              onClick={handleGeneratePlanClick}
              disabled={isGeneratingPlan || loading}
              title="Générer le cycle progressif sur 3 semaines"
              className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-[#171D2A] hover:bg-[#1E2638] text-[#00A7E1] border border-white/[0.08] transition-colors flex items-center gap-1.5 mr-1"
            >
              {isGeneratingPlan ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">Cycle 3 Semaines IA</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onNavigateWeek?.(offsetWeeks - 1)}
            disabled={loading}
            title="Semaine précédente"
            className="p-1.5 rounded-lg bg-[#171D2A] hover:bg-[#20293C] border border-white/[0.06] text-slate-300 hover:text-white transition-colors disabled:opacity-40"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {!isCurrentWeek || offsetWeeks !== 0 ? (
            <button
              type="button"
              onClick={() => onNavigateWeek?.(0)}
              className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-[#171D2A] hover:bg-[#1E2638] text-slate-300 hover:text-white border border-white/[0.08] transition-colors"
            >
              Cette semaine
            </button>
          ) : (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
              Active
            </span>
          )}

          <button
            type="button"
            onClick={() => onNavigateWeek?.(offsetWeeks + 1)}
            disabled={loading}
            title="Semaine suivante"
            className="p-1.5 rounded-lg bg-[#171D2A] hover:bg-[#20293C] border border-white/[0.06] text-slate-300 hover:text-white transition-colors disabled:opacity-40"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {successMessage && (
        <div className="p-2.5 rounded-xl bg-[#10231D] border border-[#10B981]/40 text-[#10B981] text-xs font-mono flex items-center gap-2">
          <Check className="w-4 h-4 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Coordination Notes Banner */}
      {coordinationNotes && (
        <div className="p-3 rounded-xl bg-[#1A1812] border border-[#F59E0B]/30 text-xs text-amber-200/90 flex items-start gap-2.5">
          <HeartHandshake className="w-4 h-4 text-[#F59E0B] flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold font-mono text-[#F59E0B] block mb-0.5">Synergie d'entraînement du couple :</span>
            {coordinationNotes}
          </div>
        </div>
      )}

      {/* 2. Days List (7 Days) */}
      <div className="space-y-3">
        {days.map((day, idx) => {
          const isToday = Boolean(day.is_today || (todayIso && day.date_iso === todayIso));
          const isShared = Boolean(day.is_shared || day.louis?.is_shared || day.clara?.is_shared);
          const hasDuoChildren = Boolean(day.louis && day.clara);

          let cardBorder = 'border-white/[0.06] bg-[#121722]';
          if (isToday) {
            cardBorder = 'border-[#00A7E1]/50 bg-[#121824] ring-1 ring-[#00A7E1]/30 shadow-[0_0_15px_rgba(0,167,225,0.08)]';
          } else if (isShared) {
            cardBorder = 'border-[#F59E0B]/40 bg-[#16151E]';
          }

          return (
            <div
              key={day.date_iso || day.day || idx}
              className={`p-3.5 rounded-xl border ${cardBorder} transition-all space-y-3`}
            >
              {/* Day Header Row */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`flex flex-col items-center justify-center px-2 py-1 rounded-lg border text-center flex-shrink-0 ${
                      isToday
                        ? 'bg-[#00A7E1] border-[#00A7E1] text-white shadow-sm'
                        : isShared
                        ? 'bg-[#F59E0B]/20 border-[#F59E0B]/40 text-[#F59E0B]'
                        : 'bg-[#171D2A] border-white/[0.06] text-slate-300'
                    }`}
                  >
                    <span className="text-[10px] font-mono font-black uppercase leading-tight">
                      {day.day_name?.slice(0, 3) || day.day?.slice(0, 3)}
                    </span>
                    <span className="text-xs font-mono font-bold leading-tight">
                      {day.date_short?.split('/')[0] || day.date_formatted?.split(' ')[0] || ''}
                    </span>
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-white">
                        {day.full_date_fr || `${day.day_name || day.day} ${day.date_short || ''}`}
                      </span>

                      {isToday && (
                        <span className="text-[9px] font-mono font-black uppercase px-1.5 py-0.2 rounded bg-[#00A7E1] text-white">
                          Aujourd'hui
                        </span>
                      )}

                      {isShared && (
                        <span className="text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-md bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30 flex items-center gap-1">
                          🤝 Séance Commune en Duo
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Two Columns: Louis on Left, Clara on Right */}
              {hasDuoChildren ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-2 border-t border-white/[0.06]">
                  {day.louis && renderAthleteRow(day.louis, 'louis', 'Louis', isToday)}
                  {day.clara && renderAthleteRow(day.clara, 'clara', 'Clara', isToday)}
                </div>
              ) : (
                <div className="pt-2 border-t border-white/[0.06]">
                  {renderAthleteRow(day, (day.athlete_id as any) || 'louis', day.athlete_id === 'clara' ? 'Clara' : 'Louis', isToday)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modals */}
      <ManualSessionModal
        day={modalDay}
        isOpen={!!modalDay}
        onClose={() => setModalDay(null)}
        onSubmit={handleModalSubmit}
      />

      <WorkoutCustomizerModal
        day={customizerDay}
        isOpen={!!customizerDay}
        onClose={() => setCustomizerDay(null)}
        onSubmit={handleCustomizerSubmit}
      />
    </div>
  );
};
