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
                className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md"
              />
            </Dialog.Overlay>

            <Dialog.Content asChild>
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                className="fixed inset-0 z-50 m-auto max-w-lg h-fit max-h-[92vh] overflow-y-auto glass-panel p-6 rounded-3xl border border-white/15 shadow-2xl flex flex-col focus:outline-none"
              >
                {/* Header */}
                <div className="flex items-start justify-between pb-4 border-b border-white/10 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500/20 to-[#FF5E36]/20 border border-purple-500/30 flex items-center justify-center text-xl">
                      🥏
                    </div>
                    <div>
                      <Dialog.Title className="text-base font-bold text-white tracking-wide">
                        Valider la séance sur Garmin
                      </Dialog.Title>
                      <p className="text-xs text-slate-400">
                        {day.full_date_fr || `${day.day} ${day.date_short || ''}`}
                      </p>
                    </div>
                  </div>
                  <Dialog.Close asChild>
                    <button
                      onClick={onClose}
                      className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </Dialog.Close>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
                      {error}
                    </div>
                  )}

                  {/* 1. Activity Name */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-purple-400" />
                      Nom de l'activité
                    </label>
                    <input
                      type="text"
                      value={activityName}
                      onChange={(e) => setActivityName(e.target.value)}
                      required
                      placeholder="Ex: Entraînement Ultimate Frisbee (Club)"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-purple-500/50"
                    />
                  </div>

                  {/* 2. Duration & Presets */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-cyan-400" />
                        Durée de la séance
                      </label>
                      <span className="text-xs font-mono font-bold text-cyan-300">
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
                          className={`text-xs px-2.5 py-1 rounded-lg border font-mono transition-all ${
                            durationMinutes === preset
                              ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-200 font-bold shadow-sm'
                              : 'bg-slate-900/60 border-white/10 text-slate-400 hover:text-white hover:border-white/20'
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
                      className="w-full mt-1.5 px-3.5 py-2 rounded-xl bg-slate-900/80 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-cyan-500/50"
                    />
                  </div>

                  {/* 3. Start Time */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      Heure de début (approximative)
                    </label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-900/80 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-amber-500/50"
                    />
                  </div>

                  {/* 4. Description & Notes */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-[#38BDF8]" />
                      Ressenti & Description (enregistré sur Garmin)
                    </label>
                    <textarea
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Ex: Bonne intensité sur les changements de direction, travail de la zone, aucune douleur aux jambes."
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-900/80 border border-white/10 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-[#38BDF8]/50 resize-none"
                    />
                  </div>

                  {/* 5. Garmin Sync Switch */}
                  <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-950/30 to-cyan-950/30 border border-purple-500/25 space-y-2">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={pushToGarmin}
                        onChange={(e) => setPushToGarmin(e.target.checked)}
                        className="mt-0.5 w-4 h-4 rounded text-cyan-500 focus:ring-0 bg-slate-900 border-white/20 accent-[#FF5E36] cursor-pointer"
                      />
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-white flex items-center gap-1.5">
                          <Watch className="w-3.5 h-3.5 text-cyan-400" />
                          Mettre sur ma montre Garmin Connect
                        </span>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
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
                      className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-medium border border-white/10 transition-colors"
                    >
                      Annuler
                    </button>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#FF5E36] to-[#E11D48] hover:opacity-95 text-white text-xs font-bold transition-all shadow-[0_0_15px_-3px_rgba(255,94,54,0.4)] flex items-center gap-2 disabled:opacity-50"
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
