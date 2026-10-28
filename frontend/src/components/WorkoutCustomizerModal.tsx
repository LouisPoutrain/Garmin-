import React, { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Watch,
  Sliders,
  Flame,
  Heart,
  Zap,
  Loader2,
} from 'lucide-react';
import type { DayPlan } from '../types';

interface WorkoutCustomizerModalProps {
  day: DayPlan | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (customizedData: {
    date_iso: string;
    workout_name: string;
    duration_minutes: number;
    workout_structure: any;
  }) => Promise<void>;
}

export const WorkoutCustomizerModal: React.FC<WorkoutCustomizerModalProps> = ({
  day,
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [workoutName, setWorkoutName] = useState('');
  const [isIntervals, setIsIntervals] = useState(false);
  const [repeats, setRepeats] = useState(8);
  const [repSeconds, setRepSeconds] = useState(60);
  const [recoverySeconds, setRecoverySeconds] = useState(60);
  const [warmupMin, setWarmupMin] = useState(15);
  const [cooldownMin, setCooldownMin] = useState(10);
  const [targetMode, setTargetMode] = useState<'hr' | 'pace'>('hr');
  const [hrZone, setHrZone] = useState('Z4');
  const [hrMin, setHrMin] = useState(165);
  const [hrMax, setHrMax] = useState(178);
  const [paceTarget, setPaceTarget] = useState('4:00');
  const [continuousDuration, setContinuousDuration] = useState(45);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (day) {
      const struct = day.workout_structure;
      const title = struct?.workout_name || day.type || 'Entraînement Running';
      setWorkoutName(title);

      const intervalsDetected =
        struct?.type === 'intervals' ||
        day.type.toLowerCase().includes('fractionné') ||
        day.type.toLowerCase().includes('seuil') ||
        day.type.toLowerCase().includes('vma');
      setIsIntervals(intervalsDetected);

      if (struct?.repeats) setRepeats(struct.repeats);
      else if (day.type.includes('4x') || day.type.includes('4 x')) setRepeats(4);
      else if (day.type.includes('8x') || day.type.includes('8 x')) setRepeats(8);
      else setRepeats(6);

      if (struct?.rep_seconds) setRepSeconds(struct.rep_seconds);
      else if (day.type.includes('1000m')) setRepSeconds(240);
      else setRepSeconds(60);

      if (struct?.recovery_seconds) setRecoverySeconds(struct.recovery_seconds);
      else if (day.type.includes('1000m')) setRecoverySeconds(105);
      else setRecoverySeconds(60);

      setWarmupMin(struct?.warmup_min || 15);
      setCooldownMin(struct?.cooldown_min || 10);
      setHrZone(struct?.hr_zone || 'Z4');
      setHrMin(struct?.hr_min || 165);
      setHrMax(struct?.hr_max || 178);

      if (struct?.duration_minutes) {
        setContinuousDuration(struct.duration_minutes);
      } else {
        const num = day.duration?.match(/\d+/);
        setContinuousDuration(num ? parseInt(num[0], 10) : 45);
      }

      setError(null);
    }
  }, [day, isOpen]);

  if (!day) return null;

  // Total session calculation
  const totalDurationMinutes = isIntervals
    ? Math.round(warmupMin + (repeats * (repSeconds + recoverySeconds)) / 60 + cooldownMin)
    : continuousDuration;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!day.date_iso) return;
    setSubmitting(true);
    setError(null);

    try {
      const structure = isIntervals
        ? {
            type: 'intervals',
            workout_name: workoutName,
            repeats,
            rep_seconds: repSeconds,
            recovery_seconds: recoverySeconds,
            warmup_min: warmupMin,
            cooldown_min: cooldownMin,
            target_mode: targetMode,
            hr_zone: hrZone,
            hr_min: hrMin,
            hr_max: hrMax,
            pace_target: targetMode === 'pace' ? paceTarget : undefined,
          }
        : {
            type: 'continuous',
            workout_name: workoutName,
            duration_minutes: continuousDuration,
            warmup_min: 5,
            cooldown_min: 5,
            hr_zone: hrZone,
            hr_min: hrMin,
            hr_max: hrMax,
          };

      await onSubmit({
        date_iso: day.date_iso,
        workout_name: workoutName,
        duration_minutes: totalDurationMinutes,
        workout_structure: structure,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la programmation sur Garmin');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AnimatePresence>
        {isOpen && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50"
              />
            </Dialog.Overlay>

            <Dialog.Content asChild>
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 12 }}
                transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg max-h-[90vh] overflow-y-auto glass-panel p-6 rounded-3xl border border-white/10 shadow-2xl z-50 text-slate-100"
              >
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-white/5">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-[#FF5E36]/20 to-[#E11D48]/20 border border-[#FF5E36]/30 text-[#FF5E36]">
                      <Sliders className="w-5 h-5" />
                    </div>
                    <div>
                      <Dialog.Title className="text-base font-bold text-white flex items-center gap-2">
                        Personnaliser l'Entraînement
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                          {day.date_short || day.day}
                        </span>
                      </Dialog.Title>
                      <p className="text-xs text-slate-400">
                        Ajustez les fractions avant d'injecter la séance sur votre montre Garmin
                      </p>
                    </div>
                  </div>
                  <Dialog.Close asChild>
                    <button
                      className="p-1.5 rounded-xl bg-slate-900/60 hover:bg-slate-800 border border-white/5 text-slate-400 hover:text-white transition-colors"
                      aria-label="Fermer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </Dialog.Close>
                </div>

                <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                  {error && (
                    <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs">
                      {error}
                    </div>
                  )}

                  {/* Workout Title */}
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Nom de la séance sur la montre
                    </label>
                    <input
                      type="text"
                      value={workoutName}
                      onChange={(e) => setWorkoutName(e.target.value)}
                      required
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-900/80 border border-white/10 text-xs text-white focus:outline-none focus:border-cyan-500/50"
                    />
                  </div>

                  {/* Visual Timeline Breakdown */}
                  <div className="p-3 rounded-2xl bg-slate-950/60 border border-white/5 space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-300 flex items-center gap-1.5">
                        <Flame className="w-3.5 h-3.5 text-[#FF5E36]" />
                        Structure Visuelle de la Séance
                      </span>
                      <span className="text-cyan-300 font-mono">
                        Total : {totalDurationMinutes} min
                      </span>
                    </div>

                    {/* Timeline Bar */}
                    <div className="h-6 rounded-lg bg-slate-900 border border-white/5 p-1 flex items-center gap-1 overflow-hidden">
                      {/* Warmup */}
                      <div
                        style={{ width: `${Math.max((warmupMin / totalDurationMinutes) * 100, 15)}%` }}
                        className="h-full rounded bg-cyan-500/30 text-[9px] font-bold text-cyan-300 flex items-center justify-center truncate px-1"
                        title={`Échauffement ${warmupMin} min`}
                      >
                        Échauff. {warmupMin}m
                      </div>

                      {/* Reps */}
                      {isIntervals ? (
                        <div
                          style={{
                            width: `${Math.max(
                              ((repeats * (repSeconds + recoverySeconds)) / 60 / totalDurationMinutes) * 100,
                              30
                            )}%`,
                          }}
                          className="h-full rounded bg-gradient-to-r from-[#FF5E36]/40 via-red-500/40 to-[#FF5E36]/40 text-[9px] font-bold text-slate-100 flex items-center justify-center truncate px-1"
                          title={`${repeats} répétitions de ${repSeconds}s`}
                        >
                          ⚡ {repeats} x ({repSeconds}s / {recoverySeconds}s)
                        </div>
                      ) : (
                        <div
                          style={{ width: '60%' }}
                          className="h-full rounded bg-emerald-500/30 text-[9px] font-bold text-emerald-300 flex items-center justify-center truncate px-1"
                        >
                          Course Z2
                        </div>
                      )}

                      {/* Cooldown */}
                      <div
                        style={{ width: `${Math.max((cooldownMin / totalDurationMinutes) * 100, 15)}%` }}
                        className="h-full rounded bg-cyan-500/30 text-[9px] font-bold text-cyan-300 flex items-center justify-center truncate px-1"
                        title={`Retour au calme ${cooldownMin} min`}
                      >
                        Calme {cooldownMin}m
                      </div>
                    </div>
                  </div>

                  {/* Interval specific parameters */}
                  {isIntervals && (
                    <div className="p-3.5 rounded-2xl bg-slate-900/50 border border-white/5 space-y-3.5">
                      <div className="grid grid-cols-2 gap-3">
                        {/* Repeats */}
                        <div>
                          <label className="block text-[11px] font-medium text-slate-400 mb-1">
                            Nombre de répétitions
                          </label>
                          <div className="flex items-center gap-1.5">
                            {[4, 6, 8, 10].map((r) => (
                              <button
                                key={r}
                                type="button"
                                onClick={() => setRepeats(r)}
                                className={`flex-1 py-1 text-xs font-bold rounded-lg border transition-all ${
                                  repeats === r
                                    ? 'bg-[#FF5E36]/20 border-[#FF5E36] text-white'
                                    : 'bg-slate-950 border-white/5 text-slate-400 hover:text-white'
                                }`}
                              >
                                {r}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Fraction Duration */}
                        <div>
                          <label className="block text-[11px] font-medium text-slate-400 mb-1">
                            Durée d'une fraction
                          </label>
                          <select
                            value={repSeconds}
                            onChange={(e) => setRepSeconds(parseInt(e.target.value, 10))}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-white/10 text-xs text-white focus:outline-none"
                          >
                            <option value={60}>1 min (VMA courte)</option>
                            <option value={90}>1 min 30 (VMA moyenne)</option>
                            <option value={120}>2 min (VMA longue)</option>
                            <option value={240}>4 min (1000m Seuil 4:00/km)</option>
                            <option value={300}>5 min (Allure Seuil)</option>
                          </select>
                        </div>
                      </div>

                      {/* Target Mode: Heart Rate vs Pace */}
                      <div className="pt-2 border-t border-white/5">
                        <label className="block text-[11px] font-medium text-slate-400 mb-1.5">
                          Mode de guidage sur la montre
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setTargetMode('hr')}
                            className={`p-2 rounded-xl border text-left transition-all flex items-center gap-2 ${
                              targetMode === 'hr'
                                ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-200'
                                : 'bg-slate-950 border-white/5 text-slate-400'
                            }`}
                          >
                            <Heart className="w-4 h-4 text-cyan-400" />
                            <div>
                              <div className="text-xs font-bold">Zone Cardiaque</div>
                              <div className="text-[10px] text-slate-400">165 - 178 bpm</div>
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => setTargetMode('pace')}
                            className={`p-2 rounded-xl border text-left transition-all flex items-center gap-2 ${
                              targetMode === 'pace'
                                ? 'bg-[#FF5E36]/15 border-[#FF5E36]/40 text-[#FF5E36]'
                                : 'bg-slate-950 border-white/5 text-slate-400'
                            }`}
                          >
                            <Zap className="w-4 h-4 text-[#FF5E36]" />
                            <div>
                              <div className="text-xs font-bold">Allure Seuil</div>
                              <div className="text-[10px] text-slate-400">3:55 - 4:05 min/km</div>
                            </div>
                          </button>
                        </div>

                        {targetMode === 'pace' && (
                          <div className="mt-2.5 p-2.5 rounded-xl bg-slate-950/80 border border-[#FF5E36]/30 flex items-center justify-between">
                            <span className="text-[11px] font-medium text-slate-300">
                              Allure cible sur la montre :
                            </span>
                            <select
                              value={paceTarget}
                              onChange={(e) => setPaceTarget(e.target.value)}
                              className="px-2.5 py-1 rounded-lg bg-slate-900 border border-white/10 text-xs font-bold text-white focus:outline-none"
                            >
                              <option value="3:50">3:50 min/km (15.7 km/h)</option>
                              <option value="3:55">3:55 min/km (15.3 km/h)</option>
                              <option value="4:00">4:00 min/km (15.0 km/h - Objectif Sub-40)</option>
                              <option value="4:05">4:05 min/km (14.7 km/h)</option>
                              <option value="4:10">4:10 min/km (14.4 km/h)</option>
                              <option value="4:15">4:15 min/km (14.1 km/h)</option>
                            </select>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Submit Button */}
                  <div className="pt-2 flex items-center justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs font-medium text-slate-300 hover:text-white transition-colors"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#FF5E36] to-[#E11D48] hover:from-[#FF5E36]/90 hover:to-[#E11D48]/90 text-xs font-bold text-white shadow-lg shadow-[#FF5E36]/20 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
                    >
                      {submitting ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Watch className="w-3.5 h-3.5" />
                      )}
                      Programmer cette version sur Garmin
                    </button>
                  </div>
                </form>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
};
