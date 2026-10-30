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
                className="fixed inset-0 bg-bg/80 backdrop-blur-md z-50"
              />
            </Dialog.Overlay>

            <Dialog.Content asChild>
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 12 }}
                transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg max-h-[90vh] overflow-y-auto glass-panel p-6 rounded-card border border-border shadow-2xl z-50 text-ink"
              >
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-border">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-tile bg-gradient-to-br from-athlete-coral/20 to-athlete-coral/10 border border-athlete-coral/30 text-athlete-coral">
                      <Sliders className="w-5 h-5" />
                    </div>
                    <div>
                      <Dialog.Title className="text-title font-heading font-bold text-ink flex items-center gap-2">
                        Personnaliser l'Entraînement
                        <span className="text-micro font-mono px-2 py-0.5 rounded-pill bg-athlete-cyan/15 text-athlete-cyan border border-athlete-cyan/30">
                          {day.date_short || day.day}
                        </span>
                      </Dialog.Title>
                      <p className="text-xs text-ink-muted">
                        Ajustez les fractions avant d'injecter la séance sur votre montre Garmin
                      </p>
                    </div>
                  </div>
                  <Dialog.Close asChild>
                    <button
                      className="p-1.5 rounded-tile bg-surface-2 hover:bg-surface-3 border border-border text-ink-muted hover:text-ink transition-colors"
                      aria-label="Fermer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </Dialog.Close>
                </div>

                <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                  {error && (
                    <div className="p-3 rounded-tile bg-athlete-coral/15 border border-athlete-coral/30 text-athlete-coral text-xs">
                      {error}
                    </div>
                  )}

                  {/* Workout Title */}
                  <div>
                    <label className="block text-xs font-medium text-ink mb-1.5">
                      Nom de la séance sur la montre
                    </label>
                    <input
                      type="text"
                      value={workoutName}
                      onChange={(e) => setWorkoutName(e.target.value)}
                      required
                      className="w-full px-3.5 py-2 rounded-tile bg-surface-2 border border-border text-xs text-ink focus:outline-none focus:border-athlete-cyan/50"
                    />
                  </div>

                  {/* Visual Timeline Breakdown */}
                  <div className="p-3 rounded-card bg-surface-1 border border-border space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-ink flex items-center gap-1.5">
                        <Flame className="w-3.5 h-3.5 text-athlete-coral" />
                        Structure Visuelle de la Séance
                      </span>
                      <span className="text-athlete-cyan font-mono">
                        Total : {totalDurationMinutes} min
                      </span>
                    </div>

                    {/* Timeline Bar */}
                    <div className="h-6 rounded-tile bg-surface-2 border border-border p-1 flex items-center gap-1 overflow-hidden">
                      {/* Warmup */}
                      <div
                        style={{ width: `${Math.max((warmupMin / totalDurationMinutes) * 100, 15)}%` }}
                        className="h-full rounded-pill bg-athlete-cyan/30 text-micro font-bold text-athlete-cyan flex items-center justify-center truncate px-1"
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
                          className="h-full rounded-pill bg-gradient-to-r from-athlete-coral/40 via-athlete-coral/40 to-athlete-coral/40 text-micro font-bold text-ink flex items-center justify-center truncate px-1"
                          title={`${repeats} répétitions de ${repSeconds}s`}
                        >
                          ⚡ {repeats} x ({repSeconds}s / {recoverySeconds}s)
                        </div>
                      ) : (
                        <div
                          style={{ width: '60%' }}
                          className="h-full rounded-pill bg-metric-good/30 text-micro font-bold text-metric-good flex items-center justify-center truncate px-1"
                        >
                          Course Z2
                        </div>
                      )}

                      {/* Cooldown */}
                      <div
                        style={{ width: `${Math.max((cooldownMin / totalDurationMinutes) * 100, 15)}%` }}
                        className="h-full rounded-pill bg-athlete-cyan/30 text-micro font-bold text-athlete-cyan flex items-center justify-center truncate px-1"
                        title={`Retour au calme ${cooldownMin} min`}
                      >
                        Calme {cooldownMin}m
                      </div>
                    </div>
                  </div>

                  {/* Interval specific parameters */}
                  {isIntervals && (
                    <div className="p-3.5 rounded-card bg-surface-2/50 border border-border space-y-3.5">
                      <div className="grid grid-cols-2 gap-3">
                        {/* Repeats */}
                        <div>
                          <label className="block text-xs font-medium text-ink-muted mb-1">
                            Nombre de répétitions
                          </label>
                          <div className="flex items-center gap-1.5">
                            {[4, 6, 8, 10].map((r) => (
                              <button
                                key={r}
                                type="button"
                                onClick={() => setRepeats(r)}
                                className={`flex-1 py-1 text-xs font-bold rounded-tile border transition-all ${
                                  repeats === r
                                    ? 'bg-athlete-coral/20 border-athlete-coral text-ink'
                                    : 'bg-surface-1 border-border text-ink-muted hover:text-ink'
                                }`}
                              >
                                {r}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Fraction Duration */}
                        <div>
                          <label className="block text-xs font-medium text-ink-muted mb-1">
                            Durée d'une fraction
                          </label>
                          <select
                            value={repSeconds}
                            onChange={(e) => setRepSeconds(parseInt(e.target.value, 10))}
                            className="w-full px-2.5 py-1.5 rounded-tile bg-surface-1 border border-border text-xs text-ink focus:outline-none"
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
                      <div className="pt-2 border-t border-border">
                        <label className="block text-xs font-medium text-ink-muted mb-1.5">
                          Mode de guidage sur la montre
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setTargetMode('hr')}
                            className={`p-2 rounded-tile border text-left transition-all flex items-center gap-2 ${
                              targetMode === 'hr'
                                ? 'bg-athlete-cyan/15 border-athlete-cyan/40 text-athlete-cyan'
                                : 'bg-surface-1 border-border text-ink-muted'
                            }`}
                          >
                            <Heart className="w-4 h-4 text-athlete-cyan" />
                            <div>
                              <div className="text-xs font-bold">Zone Cardiaque</div>
                              <div className="text-micro text-ink-muted">{hrMin} - {hrMax} bpm</div>
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => setTargetMode('pace')}
                            className={`p-2 rounded-tile border text-left transition-all flex items-center gap-2 ${
                              targetMode === 'pace'
                                ? 'bg-athlete-coral/15 border-athlete-coral/40 text-athlete-coral'
                                : 'bg-surface-1 border-border text-ink-muted'
                            }`}
                          >
                            <Zap className="w-4 h-4 text-athlete-coral" />
                            <div>
                              <div className="text-xs font-bold">Allure Seuil</div>
                              <div className="text-micro text-ink-muted">{paceTarget} min/km</div>
                            </div>
                          </button>
                        </div>

                        {targetMode === 'pace' && (
                          <div className="mt-2.5 p-2.5 rounded-tile bg-surface-1 border border-athlete-coral/30 flex items-center justify-between">
                            <span className="text-xs font-medium text-ink">
                              Allure cible sur la montre :
                            </span>
                            <select
                              value={paceTarget}
                              onChange={(e) => setPaceTarget(e.target.value)}
                              className="px-2.5 py-1 rounded-tile bg-surface-2 border border-border text-xs font-bold text-ink focus:outline-none"
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
                      className="btn-ghost px-4 py-2 rounded-tile text-xs font-medium"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-4 py-2 rounded-tile bg-gradient-to-r from-athlete-coral to-athlete-coral-dim hover:from-athlete-coral/90 hover:to-athlete-coral-dim/90 text-xs font-bold text-white shadow-lg shadow-athlete-coral/20 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
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
