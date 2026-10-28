import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Watch, X, Loader2, Sparkles } from 'lucide-react';
import type { CoachingAdaptation } from '../types';

interface AdaptationAlertProps {
  adaptation: CoachingAdaptation | null;
  onApply: (adaptationId: number) => Promise<void>;
  onDismiss: (adaptationId: number) => Promise<void>;
}

export const AdaptationAlert: React.FC<AdaptationAlertProps> = ({
  adaptation,
  onApply,
  onDismiss,
}) => {
  const [loadingAction, setLoadingAction] = useState<'apply' | 'dismiss' | null>(null);

  if (!adaptation || adaptation.status !== 'pending') return null;

  const handleApply = async () => {
    if (!adaptation.id) return;
    setLoadingAction('apply');
    try {
      await onApply(adaptation.id);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleDismiss = async () => {
    if (!adaptation.id) return;
    setLoadingAction('dismiss');
    try {
      await onDismiss(adaptation.id);
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.98 }}
        className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-slate-900/90 to-red-500/15 border border-amber-500/40 shadow-xl shadow-amber-500/10 text-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div className="flex items-start gap-3.5 min-w-0">
          <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 flex-shrink-0 mt-0.5">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>

          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-amber-300">
                Adaptation Proactive du Coach
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-900 border border-amber-500/30 text-amber-200">
                {adaptation.trigger_reason}
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
              {adaptation.coach_advice ||
                `Séance prévue modifiée : ${adaptation.original_workout} ➔ ${adaptation.proposed_workout} pour préserver vos tendons.`}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
          <button
            onClick={handleDismiss}
            disabled={loadingAction !== null}
            className="px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-white/10 text-xs font-medium text-slate-400 hover:text-white transition-colors flex items-center gap-1.5"
          >
            <X className="w-3.5 h-3.5" />
            Ignorer
          </button>

          <button
            onClick={handleApply}
            disabled={loadingAction !== null}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-xs font-bold text-slate-950 shadow-md shadow-amber-500/20 transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
          >
            {loadingAction === 'apply' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Watch className="w-3.5 h-3.5" />
            )}
            Adapter sur Garmin
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
