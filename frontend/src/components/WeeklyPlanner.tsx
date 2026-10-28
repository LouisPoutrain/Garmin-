import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  Watch,
  RotateCcw,
  Flame,
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
  scorecard,
  louisScorecard,
  claraScorecard,
  coordinationNotes,
  athleteId = 'louis',
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

  const isDuo = athleteId === 'duo';

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
      <div className="glass-panel p-4 rounded-2xl space-y-3">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-10 rounded-xl" />
        <Skeleton className="h-14 rounded-xl" />
        <Skeleton className="h-14 rounded-xl" />
        <Skeleton className="h-14 rounded-xl" />
        <Skeleton className="h-14 rounded-xl" />
      </div>
    );
  }

  const completionPct = scorecard?.completion_rate_percent ?? 0;
  const completedCount = scorecard?.completed_sessions ?? 0;
  const totalCount = scorecard?.total_planned_sessions ?? days.filter((d) => !(d.type?.toLowerCase().includes('repos') ?? false)).length;

  // Render athlete session row helper
  const renderAthleteRow = (
    item: DayPlan,
    athleteKey: 'louis' | 'clara',
    athleteLabel: string,
    isParentToday: boolean
  ) => {
    const isUltimate = item.sport === 'ultimate';
    const isRest = item.sport === 'recovery' || (item.type?.toLowerCase().includes('repos') ?? false);
    const isKey = item.is_key;
    const isActionLoading = actionLoadingKey === `${athleteKey}_${item.date_iso}`;

    return (
      <div
        className={`p-3 rounded-lg border text-xs transition-all space-y-2.5 flex flex-col justify-between ${
          item.status === 'completed'
            ? 'bg-emerald-950/20 border-emerald-500/25'
            : item.status === 'completed_manual'
            ? 'bg-cyan-950/20 border-cyan-500/25'
            : 'bg-[#121828] border-white/5'
        }`}
      >
        <div className="space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                  athleteKey === 'louis'
                    ? 'bg-[#FF5E36]/15 text-[#FF7854] border border-[#FF5E36]/30'
                    : 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                }`}
              >
                {athleteLabel}
              </span>
              <span className="text-sm">{item.sport_icon || (athleteKey === 'louis' ? '🏃‍♂️' : '🏃‍♀️')}</span>
              <span className="font-bold text-slate-100 truncate text-xs">{item.type}</span>
              {isKey && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 flex-shrink-0">
                  Clé
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
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/5">
          <div>
            {item.actual_activity ? (
              <button
                type="button"
                onClick={() => item.actual_activity?.id && onSelectActivity?.(item.actual_activity.id)}
                className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 transition-colors cursor-pointer"
                title="Cliquer pour afficher les détails de l'activité"
              >
                <Check className="w-3 h-3 text-emerald-400" />
                Réalisé {item.actual_activity.distance_km ? `(${item.actual_activity.distance_km} km)` : ''}
              </button>
            ) : item.status === 'completed_manual' ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                <Check className="w-3 h-3 text-cyan-400" />
                Effectué ({item.duration})
              </span>
            ) : isParentToday ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                <Clock className="w-3 h-3" /> À faire aujourd'hui
              </span>
            ) : isRest ? (
              <span className="text-[10px] font-medium text-slate-400">Repos</span>
            ) : (
              <span className="text-[10px] text-slate-500">Prévu</span>
            )}
          </div>

          <div className="flex items-center gap-1.5 ml-auto">
            {item.can_manual_toggle && !item.actual_activity && (
              <>
                {item.status === 'completed_manual' ? (
                  <button
                    onClick={() => handleCancelManual(item, athleteKey)}
                    disabled={isActionLoading}
                    className="text-[10px] text-slate-400 hover:text-slate-200 px-2 py-0.5 rounded bg-slate-800 border border-white/10 flex items-center gap-1"
                  >
                    <RotateCcw className="w-2.5 h-2.5" /> Annuler
                  </button>
                ) : (
                  <button
                    onClick={() => setModalDay({ ...item, athlete_id: athleteKey })}
                    disabled={isActionLoading}
                    className="text-[10px] font-bold text-cyan-300 hover:text-cyan-200 px-2 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/30 flex items-center gap-1 active:scale-95"
                  >
                    <Check className="w-3 h-3" />
                    {isUltimate ? 'Valider Ultimate' : 'Valider fait'}
                  </button>
                )}
              </>
            )}

            {item.sport === 'running' && !item.actual_activity && (
              <>
                {item.garmin_scheduled ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-900 text-slate-300 border border-white/10 flex items-center gap-1">
                    <Watch className="w-3 h-3 text-cyan-400" /> Sur montre
                  </span>
                ) : (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setCustomizerDay({ ...item, athlete_id: athleteKey })}
                      disabled={isActionLoading}
                      title="Personnaliser les étapes de la séance"
                      className="p-1 rounded bg-slate-800 border border-white/10 text-slate-400 hover:text-cyan-300"
                    >
                      <Sliders className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleSchedule(item, athleteKey)}
                      disabled={isActionLoading}
                      className={`text-[10px] font-bold text-white px-2 py-0.5 rounded border flex items-center gap-1 shadow-sm active:scale-95 ${
                        athleteKey === 'clara'
                          ? 'bg-purple-600 hover:bg-purple-500 border-purple-400/40'
                          : 'bg-[#FF5E36] hover:bg-[#FF7854] border-[#FF5E36]/40'
                      }`}
                    >
                      {isActionLoading ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Watch className="w-3 h-3" />
                      )}
                      Montre {athleteLabel}
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
    <div className="glass-panel p-4 rounded-2xl space-y-4">
      {/* 1. Header with Week Navigation & Temporal Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-white/5">
        <div className="flex items-center gap-2">
          {isDuo ? (
            <HeartHandshake className="w-4 h-4 text-amber-400" />
          ) : (
            <Calendar className="w-4 h-4 text-[#38BDF8]" />
          )}
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-wide">
                {isDuo ? 'Planning Duo Synchronisé (Louis & Clara)' : 'Planning Hebdomadaire Connecté'}
              </h3>
              {isDuo && (
                <span className="text-[10px] uppercase font-black px-2 py-0.2 rounded-full bg-gradient-to-r from-amber-500/20 to-purple-500/20 text-amber-300 border border-amber-400/30">
                  Duo 10 km
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              {weekTitle || 'Semaine en cours'}
            </p>
          </div>
        </div>

        {/* Action & Navigation Buttons */}
        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          {onGeneratePlan && !isDuo && (
            <button
              onClick={handleGeneratePlanClick}
              disabled={isGeneratingPlan || loading}
              title="Générer ou réinitialiser le cycle progressif sur 3 semaines"
              className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-gradient-to-r from-cyan-500/15 to-blue-500/15 hover:from-cyan-500/25 hover:to-blue-500/25 text-cyan-300 border border-cyan-500/30 transition-all flex items-center gap-1.5 active:scale-95 shadow-sm mr-1"
            >
              {isGeneratingPlan ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              )}
              <span className="hidden sm:inline">Cycle 3 semaines</span>
            </button>
          )}

          <button
            onClick={() => onNavigateWeek?.(offsetWeeks - 1)}
            disabled={loading}
            title="Semaine précédente"
            className="p-1.5 rounded-lg bg-slate-900/60 hover:bg-slate-800 border border-white/5 text-slate-300 hover:text-white transition-colors disabled:opacity-50"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {!isCurrentWeek || offsetWeeks !== 0 ? (
            <button
              onClick={() => onNavigateWeek?.(0)}
              className="text-[11px] px-2 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 transition-colors font-medium"
            >
              Cette semaine
            </button>
          ) : (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              Semaine active
            </span>
          )}

          <button
            onClick={() => onNavigateWeek?.(offsetWeeks + 1)}
            disabled={loading}
            title="Semaine suivante"
            className="p-1.5 rounded-lg bg-slate-900/60 hover:bg-slate-800 border border-white/5 text-slate-300 hover:text-white transition-colors disabled:opacity-50"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Success Banner */}
      <AnimatePresence>
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
            <span className="font-medium">{successMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2b. Coordination Tip Banner in Duo Mode */}
      {isDuo && coordinationNotes && (
        <div className="p-3 rounded-xl bg-[#0F1424] border border-amber-500/25 text-xs text-amber-200/90 flex items-start gap-2.5 shadow-sm">
          <HeartHandshake className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-amber-300 block mb-0.5">Synergie d'entraînement du couple :</span>
            {coordinationNotes}
          </div>
        </div>
      )}

      {/* 3. Weekly Scorecard Track */}
      <div className="p-3 rounded-xl bg-slate-950/40 border border-white/5 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-300 font-medium flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-[#FF5E36]" />
            {isDuo ? 'Complétion des séances prévues' : 'Suivi des séances'} :{' '}
            <strong className="text-white font-mono">
              {completedCount} / {totalCount}
            </strong>
          </span>
          <span className="font-bold font-mono text-cyan-300">{completionPct}%</span>
        </div>

        {isDuo && louisScorecard && claraScorecard && (
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-1 border-t border-white/5">
            <span>
              <strong className="text-[#FF7854]">Louis :</strong> {louisScorecard.completed_sessions}/{louisScorecard.total_planned_sessions} ({louisScorecard.actual_volume_km} km)
            </span>
            <span>
              <strong className="text-purple-300">Clara :</strong> {claraScorecard.completed_sessions}/{claraScorecard.total_planned_sessions} ({claraScorecard.actual_volume_km} km)
            </span>
          </div>
        )}

        <div className="h-2 rounded-full bg-slate-900 border border-white/5 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(completionPct, 100)}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className={`h-full rounded-full ${
              isDuo
                ? 'bg-gradient-to-r from-[#F59E0B] via-[#EC4899] to-[#8B5CF6]'
                : 'bg-gradient-to-r from-[#FF5E36] to-[#00F0FF]'
            }`}
          />
        </div>
      </div>

      {/* 4. Days List */}
      <div className="space-y-3">
        {days.map((day, idx) => {
          const isToday = Boolean(day.is_today || (todayIso && day.date_iso === todayIso));
          const isShared = Boolean(day.is_shared || (day.louis?.is_shared) || (day.clara?.is_shared));
          const hasDuoChildren = isDuo && day.louis && day.clara;

          let cardBorder = 'border-slate-800/80 bg-[#0E1320] hover:border-slate-700';
          if (isToday) {
            cardBorder =
              'border-[#FF5E36]/40 bg-[#121828] shadow-sm ring-1 ring-[#FF5E36]/30';
          } else if (isShared) {
            cardBorder =
              'border-amber-500/30 bg-[#121624] shadow-sm';
          } else if (day.status === 'completed') {
            cardBorder = 'border-emerald-500/25 bg-[#0C141E] hover:border-emerald-500/40';
          }

          return (
            <div
              key={day.date_iso || day.day || idx}
              className={`p-3.5 rounded-xl border ${cardBorder} transition-all space-y-3`}
            >
              {/* Day Header Row: Date badge, day name, and shared badge */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`flex flex-col items-center justify-center px-2 py-1 rounded-lg border text-center flex-shrink-0 ${
                      isToday
                        ? 'bg-[#FF5E36] border-[#FF5E36] text-white shadow-sm'
                        : isShared
                        ? 'bg-amber-500/20 border-amber-400/40 text-amber-300'
                        : 'bg-slate-900 border-white/10 text-slate-300'
                    }`}
                  >
                    <span className="text-[10px] font-black uppercase leading-tight">
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
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-[#FF5E36] text-white">
                          Aujourd'hui
                        </span>
                      )}

                      {isShared && (
                        <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                          🤝 Séance Commune en Duo
                        </span>
                      )}
                    </div>

                    {day.shared_notes && (
                      <div className="text-[11px] text-amber-300/90 font-medium flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md mt-1 w-fit">
                        <span>🤝 Synergie :</span>
                        <span>{day.shared_notes}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Render either 2 Duo Columns or Single Athlete Row */}
              {hasDuoChildren ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-2 border-t border-white/5">
                  {day.louis && renderAthleteRow(day.louis, 'louis', 'Louis', isToday)}
                  {day.clara && renderAthleteRow(day.clara, 'clara', 'Clara', isToday)}
                </div>
              ) : (
                renderAthleteRow(day, (athleteId as any) === 'clara' ? 'clara' : 'louis', (athleteId as any) === 'clara' ? 'Clara' : 'Louis', isToday)
              )}
            </div>
          );
        })}
      </div>

      {/* Manual Session Validation Modal */}
      <ManualSessionModal
        day={modalDay}
        isOpen={!!modalDay}
        onClose={() => setModalDay(null)}
        onSubmit={handleModalSubmit}
      />

      {/* Workout Customizer Modal */}
      <WorkoutCustomizerModal
        day={customizerDay}
        isOpen={!!customizerDay}
        onClose={() => setCustomizerDay(null)}
        onSubmit={handleCustomizerSubmit}
      />
    </div>
  );
};
