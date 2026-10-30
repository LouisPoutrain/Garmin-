import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { motion, AnimatePresence } from 'motion/react';
import {
  Brain,
  X,
  Plus,
  Trash2,
  AlertTriangle,
  Target,
  Calendar,
  Compass,
  Award,
  RotateCcw,
} from 'lucide-react';
import type { AthleteMemory, HistoryProfile } from '../types';

interface MemoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memory: AthleteMemory | null;
  history: HistoryProfile | null;
  onAddFact: (category: string, fact: string) => Promise<void>;
  onRemoveFact: (category: string, fact: string) => Promise<void>;
  onClearInjuries: () => void;
  onResetMemory?: () => Promise<void>;
}

export const MemoryModal: React.FC<MemoryModalProps> = ({
  open,
  onOpenChange,
  memory,
  history,
  onAddFact,
  onRemoveFact,
  onClearInjuries,
  onResetMemory,
}) => {
  const [newCategory, setNewCategory] = useState('preferences');
  const [newFactText, setNewFactText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFactText.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onAddFact(newCategory, newFactText.trim());
      setNewFactText('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const categories = [
    {
      key: 'injuries_and_sensitivities' as const,
      label: 'Santé & Alertes Blessures',
      icon: AlertTriangle,
      color: 'text-athlete-coral',
      bgColor: 'bg-athlete-coral/10',
      borderColor: 'border-athlete-coral/30',
      emptyText: 'Aucune blessure active signalée.',
      action: (memory?.facts?.injuries_and_sensitivities?.length ?? 0) > 0 ? (
        <button
          onClick={onClearInjuries}
          className="text-micro font-mono font-bold text-athlete-cyan hover:text-ink bg-athlete-cyan/15 hover:bg-athlete-cyan/30 px-2 py-0.5 rounded-tile border border-athlete-cyan/30 transition-colors"
        >
          Tout marquer guéri
        </button>
      ) : null,
    },
    {
      key: 'preferences' as const,
      label: 'Préférences & Style',
      icon: Compass,
      color: 'text-athlete-cyan',
      bgColor: 'bg-athlete-cyan/10',
      borderColor: 'border-athlete-cyan/30',
      emptyText: 'Aucune préférence enregistrée.',
    },
    {
      key: 'active_goals' as const,
      label: 'Objectifs Actifs',
      icon: Target,
      color: 'text-duo',
      bgColor: 'bg-duo/10',
      borderColor: 'border-duo/30',
      emptyText: 'Aucun objectif secondaire.',
    },
    {
      key: 'schedule_constraints' as const,
      label: "Contraintes d'Agenda",
      icon: Calendar,
      color: 'text-duo',
      bgColor: 'bg-duo/10',
      borderColor: 'border-duo/30',
      emptyText: "Aucune contrainte d'agenda signalée.",
    },
  ];

  // Record de plus longue sortie : "29.95 km — Panzhoult (06/07/2025)"
  const longestRun = history?.running_profile?.longest_run ?? '';
  const longestRunValue = longestRun.split(' ')[0] || '';
  const longestRunSub = longestRun.includes('—')
    ? longestRun.split('—').slice(1).join('—').trim()
    : longestRun;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            {/* Backdrop */}
            <Dialog.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-bg/85 backdrop-blur-md"
              />
            </Dialog.Overlay>

            {/* Modal Dialog Content */}
            <Dialog.Content asChild>
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                className="fixed inset-0 z-50 m-auto max-w-3xl max-h-[90vh] overflow-y-auto bg-surface-1 p-6 rounded-card border border-border shadow-2xl flex flex-col focus:outline-none text-ink"
              >
                {/* Header */}
                <div className="flex items-start justify-between pb-4 border-b border-border mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-tile bg-athlete-cyan/15 border border-athlete-cyan/30 flex items-center justify-center text-athlete-cyan shadow-[0_0_12px_-2px_rgba(37,99,235,0.30)]">
                      <Brain className="w-5 h-5 text-athlete-cyan" />
                    </div>
                    <div>
                      <Dialog.Title className="text-base font-bold text-ink tracking-tight">
                        Mémoire & Télémétrie Historique de l'Athlète
                      </Dialog.Title>
                      <Dialog.Description className="text-xs font-mono text-ink-muted">
                        Analyse sur {history?.total_activities_analyzed ?? '—'} activités réelles Garmin Connect et apprentissage adaptatif
                      </Dialog.Description>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {onResetMemory && (
                      <button
                        type="button"
                        onClick={onResetMemory}
                        className="px-2.5 py-1.5 rounded-tile text-label font-mono text-ink-muted hover:text-athlete-coral hover:bg-athlete-coral/10 border border-border hover:border-athlete-coral/30 transition-all flex items-center gap-1.5"
                        title="Réinitialiser la mémoire du coach à un état 100% neutre"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Reset Neutre</span>
                      </button>
                    )}
                    <Dialog.Close asChild>
                      <button
                        className="p-1.5 rounded-tile text-ink-muted hover:text-ink hover:bg-surface-3 transition-colors focus-visible:outline-none"
                        aria-label="Fermer"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </Dialog.Close>
                  </div>
                </div>

                {/* Section 1: Lifetime Garmin Analytics Banner */}
                <div className="mb-6">
                  <h4 className="text-micro font-mono font-bold uppercase tracking-wider text-ink-muted mb-2 flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-athlete-cyan" />
                    Télémétrie Historique Cumulée
                  </h4>
                  {history ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono">
                      <div className="p-3 rounded-tile bg-surface-2 border border-border">
                        <span className="text-micro uppercase font-bold text-ink-muted">
                          Volume Total
                        </span>
                        <div className="text-hero font-bold text-ink mt-0.5">
                          {history.lifetime_volume_km} km
                        </div>
                        <span className="text-micro text-ink-muted">
                          {history.total_activities_analyzed} séances
                        </span>
                      </div>

                      <div className="p-3 rounded-tile bg-surface-2 border border-border">
                        <span className="text-micro uppercase font-bold text-athlete-cyan">
                          Course à Pied
                        </span>
                        <div className="text-hero font-bold text-athlete-cyan mt-0.5">
                          {history.running_profile.total_km} km
                        </div>
                        <span className="text-micro text-ink-muted">
                          {history.running_profile.sessions} sorties • {history.running_profile.average_pace}
                        </span>
                      </div>

                      <div className="p-3 rounded-tile bg-surface-2 border border-border">
                        <span className="text-micro uppercase font-bold text-athlete-cyan">
                          Record Sortie
                        </span>
                        <div className="text-hero font-bold text-athlete-cyan mt-0.5 truncate">
                          {longestRunValue} km
                        </div>
                        <span className="text-micro text-ink-muted truncate block">
                          {longestRunSub}
                        </span>
                      </div>

                      <div className="p-3 rounded-tile bg-surface-2 border border-border">
                        <span className="text-micro uppercase font-bold text-duo">
                          Cyclisme Foncier
                        </span>
                        <div className="text-hero font-bold text-duo mt-0.5">
                          {history.cycling_profile.total_km} km
                        </div>
                        <span className="text-micro text-ink-muted">
                          {history.cycling_profile.sessions} sorties • Max {history.cycling_profile.max_distance_km} km
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-tile bg-surface-2 border border-border font-mono">
                      <span className="text-label text-ink-muted">
                        {memory ? "Aucune donnée d'historique" : "Chargement de l'historique…"}
                      </span>
                    </div>
                  )}
                </div>

                {/* Section 2: Memory Categories Grid */}
                <div className="mb-6 space-y-3.5">
                  <h4 className="text-micro font-mono font-bold uppercase tracking-wider text-ink-muted flex items-center gap-1.5">
                    <Brain className="w-3.5 h-3.5 text-athlete-cyan" />
                    Consignes & Contexte IA Mémorisés
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {categories.map((cat) => {
                      const items = memory?.facts?.[cat.key] || [];
                      const Icon = cat.icon;

                      return (
                        <div
                          key={cat.key}
                          className="p-3.5 rounded-card bg-surface-2 border border-border space-y-2.5 flex flex-col justify-between"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-6 h-6 rounded-tile ${cat.bgColor} ${cat.borderColor} border flex items-center justify-center ${cat.color}`}
                              >
                                <Icon className="w-3.5 h-3.5" />
                              </div>
                              <span className="text-xs font-bold text-ink">
                                {cat.label}
                              </span>
                            </div>
                            {cat.action}
                          </div>

                          <div className="space-y-1.5 min-h-[50px]">
                            {items.length === 0 ? (
                              <p className="text-label text-ink-faint italic py-2">
                                {cat.emptyText}
                              </p>
                            ) : (
                              items.map((item, idx) => (
                                <motion.div
                                  key={idx}
                                  initial={{ opacity: 0, x: -4 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  className="flex items-center justify-between gap-2 p-1.5 px-2.5 rounded-tile bg-surface-2 border border-border text-xs text-ink group"
                                >
                                  <span className="truncate flex-1 font-mono text-label">{item}</span>
                                  <button
                                    onClick={() => onRemoveFact(cat.key, item)}
                                    className="text-ink-faint hover:text-athlete-coral p-0.5 rounded opacity-0 group-hover:opacity-100 focus-visible:opacity-100 group-focus-within:opacity-100 transition-opacity"
                                    aria-label={`Oublier ce fait : ${item}`}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </motion.div>
                              ))
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Section 3: Add Fact Form */}
                <div className="p-3.5 rounded-card bg-surface-2 border border-border mt-auto">
                  <h4 className="text-xs font-bold text-ink mb-2">
                    Ajouter une consigne manuellement
                  </h4>
                  <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-2 font-mono">
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      className="text-xs rounded-tile bg-surface-2 border border-border px-3 py-2 text-ink focus:outline-none focus:border-athlete-cyan/50"
                    >
                      <option value="preferences">Préférence</option>
                      <option value="injuries_and_sensitivities">Alerte Santé / Douleur</option>
                      <option value="active_goals">Objectif</option>
                      <option value="schedule_constraints">Contrainte Planning</option>
                    </select>

                    <input
                      type="text"
                      value={newFactText}
                      onChange={(e) => setNewFactText(e.target.value)}
                      placeholder="Ex: Je préfère courir le matin à jeun..."
                      className="flex-1 text-xs rounded-tile bg-surface-2 border border-border px-3 py-2 text-ink placeholder:text-ink-faint focus:outline-none focus:border-athlete-cyan/50"
                    />

                    <button
                      type="submit"
                      disabled={!newFactText.trim() || isSubmitting}
                      className="px-4 py-2 rounded-tile text-xs font-semibold btn-primary disabled:opacity-50 flex items-center justify-center gap-1.5 transition-all"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[2.2]" />
                      <span>Enregistrer</span>
                    </button>
                  </form>
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
};
