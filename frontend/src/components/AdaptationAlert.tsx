import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Watch, X, Loader2, AlertTriangle, ShieldAlert } from 'lucide-react';
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

  const trigger = (adaptation.trigger_reason || '').toLowerCase();
  const isHighPriority = trigger.includes('fatigue') || trigger.includes('charge') || trigger.includes('douleur') || trigger.includes('sommeil');
  const priorityBadge = isHighPriority ? 'CHARGE EXCESSIVE' : 'AJUSTEMENT PHYSIO';

  return (
    <AnimatePresence>
      <motion.div
        role="alert"
        initial={{ opacity: 0, y: -8, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.99 }}
        className="mb-5 p-4 rounded-card bg-surface-3 border border-duo/50 shadow-[0_0_25px_rgba(245,158,11,0.15)] text-ink flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div className="flex items-start gap-3.5 min-w-0">
          <div className="p-2.5 rounded-tile bg-duo/15 border border-duo/30 text-duo flex-shrink-0 mt-0.5">
            {isHighPriority ? <ShieldAlert className="w-5 h-5 text-duo animate-pulse" /> : <AlertTriangle className="w-5 h-5 text-duo" />}
          </div>

          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-micro font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-tile bg-duo/20 text-duo border border-duo/30">
                {priorityBadge}
              </span>
              <span className="text-xs font-bold text-ink tracking-tight">
                Alerte Télémétrique • Adaptation Proactive
              </span>
              <span className="text-micro font-mono text-ink-muted">
                [{adaptation.trigger_reason}]
              </span>
            </div>

            <p className="text-xs text-ink-muted leading-relaxed max-w-2xl">
              {adaptation.coach_advice ||
                `Séance prévue modifiée : ${adaptation.original_workout} ➔ ${adaptation.proposed_workout} pour respecter l'équilibre aérobie.`}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
          <button
            onClick={handleDismiss}
            disabled={loadingAction !== null}
            className="px-3 py-1.5 rounded-tile bg-surface-3 hover:bg-surface-3/70 border border-border-strong text-xs font-medium text-ink-muted hover:text-ink transition-colors flex items-center gap-1.5"
          >
            <X className="w-3.5 h-3.5" />
            Ignorer
          </button>

          <button
            onClick={handleApply}
            disabled={loadingAction !== null}
            className="px-3.5 py-1.5 rounded-tile bg-duo hover:bg-duo/80 text-xs font-bold text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.3)] transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
          >
            {loadingAction === 'apply' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Watch className="w-3.5 h-3.5" />
            )}
            Synchroniser Garmin
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AdaptationAlert;
