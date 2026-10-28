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
      color: 'text-[#F43F5E]',
      bgColor: 'bg-[#F43F5E]/10',
      borderColor: 'border-[#F43F5E]/30',
      emptyText: 'Aucune blessure active signalée.',
      action: (memory?.facts?.injuries_and_sensitivities?.length ?? 0) > 0 ? (
        <button
          onClick={onClearInjuries}
          className="text-[10px] font-mono font-bold text-[#00A7E1] hover:text-white bg-[#00A7E1]/15 hover:bg-[#00A7E1]/30 px-2 py-0.5 rounded-md border border-[#00A7E1]/30 transition-colors"
        >
          Tout marquer guéri
        </button>
      ) : null,
    },
    {
      key: 'preferences' as const,
      label: 'Préférences & Style',
      icon: Compass,
      color: 'text-[#00A7E1]',
      bgColor: 'bg-[#00A7E1]/10',
      borderColor: 'border-[#00A7E1]/30',
      emptyText: 'Aucune préférence enregistrée.',
    },
    {
      key: 'active_goals' as const,
      label: 'Objectifs Actifs',
      icon: Target,
      color: 'text-[#F59E0B]',
      bgColor: 'bg-[#F59E0B]/10',
      borderColor: 'border-[#F59E0B]/30',
      emptyText: 'Aucun objectif secondaire.',
    },
    {
      key: 'schedule_constraints' as const,
      label: "Contraintes d'Agenda",
      icon: Calendar,
      color: 'text-[#A855F7]',
      bgColor: 'bg-[#A855F7]/10',
      borderColor: 'border-[#A855F7]/30',
      emptyText: "Aucune contrainte d'agenda signalée.",
    },
  ];

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
                className="fixed inset-0 z-50 bg-[#070A10]/85 backdrop-blur-md"
              />
            </Dialog.Overlay>

            {/* Modal Dialog Content */}
            <Dialog.Content asChild>
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                className="fixed inset-0 z-50 m-auto max-w-3xl max-h-[90vh] overflow-y-auto bg-[#0E131D] p-6 rounded-3xl border border-white/[0.08] shadow-2xl flex flex-col focus:outline-none text-slate-200"
              >
                {/* Header */}
                <div className="flex items-start justify-between pb-4 border-b border-white/[0.08] mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#00A7E1]/15 border border-[#00A7E1]/30 flex items-center justify-center text-[#00A7E1] shadow-[0_0_15px_rgba(0,167,225,0.2)]">
                      <Brain className="w-5 h-5 text-[#00A7E1]" />
                    </div>
                    <div>
                      <Dialog.Title className="text-base font-bold text-white tracking-tight">
                        Mémoire & Télémétrie Historique de l'Athlète
                      </Dialog.Title>
                      <Dialog.Description className="text-xs font-mono text-slate-400">
                        Analyse sur 100 activités réelles Garmin Connect et apprentissage adaptatif
                      </Dialog.Description>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {onResetMemory && (
                      <button
                        type="button"
                        onClick={onResetMemory}
                        className="px-2.5 py-1.5 rounded-xl text-[11px] font-mono text-slate-400 hover:text-[#F43F5E] hover:bg-[#F43F5E]/10 border border-white/[0.08] hover:border-[#F43F5E]/30 transition-all flex items-center gap-1.5"
                        title="Réinitialiser la mémoire du coach à un état 100% neutre"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Reset Neutre</span>
                      </button>
                    )}
                    <Dialog.Close asChild>
                      <button
                        className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-[#171D2A] transition-colors focus-visible:outline-none"
                        aria-label="Fermer"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </Dialog.Close>
                  </div>
                </div>

                {/* Section 1: Lifetime Garmin Analytics Banner */}
                <div className="mb-6">
                  <h4 className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-[#00A7E1]" />
                    Télémétrie Historique Cumulée
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono">
                    <div className="p-3 rounded-xl bg-[#121722] border border-white/[0.05]">
                      <span className="text-[10px] uppercase font-bold text-slate-400">
                        Volume Total
                      </span>
                      <div className="text-base font-bold text-white mt-0.5">
                        {history?.lifetime_volume_km || 802.7} km
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {history?.total_activities_analyzed || 100} séances
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-[#121722] border border-white/[0.05]">
                      <span className="text-[10px] uppercase font-bold text-[#00A7E1]">
                        Course à Pied
                      </span>
                      <div className="text-base font-bold text-[#00A7E1] mt-0.5">
                        {history?.running_profile?.total_km || 504.7} km
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {history?.running_profile?.sessions || 71} sorties • {history?.running_profile?.average_pace || '5:46'}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-[#121722] border border-white/[0.05]">
                      <span className="text-[10px] uppercase font-bold text-[#A855F7]">
                        Record Sortie
                      </span>
                      <div className="text-base font-bold text-[#A855F7] mt-0.5 truncate">
                        29.95 km
                      </div>
                      <span className="text-[10px] text-slate-400 truncate block">
                        {history?.running_profile?.longest_run || 'Panzoult (06/07/2025)'}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-[#121722] border border-white/[0.05]">
                      <span className="text-[10px] uppercase font-bold text-[#F59E0B]">
                        Cyclisme Foncier
                      </span>
                      <div className="text-base font-bold text-[#F59E0B] mt-0.5">
                        {history?.cycling_profile?.total_km || 184.2} km
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {history?.cycling_profile?.sessions || 8} sorties • Max 60.5 km
                      </span>
                    </div>
                  </div>
                </div>

                {/* Section 2: Memory Categories Grid */}
                <div className="mb-6 space-y-3.5">
                  <h4 className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Brain className="w-3.5 h-3.5 text-[#00A7E1]" />
                    Consignes & Contexte IA Mémorisés
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {categories.map((cat) => {
                      const items = memory?.facts?.[cat.key] || [];
                      const Icon = cat.icon;

                      return (
                        <div
                          key={cat.key}
                          className="p-3.5 rounded-2xl bg-[#121722] border border-white/[0.06] space-y-2.5 flex flex-col justify-between"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-6 h-6 rounded-lg ${cat.bgColor} ${cat.borderColor} border flex items-center justify-center ${cat.color}`}
                              >
                                <Icon className="w-3.5 h-3.5" />
                              </div>
                              <span className="text-xs font-bold text-white">
                                {cat.label}
                              </span>
                            </div>
                            {cat.action}
                          </div>

                          <div className="space-y-1.5 min-h-[50px]">
                            {items.length === 0 ? (
                              <p className="text-[11px] text-slate-500 italic py-2">
                                {cat.emptyText}
                              </p>
                            ) : (
                              items.map((item, idx) => (
                                <motion.div
                                  key={idx}
                                  initial={{ opacity: 0, x: -4 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  className="flex items-center justify-between gap-2 p-1.5 px-2.5 rounded-lg bg-[#0F141F] border border-white/[0.04] text-xs text-slate-200 group"
                                >
                                  <span className="truncate flex-1 font-mono text-[11px]">{item}</span>
                                  <button
                                    onClick={() => onRemoveFact(cat.key, item)}
                                    className="text-slate-500 hover:text-[#F43F5E] p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Oublier ce fait"
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
                <div className="p-3.5 rounded-2xl bg-[#121722] border border-white/[0.06] mt-auto">
                  <h4 className="text-xs font-bold text-white mb-2">
                    Ajouter une consigne manuellement
                  </h4>
                  <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-2 font-mono">
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      className="text-xs rounded-xl bg-[#0F141F] border border-white/[0.08] px-3 py-2 text-slate-200 focus:outline-none focus:border-[#00A7E1]/50"
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
                      className="flex-1 text-xs rounded-xl bg-[#0F141F] border border-white/[0.08] px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-[#00A7E1]/50"
                    />

                    <button
                      type="submit"
                      disabled={!newFactText.trim() || isSubmitting}
                      className="px-4 py-2 rounded-xl text-xs font-semibold btn-telemetry-cyan disabled:opacity-50 flex items-center justify-center gap-1.5 transition-all"
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
