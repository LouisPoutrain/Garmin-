import React, { useState } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Loader2,
  Watch,
  Check,
  RotateCcw,
  Sliders,
  HeartHandshake,
  Clock,
} from 'lucide-react';
import type { DayPlan } from '../types';

interface CommonScheduleProps {
  days: DayPlan[];
  loading: boolean;
  weekTitle?: string;
  isCurrentWeek?: boolean;
  offsetWeeks: number;
  todayIso?: string;
  coordinationNotes?: string;
  onNavigateWeek?: (offset: number) => void;
  onSelectActivity?: (id: number | string) => void;
  onScheduleWorkout: (day: DayPlan, targetAthlete?: string) => Promise<void>;
  onOpenCustomizer: (day: DayPlan) => void;
  onOpenManualModal: (day: DayPlan) => void;
  onCancelManualCompletion: (params: { date_iso: string; athlete_id?: string; sport?: string }) => Promise<void>;
  onGeneratePlan?: () => Promise<void>;
}

export const CommonSchedule: React.FC<CommonScheduleProps> = ({
  days,
  loading,
  weekTitle,
  isCurrentWeek,
  offsetWeeks,
  todayIso,
  coordinationNotes,
  onNavigateWeek,
  onSelectActivity,
  onScheduleWorkout,
  onOpenCustomizer,
  onOpenManualModal,
  onCancelManualCompletion,
  onGeneratePlan,
}) => {
  const [actionLoadingKey, setActionLoadingKey] = useState<string | null>(null);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const showFeedback = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => setFeedbackMessage(null), 3500);
  };

  const handleSchedule = async (day: DayPlan, athleteKey: 'louis' | 'clara') => {
    const key = `${athleteKey}_${day.date_iso}`;
    setActionLoadingKey(key);
    try {
      await onScheduleWorkout(day, athleteKey);
      showFeedback(`Séance programmée sur la montre Garmin de ${athleteKey === 'louis' ? 'Louis' : 'Clara'} !`);
    } catch (e: any) {
      console.error(e);
      showFeedback(`Erreur de programmation : ${e.message || 'Erreur Garmin'}`);
    } finally {
      setActionLoadingKey(null);
    }
  };

  const handleCancelManual = async (day: DayPlan, athleteKey: 'louis' | 'clara') => {
    if (!day.date_iso) return;
    const key = `${athleteKey}_${day.date_iso}`;
    setActionLoadingKey(key);
    try {
      await onCancelManualCompletion({
        date_iso: day.date_iso,
        athlete_id: athleteKey,
        sport: day.sport,
      });
      showFeedback(`Séance de ${athleteKey === 'louis' ? 'Louis' : 'Clara'} remise à l'état planifié.`);
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
      showFeedback('Cycle 3 semaines programmé avec succès !');
    } catch (e: any) {
      console.error(e);
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  // Helper renderer for each athlete's session column
  const renderAthleteColumn = (
    item: DayPlan,
    athleteKey: 'louis' | 'clara',
    athleteLabel: string,
    isParentToday: boolean
  ) => {
    const isActionLoading = actionLoadingKey === `${athleteKey}_${item.date_iso}`;
    const isCompleted = item.status === 'completed';
    const isManualCompleted = item.status === 'completed_manual';
    const isRest = item.sport === 'recovery' || (item.type?.toLowerCase().includes('repos') ?? false);
    const isScheduled = !!item.garmin_scheduled;

    const athleteBadgeStyle =
      athleteKey === 'louis'
        ? 'bg-[#00A7E1]/15 text-[#00A7E1] border-[#00A7E1]/30'
        : 'bg-[#F43F5E]/15 text-[#F43F5E] border-[#F43F5E]/30';

    // Parse intensity zone for telemetry badge (Z1-Z5)
    const rawZone = item.workout_structure?.hr_zone?.toUpperCase() || '';
    const rawType = (item.type || '').toLowerCase();
    const rawIntensity = (item.intensity || '').toLowerCase();

    let zoneBadge = { label: 'Z2 Aérobie', bg: 'bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30' };
    if (rawZone.includes('Z5') || rawType.includes('vma') || rawIntensity.includes('anaérobie') || rawType.includes('fractionné')) {
      zoneBadge = { label: 'Z5 Lactique', bg: 'bg-[#F43F5E]/15 text-[#F43F5E] border-[#F43F5E]/30' };
    } else if (rawZone.includes('Z4') || rawType.includes('seuil') || rawIntensity.includes('seuil') || rawType.includes('spé')) {
      zoneBadge = { label: 'Z4 Seuil', bg: 'bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30' };
    } else if (rawZone.includes('Z3') || rawType.includes('tempo')) {
      zoneBadge = { label: 'Z3 Tempo', bg: 'bg-[#00A7E1]/15 text-[#00A7E1] border-[#00A7E1]/30' };
    } else if (isRest || rawZone.includes('Z1') || rawType.includes('repos')) {
      zoneBadge = { label: 'Z1 Récup', bg: 'bg-slate-500/15 text-slate-400 border-slate-500/30' };
    }

    return (
      <div
        className={`p-3 rounded-xl border text-xs flex flex-col justify-between space-y-2.5 transition-all ${
          isCompleted
            ? 'bg-[#10231D]/80 border-[#10B981]/35 shadow-[0_0_12px_rgba(16,185,129,0.08)]'
            : isManualCompleted
            ? 'bg-[#10202E]/80 border-[#00A7E1]/35'
            : isParentToday
            ? athleteKey === 'louis'
              ? 'bg-[#121A2A] border-[#00A7E1]/40 shadow-[0_0_14px_rgba(0,167,225,0.12)]'
              : 'bg-[#1C1422] border-[#F43F5E]/40 shadow-[0_0_14px_rgba(244,63,94,0.12)]'
            : 'bg-[#121722] border-white/[0.06] hover:border-white/[0.12]'
        }`}
      >
        <div className="space-y-1.5">
          {/* Header of session: Athlete tag, Sport icon, Type, Duration */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
              <span className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.2 rounded border ${athleteBadgeStyle}`}>
                {athleteLabel}
              </span>
              {!isRest && (
                <span className={`text-[9px] font-mono font-semibold px-1.5 py-0.2 rounded border ${zoneBadge.bg}`}>
                  {zoneBadge.label}
                </span>
              )}
              <span className="text-sm">{item.sport_icon || (athleteKey === 'louis' ? '🏃‍♂️' : '🏃‍♀️')}</span>
              <span className="font-bold text-slate-100 truncate text-xs">{item.type || 'Séance'}</span>
              {item.is_key && (
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30 flex-shrink-0">
                  CLÉ
                </span>
              )}
            </div>

            <div className="text-right flex-shrink-0 font-mono font-bold text-slate-200 text-xs">
              {item.duration}
            </div>
          </div>

          {/* Focus / Intensity description */}
          {item.focus && (
            <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
              {item.focus}
            </p>
          )}
        </div>

        {/* Action Buttons Bar */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/[0.06]">
          <div>
            {item.actual_activity ? (
              <button
                type="button"
                onClick={() => item.actual_activity?.id && onSelectActivity?.(item.actual_activity.id)}
                className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30 flex items-center gap-1 hover:bg-[#10B981]/25 transition-colors cursor-pointer"
                title="Cliquer pour voir les détails de l'activité"
              >
                <Check className="w-3 h-3 text-[#10B981]" />
                Réalisé {item.actual_activity.distance_km ? `(${item.actual_activity.distance_km} km)` : ''}
              </button>
            ) : isManualCompleted ? (
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-[#00A7E1]/15 text-[#00A7E1] border border-[#00A7E1]/30 flex items-center gap-1">
                <Check className="w-3 h-3 text-[#00A7E1]" />
                Effectué ({item.duration})
              </span>
            ) : isParentToday ? (
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Aujourd'hui
              </span>
            ) : isRest ? (
              <span className="text-[10px] font-mono text-slate-500">Jour off</span>
            ) : (
              <span className="text-[10px] font-mono text-slate-500">Planifié</span>
            )}
          </div>

          <div className="flex items-center gap-1.5 ml-auto">
            {/* Manual Toggle cancel */}
            {item.can_manual_toggle && !item.actual_activity && isManualCompleted && (
              <button
                type="button"
                onClick={() => handleCancelManual(item, athleteKey)}
                disabled={isActionLoading}
                className="text-[10px] text-slate-400 hover:text-slate-200 px-2 py-0.5 rounded bg-[#171D2A] border border-white/[0.06] flex items-center gap-1"
                title="Annuler la complétion manuelle"
              >
                <RotateCcw className="w-2.5 h-2.5" />
                Annuler
              </button>
            )}

            {/* Manual Toggle validate */}
            {item.can_manual_toggle && !item.actual_activity && !isManualCompleted && !isRest && (
              <button
                type="button"
                onClick={() => onOpenManualModal(item)}
                disabled={isActionLoading}
                className="text-[10px] font-semibold text-slate-300 hover:text-white px-2 py-0.5 rounded bg-[#171D2A] hover:bg-[#1E2638] border border-white/[0.08] transition-colors"
              >
                Valider fait
              </button>
            )}

            {/* Garmin Connect Schedule button */}
            {item.can_schedule_garmin && !isCompleted && !isManualCompleted && (
              <>
                {isScheduled ? (
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-[#00A7E1]/15 text-[#00A7E1] border border-[#00A7E1]/30 flex items-center gap-1">
                    <Watch className="w-3 h-3" />
                    Sur montre
                  </span>
                ) : (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onOpenCustomizer(item)}
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
    <div className="matte-card rounded-2xl p-4 sm:p-5 space-y-4 text-slate-200">
      {/* 1. Header with Week Navigation & Cycle IA Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1E2535]">
        <div className="flex items-center gap-2.5">
          <Calendar className="w-4 h-4 text-[#4EA8DE]" />
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide">
              Emploi du Temps Commun du Couple
            </h3>
            <p className="text-[11px] text-slate-400 font-mono">
              {weekTitle || 'Semaine en cours'}
            </p>
          </div>
        </div>

        {/* Action & Navigation Buttons */}
        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          {onGeneratePlan && (
            <button
              type="button"
              onClick={handleGeneratePlanClick}
              disabled={isGeneratingPlan || loading}
              title="Générer ou réinitialiser le cycle progressif sur 3 semaines"
              className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-[#1C2333] hover:bg-[#242D42] text-[#4EA8DE] border border-[#283348] transition-colors flex items-center gap-1.5 mr-1"
            >
              {isGeneratingPlan ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">Cycle 3 semaines IA</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onNavigateWeek?.(offsetWeeks - 1)}
            disabled={loading}
            title="Semaine précédente"
            className="p-1.5 rounded-lg bg-[#171C2B] hover:bg-[#20273A] border border-[#232B3E] text-slate-300 hover:text-white transition-colors disabled:opacity-40"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {!isCurrentWeek || offsetWeeks !== 0 ? (
            <button
              type="button"
              onClick={() => onNavigateWeek?.(0)}
              className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-[#1C2333] hover:bg-[#242D42] text-slate-300 hover:text-white border border-[#283348] transition-colors"
            >
              Cette semaine
            </button>
          ) : (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#3FA372]/15 text-[#3FA372] border border-[#3FA372]/30 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3FA372]" />
              Semaine active
            </span>
          )}

          <button
            type="button"
            onClick={() => onNavigateWeek?.(offsetWeeks + 1)}
            disabled={loading}
            title="Semaine suivante"
            className="p-1.5 rounded-lg bg-[#171C2B] hover:bg-[#20273A] border border-[#232B3E] text-slate-300 hover:text-white transition-colors disabled:opacity-40"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedbackMessage && (
        <div className="p-2.5 rounded-xl bg-[#121E1A] border border-[#3FA372]/40 text-[#3FA372] text-xs flex items-center gap-2">
          <Check className="w-4 h-4 flex-shrink-0" />
          <span>{feedbackMessage}</span>
        </div>
      )}

      {/* Coordination Notes Banner */}
      {coordinationNotes && (
        <div className="p-3 rounded-xl bg-[#1A181C] border border-[#D99738]/30 text-xs text-amber-200/90 flex items-start gap-2.5">
          <HeartHandshake className="w-4 h-4 text-[#D99738] flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-[#D99738] block mb-0.5">Synergie d'entraînement du couple :</span>
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
              className={`p-3.5 rounded-xl border ${cardBorder} transition-colors space-y-3`}
            >
              {/* Day Header Row */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  {/* Date badge */}
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

                    {day.shared_notes && (
                      <div className="text-[11px] text-amber-200/90 font-medium flex items-center gap-1.5 bg-[#F59E0B]/10 border border-[#F59E0B]/20 px-2 py-0.5 rounded-md mt-1 w-fit">
                        <span>🤝 Synergie :</span>
                        <span>{day.shared_notes}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Two Columns: Louis on Left, Clara on Right */}
              {hasDuoChildren ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-2 border-t border-[#1E2535]">
                  {day.louis && renderAthleteColumn(day.louis, 'louis', 'Louis', isToday)}
                  {day.clara && renderAthleteColumn(day.clara, 'clara', 'Clara', isToday)}
                </div>
              ) : (
                <div className="pt-2 border-t border-[#1E2535]">
                  {renderAthleteColumn(day, 'louis', 'Louis', isToday)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
