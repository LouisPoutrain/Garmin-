import React from 'react';
import { motion } from 'motion/react';
import {
  Zap,
  Moon,
  Heart,
  Smile,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';
import type { Biometrics } from '../types';
import { Skeleton } from './Skeleton';

interface BiometricsHubProps {
  biometrics: Biometrics | null;
  loading: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export const BiometricsHub: React.FC<BiometricsHubProps> = ({
  biometrics,
  loading,
  error,
  onRetry,
}) => {
  if (loading && !biometrics) {
    return (
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
        <Skeleton className="h-40 rounded-xl md:col-span-2 lg:col-span-1" />
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </section>
    );
  }

  if (error && !biometrics) {
    return (
      <div className="glass-panel p-4 rounded-xl mb-6 flex items-center justify-between border-rose-500/30 bg-rose-950/20">
        <div className="flex items-center gap-3">
          <RotateCcw className="w-4 h-4 text-rose-400" />
          <span className="text-xs text-rose-200">
            Erreur lors de la synchronisation biométrique : {error}
          </span>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-3 py-1 rounded-lg text-xs font-semibold bg-rose-900/50 hover:bg-rose-800 text-rose-200 border border-rose-500/30 transition-all"
          >
            Réessayer
          </button>
        )}
      </div>
    );
  }

  const isSynced = biometrics?.synced_today !== false && biometrics?.readiness_score !== null;
  const score = biometrics?.readiness_score ?? null;
  const level = biometrics?.readiness_level ?? (isSynced ? 'green' : 'pending');
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = score !== null ? circumference - (score / 100) * circumference : circumference;

  const levelConfigs = {
    pending: {
      badgeText: 'EN ATTENTE',
      badgeClass: 'bg-purple-950/60 text-purple-300 border-purple-500/30',
      strokeColor: '#A855F7',
      cardBorder: 'border-purple-500/30',
      title: 'Synchronisation requise',
      desc: biometrics?.summary_message || "Ouvrez l'application Garmin Connect ce matin.",
    },
    green: {
      badgeText: 'OPTIMAL',
      badgeClass: 'bg-cyan-950/60 text-cyan-300 border-cyan-500/30',
      strokeColor: '#06B6D4',
      cardBorder: 'border-cyan-500/30',
      title: 'Forme Optimale',
      desc: biometrics?.summary_message || 'Parfait pour séance de fractionné ou tempo.',
    },
    yellow: {
      badgeText: 'MODÉRÉ',
      badgeClass: 'bg-amber-950/60 text-amber-300 border-amber-500/30',
      strokeColor: '#F59E0B',
      cardBorder: 'border-amber-500/30',
      title: 'Récupération Partielle',
      desc: biometrics?.summary_message || 'Privilégier l’endurance fondamentale en Zone 2.',
    },
    red: {
      badgeText: 'REPOS',
      badgeClass: 'bg-rose-950/60 text-rose-300 border-rose-500/30',
      strokeColor: '#F43F5E',
      cardBorder: 'border-rose-500/30',
      title: 'Repos Conseillé',
      desc: biometrics?.summary_message || 'Réserves basses. Repos complet conseillé.',
    },
  };

  const currentConfig = levelConfigs[level] || levelConfigs.green;

  // Dedicated Duo Mode Biometrics Layout: Louis & Clara side-by-side
  if (biometrics?.athlete === 'duo') {
    const louis = biometrics.louis;
    const clara = biometrics.clara;

    return (
      <section className="space-y-3 mb-5">
        {/* Duo Synergy Banner */}
        <div className="p-3.5 rounded-xl bg-[#0E1320] border border-amber-500/25 flex flex-wrap items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="text-xl">🤝</span>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-2">
                <span>Équilibre Physiologique du Duo</span>
                <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-amber-400/10 text-amber-300 border border-amber-400/25">
                  Louis & Clara
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Surveillance de la charge d'entraînement et des réserves d'énergie pour coordonner les sorties communes.
              </p>
            </div>
          </div>
          {!clara?.garmin_connected && (
            <div className="text-[11px] font-mono text-purple-200 bg-purple-950/60 px-3 py-1.5 rounded-lg border border-purple-500/30 flex items-center gap-2">
              <span>Appairage Clara :</span>
              <code className="text-amber-300 font-bold">uv run garmin-coach --auth-clara</code>
            </div>
          )}
        </div>

        {/* 2 Comparison Cards: Louis on Left, Clara on Right */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* Louis Column */}
          <div className="p-4 rounded-xl bg-[#0E1320] border border-[#FF5E36]/25 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <div className="flex items-center gap-2">
                <span className="text-base">🏃‍♂️</span>
                <span className="text-xs font-bold text-[#FF7854] uppercase tracking-wider">Louis Poutrain</span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FF5E36]/15 text-[#FF7854] border border-[#FF5E36]/30">
                {louis?.readiness_score ? `Readiness ${louis.readiness_score}/100` : 'En attente synchro'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded-lg bg-slate-900/60 border border-white/5">
                <div className="text-[10px] text-slate-400">Body Battery</div>
                <div className="text-base font-bold font-mono text-orange-300">
                  {louis?.body_battery !== null && louis?.body_battery !== undefined ? `${louis.body_battery}%` : '--'}
                </div>
              </div>
              <div className="p-2 rounded-lg bg-slate-900/60 border border-white/5">
                <div className="text-[10px] text-slate-400">Sommeil</div>
                <div className="text-base font-bold font-mono text-purple-300">
                  {louis?.sleep_hours !== null && louis?.sleep_hours !== undefined ? `${louis.sleep_hours}h` : '--'}
                </div>
              </div>
              <div className="p-2 rounded-lg bg-slate-900/60 border border-white/5">
                <div className="text-[10px] text-slate-400">Stress</div>
                <div className="text-base font-bold font-mono text-sky-300">
                  {louis?.avg_stress !== null && louis?.avg_stress !== undefined ? `${louis.avg_stress}/100` : '--'}
                </div>
              </div>
            </div>
            {louis?.summary_message && (
              <p className="text-[11px] text-slate-400 leading-snug line-clamp-2 italic">
                "{louis.summary_message}"
              </p>
            )}
          </div>

          {/* Clara Column */}
          <div className="p-4 rounded-xl bg-[#0E1320] border border-purple-500/25 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <div className="flex items-center gap-2">
                <span className="text-base">🏃‍♀️</span>
                <span className="text-xs font-bold text-purple-300 uppercase tracking-wider">Clara</span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30">
                {clara?.readiness_score ? `Readiness ${clara.readiness_score}/100` : clara?.garmin_connected ? 'En attente synchro' : 'Non appairée'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded-lg bg-slate-900/60 border border-white/5">
                <div className="text-[10px] text-slate-400">Body Battery</div>
                <div className="text-base font-bold font-mono text-orange-300">
                  {clara?.body_battery !== null && clara?.body_battery !== undefined ? `${clara.body_battery}%` : '--'}
                </div>
              </div>
              <div className="p-2 rounded-lg bg-slate-900/60 border border-white/5">
                <div className="text-[10px] text-slate-400">Sommeil</div>
                <div className="text-base font-bold font-mono text-purple-300">
                  {clara?.sleep_hours !== null && clara?.sleep_hours !== undefined ? `${clara.sleep_hours}h` : '--'}
                </div>
              </div>
              <div className="p-2 rounded-lg bg-slate-900/60 border border-white/5">
                <div className="text-[10px] text-slate-400">Stress</div>
                <div className="text-base font-bold font-mono text-sky-300">
                  {clara?.avg_stress !== null && clara?.avg_stress !== undefined ? `${clara.avg_stress}/100` : '--'}
                </div>
              </div>
            </div>
            {clara?.summary_message && (
              <p className="text-[11px] text-slate-400 leading-snug line-clamp-2 italic">
                "{clara.summary_message}"
              </p>
            )}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">

      {/* Clara Unauthenticated Helper Banner */}
      {biometrics?.athlete === 'clara' && !biometrics?.garmin_connected && (
        <div className="col-span-full p-3.5 rounded-xl bg-purple-950/30 border border-purple-500/30 text-purple-200 flex flex-wrap items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="text-xl">🏃‍♀️</span>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-purple-300">
                Compte Garmin de Clara en attente de connexion
              </div>
              <div className="text-xs text-slate-300 mt-0.5">
                Pour afficher en direct les biométries de Clara et envoyer ses séances sur sa montre :
              </div>
            </div>
          </div>
          <code className="text-xs font-mono font-bold bg-slate-900 px-3 py-1.5 rounded-lg border border-purple-500/30 text-amber-300">
            uv run garmin-coach --auth-clara
          </code>
        </div>
      )}

      {/* 1. Training Readiness Card */}
      <div className={`glass-panel glass-panel-interactive p-4 rounded-xl flex flex-col justify-between ${currentConfig.cardBorder}`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold tracking-wider uppercase text-cyan-400">
            TRAINING READINESS
          </span>
          <span className={`text-[9.5px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${currentConfig.badgeClass}`}>
            {currentConfig.badgeText}
          </span>
        </div>

        <div className="flex items-center gap-4 my-2">
          <div className="relative w-20 h-20 flex-shrink-0 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 90 90">
              <circle
                cx="45"
                cy="45"
                r={radius}
                className="stroke-slate-800 fill-none"
                strokeWidth="6"
              />
              <motion.circle
                cx="45"
                cy="45"
                r={radius}
                className="fill-none transition-all duration-1000 ease-out"
                stroke={currentConfig.strokeColor}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-bold font-mono text-cyan-200">
                {score !== null ? score : '--'}
              </span>
              <span className="text-[9px] text-cyan-400 font-semibold -mt-1">/100</span>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-xs font-bold text-white mb-0.5">
              {currentConfig.title}
            </h3>
            <p className="text-[11px] text-slate-400 leading-snug line-clamp-2">
              {currentConfig.desc}
            </p>
          </div>
        </div>

        <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
          <span>Capteurs Garmin</span>
          <span className={`${isSynced ? 'text-cyan-400' : 'text-purple-400'} font-semibold flex items-center gap-1`}>
            {isSynced ? (
              <>
                <ShieldCheck className="w-3.5 h-3.5" /> Synchronisé
              </>
            ) : (
              <>
                <RotateCcw className="w-3.5 h-3.5" /> En attente
              </>
            )}
          </span>
        </div>
      </div>

      {/* 2. Body Battery Card */}
      <div className="glass-panel glass-panel-interactive p-4 rounded-xl flex flex-col justify-between border-orange-500/20">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold tracking-wider uppercase text-orange-400">
            BODY BATTERY
          </span>
          <div className="w-6 h-6 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
            <Zap className="w-3.5 h-3.5 fill-orange-400" />
          </div>
        </div>

        <div className="my-2">
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold font-mono text-orange-200">
              {biometrics?.body_battery !== null && biometrics?.body_battery !== undefined ? biometrics.body_battery : '--'}
            </span>
            <span className="text-xs font-semibold text-orange-400">%</span>
          </div>
          <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden mt-2 border border-white/5">
            <div
              style={{ width: `${biometrics?.body_battery ?? 0}%` }}
              className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all duration-500"
            />
          </div>
        </div>

        <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
          <span>Niveau : <strong className="text-orange-300 font-semibold">{biometrics?.body_battery !== null && biometrics?.body_battery !== undefined ? `${biometrics.body_battery}%` : 'N/D'}</strong></span>
          <span>Statut : <strong className="text-slate-300">{isSynced ? 'Actif' : '--'}</strong></span>
        </div>
      </div>

      {/* 3. Sommeil & VFC Card */}
      <div className="glass-panel glass-panel-interactive p-4 rounded-xl flex flex-col justify-between border-purple-500/20">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold tracking-wider uppercase text-purple-400">
            SOMMEIL & VFC
          </span>
          <div className="w-6 h-6 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Moon className="w-3.5 h-3.5" />
          </div>
        </div>

        <div className="my-2">
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold font-mono text-purple-200">
              {biometrics?.sleep_hours !== null && biometrics?.sleep_hours !== undefined ? biometrics.sleep_hours : '--'}
            </span>
            <span className="text-xs font-semibold text-purple-300">h</span>
          </div>
          <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden mt-2 border border-white/5">
            <div
              style={{ width: `${biometrics?.sleep_score ?? 0}%` }}
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-400 transition-all duration-500"
            />
          </div>
        </div>

        <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
          <span>Score : <strong className="text-purple-300 font-semibold">{biometrics?.sleep_score ? `${biometrics.sleep_score}/100` : '--'}</strong></span>
          <span className="flex items-center gap-1 text-slate-300">
            <Heart className="w-3 h-3 text-[#FF5E36] fill-[#FF5E36]" />
            FC Repos : <strong className="text-white font-mono">{biometrics?.resting_hr ? `${biometrics.resting_hr} bpm` : '--'}</strong>
          </span>
        </div>
      </div>

      {/* 4. Stress & Équilibre Card */}
      <div className="glass-panel glass-panel-interactive p-4 rounded-xl flex flex-col justify-between border-sky-500/20">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold tracking-wider uppercase text-sky-400">
            NIVEAU DE STRESS
          </span>
          <div className="w-6 h-6 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
            <Smile className="w-3.5 h-3.5" />
          </div>
        </div>

        <div className="my-2">
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold font-mono text-sky-300">
              {biometrics?.avg_stress !== null && biometrics?.avg_stress !== undefined ? biometrics.avg_stress : '--'}
            </span>
            <span className="text-xs font-semibold text-sky-400">/100</span>
          </div>
          <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden mt-2 border border-white/5">
            <div
              style={{ width: `${biometrics?.avg_stress ?? 0}%` }}
              className="h-full rounded-full bg-gradient-to-r from-sky-400 to-blue-500 transition-all duration-500"
            />
          </div>
        </div>

        <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
          <span>Zone : <strong className="text-sky-300 font-semibold">{isSynced ? 'Repos optimal' : 'En attente'}</strong></span>
          <span>Statut : <strong className="text-slate-200 font-mono">{isSynced ? 'Capté' : '--'}</strong></span>
        </div>
      </div>
    </section>
  );
};
