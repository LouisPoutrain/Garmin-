import React, { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Watch,
  Clock,
  FileText,
  Tag,
  Loader2,
  Sparkles,
  Disc,
} from 'lucide-react';
import type { DayPlan, ManualSessionValidationParams } from '../types';

interface ManualSessionModalProps {
  day: DayPlan | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (params: ManualSessionValidationParams) => Promise<void>;
}

export const ManualSessionModal: React.FC<ManualSessionModalProps> = ({
  day,
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [activityName, setActivityName] = useState('Entraînement Ultimate Frisbee (Club)');
  const [durationMinutes, setDurationMinutes] = useState(90);
  const [startTime, setStartTime] = useState('19:30');
  const [description, setDescription] = useState('');
  const [pushToGarmin, setPushToGarmin] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync default values when day changes
  useEffect(() => {
    if (day) {
      const isUltimate = day.sport === 'ultimate' || day.type.toLowerCase().includes('ultimate');
      setActivityName(
        isUltimate ? 'Entraînement Ultimate Frisbee (Club)' : day.type || 'Séance sportive'
      );

      // Extract duration from day.duration (e.g. "90 min" -> 90)
      const numMatch = day.duration?.match(/\d+/);
      setDurationMinutes(numMatch ? parseInt(numMatch[0], 10) : 90);
      setDescription('');
      setStartTime('19:30');
      setPushToGarmin(true);
      setError(null);
    }
  }, [day, isOpen]);

  if (!day) return null;

  const durationPresets = [60, 75, 90, 105, 120];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!day.date_iso) return;

    setSubmitting(true);
    setError(null);

    try {
      await onSubmit({
        date_iso: day.date_iso,
        sport: day.sport || 'ultimate',
        completed: true,
        duration_minutes: durationMinutes,
        activity_name: activityName.trim() || 'Entraînement Ultimate Frisbee',
        description: description.trim(),
        start_time: startTime,
        push_to_garmin: pushToGarmin,
        note: description.trim(),
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || "Erreur lors de l'enregistrement de la séance");
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
                className="fixed inset-0 z-50 bg-bg/80 backdrop-blur-md"
              />
            </Dialog.Overlay>

            <Dialog.Content asChild>
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                className="fixed inset-0 z-50 m-auto max-w-lg h-fit max-h-[92vh] overflow-y-auto glass-panel p-6 rounded-card border border-border-strong shadow-2xl flex flex-col focus:outline-none"
              >
                {/* Header */}
                <div className="flex items-start justify-between pb-4 border-b border-border mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-tile bg-gradient-to-br from-athlete-cyan/20 to-athlete-coral/20 border border-athlete-cyan/30 flex items-center justify-center text-athlete-cyan">
                      <Disc className="w-6 h-6" aria-label="Ultimate Frisbee" />
                    </div>
                    <div>
                      <Dialog.Title className="text-title font-heading font-bold text-ink tracking-wide">
                        Valider la séance sur Garmin
                      </Dialog.Title>
                      <p className="text-xs text-ink-muted">
                        {day.full_date_fr || `${day.day} ${day.date_short || ''}`}
                      </p>
                    </div>
                  </div>
                  <Dialog.Close asChild>
                    <button
                      onClick={onClose}
                      aria-label="Fermer"
                      className="p-1.5 rounded-pill hover:bg-surface-3 text-ink-muted hover:text-ink transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </Dialog.Close>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <div className="p-3 rounded-tile bg-athlete-coral/15 border border-athlete-coral/30 text-athlete-coral text-xs">
                      {error}
                    </div>
                  )}

                  {/* 1. Activity Name */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-ink flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-athlete-cyan" />
                      Nom de l'activité
                    </label>
                    <input
                      type="text"
                      value={activityName}
                      onChange={(e) => setActivityName(e.target.value)}
                      required
                      placeholder="Ex: Entraînement Ultimate Frisbee (Club)"
                      className="w-full px-3.5 py-2.5 rounded-tile bg-surface-2 border border-border text-ink text-xs placeholder:text-ink-faint focus:outline-none focus:border-athlete-cyan/50"
                    />
                  </div>

                  {/* 2. Duration & Presets */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-ink flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-athlete-cyan" />
                        Durée de la séance
                      </label>
                      <span className="text-xs font-mono font-bold text-athlete-cyan">
                        {durationMinutes} min ({Math.floor(durationMinutes / 60)}h
                        {durationMinutes % 60 ? `${durationMinutes % 60}m` : ''})
                      </span>
                    </div>

                    {/* Presets Chips */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {durationPresets.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setDurationMinutes(preset)}
                          className={`text-xs px-2.5 py-1 rounded-tile border font-mono transition-all ${
                            durationMinutes === preset
                              ? 'bg-athlete-cyan/20 border-athlete-cyan/50 text-athlete-cyan font-bold shadow-sm'
                              : 'bg-surface-2/60 border-border text-ink-muted hover:text-ink hover:border-border-strong'
                          }`}
                        >
                          {preset} min
                        </button>
                      ))}
                    </div>

                    {/* Number input for custom duration */}
                    <input
                      type="number"
                      min={10}
                      max={360}
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(Number(e.target.value))}
                      className="w-full mt-1.5 px-3.5 py-2 rounded-tile bg-surface-2 border border-border text-ink text-xs font-mono focus:outline-none focus:border-athlete-cyan/50"
                    />
                  </div>

                  {/* 3. Start Time */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-ink flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-duo" />
                      Heure de début (approximative)
                    </label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-tile bg-surface-2 border border-border text-ink text-xs font-mono focus:outline-none focus:border-duo/50"
                    />
                  </div>

                  {/* 4. Description & Notes */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-ink flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-athlete-cyan" />
                      Ressenti & Description (enregistré sur Garmin)
                    </label>
                    <textarea
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Ex: Bonne intensité sur les changements de direction, travail de la zone, aucune douleur aux jambes."
                      className="w-full px-3.5 py-2 rounded-tile bg-surface-2 border border-border text-ink text-xs placeholder:text-ink-faint focus:outline-none focus:border-athlete-cyan/50 resize-none"
                    />
                  </div>

                  {/* 5. Garmin Sync Switch */}
                  <div className="p-3.5 rounded-card bg-gradient-to-r from-surface-2/30 to-athlete-cyan/10 border border-athlete-cyan/25 space-y-2">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={pushToGarmin}
                        onChange={(e) => setPushToGarmin(e.target.checked)}
                        className="mt-0.5 w-4 h-4 rounded text-athlete-cyan focus:ring-0 bg-surface-2 border-border-strong accent-athlete-coral cursor-pointer"
                      />
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-ink flex items-center gap-1.5">
                          <Watch className="w-3.5 h-3.5 text-athlete-cyan" />
                          Mettre sur ma montre Garmin Connect
                        </span>
                        <p className="text-xs text-ink-muted leading-relaxed">
                          Crée une activité officielle de type <strong>Ultimate Disc</strong> synchronisée avec votre montre Garmin et l'application mobile Connect (avec calcul des calories dépensées).
                        </p>
                      </div>
                    </label>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-2 flex items-center justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={onClose}
                      disabled={submitting}
                      className="btn-ghost px-4 py-2 rounded-tile text-xs font-medium"
                    >
                      Annuler
                    </button>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-5 py-2 rounded-tile bg-gradient-to-r from-athlete-coral to-athlete-coral-dim hover:opacity-95 text-white text-xs font-bold transition-all shadow-[0_0_12px_-2px_rgba(194,65,122,0.30)] flex items-center gap-2 disabled:opacity-50"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Envoi vers Garmin...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          {pushToGarmin ? 'Valider & Synchroniser Garmin' : 'Valider la séance'}
                        </>
                      )}
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
