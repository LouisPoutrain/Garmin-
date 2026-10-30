import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Check,
  AlertTriangle,
  RefreshCw,
  Watch,
  Rocket,
  Loader2,
  CalendarRange,
  MessageSquare,
} from 'lucide-react';
import { api } from '../services/api';
import type { AthleteStatus } from '../types';
import { cn } from '../lib/utils';

interface StartPrepModalProps {
  open: boolean;
  onClose: () => void;
  onTalkToCoach: () => void;
  onPlanGenerated: () => void;
}

type SyncState = 'synced' | 'pending' | 'offline';

interface AthleteSync {
  id: 'louis' | 'clara';
  name: string;
  goal: string;
  state: SyncState;
  lastSync: string | null;
}

function formatLastSync(gmt: string | null): string {
  if (!gmt) return '—';
  const d = new Date(gmt);
  if (isNaN(d.getTime())) return gmt;
  return d.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export const StartPrepModal: React.FC<StartPrepModalProps> = ({
  open,
  onClose,
  onTalkToCoach,
  onPlanGenerated,
}) => {
  const [checking, setChecking] = useState(false);
  const [athletes, setAthletes] = useState<AthleteSync[]>([]);
  const [status, setStatus] = useState<AthleteStatus | null>(null);
  const [generating, setGenerating] = useState(false);
  const [planGenerated, setPlanGenerated] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  const checkSync = useCallback(async () => {
    setChecking(true);
    try {
      const [st, bio] = await Promise.all([api.getStatus('duo'), api.getBiometrics('duo')]);
      setStatus(st);
      const build = (id: 'louis' | 'clara'): AthleteSync => {
        const s = st[id];
        const b = bio[id];
        const connected = s?.connected ?? false;
        const syncedToday = b?.synced_today ?? false;
        const state: SyncState = !connected ? 'offline' : syncedToday ? 'synced' : 'pending';
        return {
          id,
          name: s?.name || (id === 'louis' ? 'Louis' : 'Clara'),
          goal: s?.goal || '',
          state,
          lastSync: b?.last_sync_gmt ?? null,
        };
      };
      setAthletes([build('louis'), build('clara')]);
    } catch {
      // conserve l'état précédent en cas d'erreur réseau
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setPlanGenerated(false);
      setGenError(null);
      checkSync();
    }
  }, [open, checkSync]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const bothSynced = athletes.length === 2 && athletes.every((a) => a.state === 'synced');

  const handleGenerate = async () => {
    setGenerating(true);
    setGenError(null);
    try {
      await api.generate3WeekPlan();
      setPlanGenerated(true);
      onPlanGenerated();
    } catch (e: any) {
      setGenError(e?.message || 'Impossible de générer le plan.');
    } finally {
      setGenerating(false);
    }
  };

  const stateBadge = (a: AthleteSync) => {
    if (a.state === 'synced')
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-pill bg-metric-good/15 text-metric-good border border-metric-good/30 text-sm font-semibold">
          <Check className="w-4 h-4" /> Synchronisée
        </span>
      );
    if (a.state === 'pending')
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-pill bg-metric-warn/15 text-metric-warn border border-metric-warn/30 text-sm font-semibold">
          <AlertTriangle className="w-4 h-4" /> En attente de synchro
        </span>
      );
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-pill bg-metric-bad/15 text-metric-bad border border-metric-bad/30 text-sm font-semibold">
        <X className="w-4 h-4" /> Non connecté
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Démarrer la préparation en duo">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-bg/70 backdrop-blur-sm" onClick={onClose} />

      {/* Card */}
      <div className="relative w-full max-w-2xl rounded-card bg-surface-1 border border-border shadow-[0_8px_40px_-12px_rgba(43,33,24,0.3)] overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-border bg-surface-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-micro font-mono uppercase tracking-wider text-ink-faint mb-1">
                Démarrage de la préparation
              </div>
              <h2 className="text-xl font-bold text-ink flex items-center gap-2">
                <Rocket className="w-5 h-5 text-athlete-cyan" />
                {bothSynced ? 'Prêt à construire le plan' : 'Vérification des montres'}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer"
              className="w-9 h-9 rounded-tile flex items-center justify-center text-ink-muted hover:text-ink hover:bg-surface-3 border border-border transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 min-h-[280px]">
          {/* ÉTAPE 1 — Synchro des montres */}
          {!bothSynced && (
            <div className="space-y-4">
              <p className="text-sm text-ink-muted leading-relaxed">
                Avant de construire le plan en duo, on vérifie que les deux montres sont bien
                synchronisées avec Garmin Connect. C'est la base pour charger le sommeil, la Body
                Battery et la charge réelle.
              </p>

              {checking && athletes.length === 0 ? (
                <div className="flex items-center justify-center gap-2 py-10 text-ink-muted text-sm">
                  <Loader2 className="w-5 h-5 animate-spin" /> Vérification en cours…
                </div>
              ) : (
                <div className="space-y-3">
                  {athletes.map((a) => (
                    <div
                      key={a.id}
                      className={cn(
                        'rounded-tile border p-4 flex items-center justify-between gap-3',
                        a.state === 'synced'
                          ? 'border-metric-good/30 bg-metric-good/5'
                          : a.state === 'pending'
                          ? 'border-metric-warn/30 bg-metric-warn/5'
                          : 'border-metric-bad/30 bg-metric-bad/5'
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={cn(
                            'w-10 h-10 rounded-tile flex items-center justify-center flex-shrink-0',
                            a.id === 'louis' ? 'bg-athlete-cyan/15 text-athlete-cyan' : 'bg-athlete-coral/15 text-athlete-coral'
                          )}
                        >
                          <Watch className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-ink">{a.name}</div>
                          <div className="text-micro text-ink-faint">
                            Dernière synchro : {formatLastSync(a.lastSync)}
                          </div>
                        </div>
                      </div>
                      {stateBadge(a)}
                    </div>
                  ))}
                </div>
              )}

              {!bothSynced && !checking && athletes.length > 0 && (
                <div className="rounded-tile border border-metric-warn/30 bg-metric-warn/5 p-4">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-metric-warn flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-ink leading-relaxed">
                      <p className="font-semibold mb-1">Pour synchroniser :</p>
                      <ol className="list-decimal pl-4 space-y-0.5 text-ink-muted">
                        <li>Ouvrez l'app <strong className="text-ink">Garmin Connect</strong> sur votre smartphone.</li>
                        <li>Assurez-vous que la montre est à proximité (Bluetooth activé).</li>
                        <li>Laissez la synchro se terminer, puis relancez la vérification.</li>
                      </ol>
                    </div>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={checkSync}
                disabled={checking}
                className="inline-flex items-center gap-2 text-sm font-semibold text-athlete-cyan hover:text-athlete-cyan-dim disabled:opacity-50 transition-colors"
              >
                <RefreshCw className={cn('w-4 h-4', checking && 'animate-spin')} />
                Vérifier à nouveau
              </button>
            </div>
          )}

          {/* ÉTAPE 2 — Construction du plan avec le coach */}
          {bothSynced && (
            <div className="space-y-4">
              <div className="rounded-tile border border-metric-good/30 bg-metric-good/5 p-5 flex items-start gap-3">
                <Check className="w-6 h-6 text-metric-good flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-ink mb-1">Montres synchronisées</p>
                  <p className="text-sm text-ink-muted leading-relaxed">
                    Les données de Louis et Clara sont à jour. On peut construire le plan
                    d'entraînement en duo et organiser les semaines.
                  </p>
                </div>
              </div>

              {status?.primary_goal && (
                <div className="rounded-tile border border-athlete-cyan/20 bg-athlete-cyan/5 p-4">
                  <div className="text-micro font-mono uppercase tracking-wider text-athlete-cyan mb-1">
                    Objectif commun
                  </div>
                  <p className="text-sm text-ink leading-relaxed">{status.primary_goal}</p>
                </div>
              )}

              <div className="rounded-tile border border-border bg-surface-2 p-5 space-y-3">
                <button
                  type="button"
                  onClick={onTalkToCoach}
                  className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-tile btn-primary text-sm font-semibold"
                >
                  <MessageSquare className="w-4 h-4" /> Construire le plan avec le coach
                </button>
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={generating || planGenerated}
                  className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-tile btn-ghost text-sm font-semibold disabled:opacity-60"
                >
                  {generating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Génération en cours…
                    </>
                  ) : planGenerated ? (
                    <>
                      <Check className="w-4 h-4" /> Plan 3 semaines généré
                    </>
                  ) : (
                    <>
                      <CalendarRange className="w-4 h-4" /> Générer le plan 3 semaines
                    </>
                  )}
                </button>
                {genError && (
                  <p className="text-sm text-metric-bad flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" /> {genError}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-surface-2 flex items-center justify-end gap-3">
          {bothSynced ? (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-tile btn-primary text-sm font-semibold"
            >
              C'est parti <Rocket className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-tile text-sm font-semibold text-ink-muted hover:text-ink hover:bg-surface-3 border border-border transition-colors"
            >
              Plus tard
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
