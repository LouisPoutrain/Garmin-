import React from 'react';
import {
  Zap,
  Brain,
  HeartHandshake,
  Activity,
} from 'lucide-react';
import type { AthleteStatus, AthleteId } from '../types';

interface HeaderProps {
  status: AthleteStatus | null;
  loading?: boolean;
  currentAthlete: AthleteId;
  onSelectAthlete: (athlete: AthleteId) => void;
  onOpenMemory: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  status,
  currentAthlete,
  onSelectAthlete,
  onOpenMemory,
}) => {
  const isDuo = currentAthlete === 'duo';
  const isClara = currentAthlete === 'clara';

  const athleteName = isDuo
    ? 'Louis & Clara'
    : isClara
    ? 'Clara'
    : (status?.athlete_name || 'Louis Poutrain');

  const goalText = isDuo
    ? "Duo : Louis < 40' & Clara < 50'"
    : isClara
    ? 'Cible 10 km < 50 min'
    : (status?.primary_goal ? "Cible 10 km < 40 min" : 'Endurance & VO2 Max');

  return (
    <header className="mb-5">
      <div className="telemetry-card rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-slate-200">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#171D2A] border border-white/[0.08] flex items-center justify-center text-[#00A7E1] shadow-[0_0_12px_rgba(0,167,225,0.2)]">
            {isDuo ? (
              <HeartHandshake className="w-4 h-4 text-[#F59E0B]" />
            ) : isClara ? (
              <Activity className="w-4 h-4 text-[#F43F5E]" />
            ) : (
              <Zap className="w-4 h-4 text-[#00A7E1] fill-[#00A7E1]" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold tracking-tight text-white font-mono">
                GARMIN{' '}
                <span className={isDuo ? 'text-[#F59E0B]' : isClara ? 'text-[#F43F5E]' : 'text-[#00A7E1]'}>
                  {isDuo ? 'DUO TELEMETRY' : isClara ? 'CLARA TELEMETRY' : 'LOUIS TELEMETRY'}
                </span>
              </h1>
              <span className="text-[9px] font-mono uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-[#171D2A] text-slate-400 border border-white/[0.08]">
                {isDuo ? 'DUO 10K PRO' : 'POLARISÉ 80/20'}
              </span>
            </div>
            <p className="text-[11px] font-mono text-slate-400">
              {isDuo ? 'Télémétrie d’entraînement du couple • Sciences du Sport' : 'Préparation 10 km & Entraînement Polarisé'}
            </p>
          </div>
        </div>

        {/* Athlete Switcher (Segmented Control) */}
        <div className="flex items-center p-0.5 rounded-xl bg-[#0B0E14] border border-white/[0.08] gap-1 font-mono">
          <button
            type="button"
            onClick={() => onSelectAthlete('duo')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              currentAthlete === 'duo'
                ? 'bg-[#F59E0B] text-slate-950 font-bold shadow-md shadow-[#F59E0B]/20'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <span>🤝</span>
            <span>Duo</span>
          </button>
          <button
            type="button"
            onClick={() => onSelectAthlete('louis')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              currentAthlete === 'louis'
                ? 'bg-[#00A7E1] text-white font-bold shadow-md shadow-[#00A7E1]/20'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <span>🏃‍♂️</span>
            <span>Louis</span>
          </button>
          <button
            type="button"
            onClick={() => onSelectAthlete('clara')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              currentAthlete === 'clara'
                ? 'bg-[#F43F5E] text-white font-bold shadow-md shadow-[#F43F5E]/20'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <span>🏃‍♀️</span>
            <span>Clara</span>
          </button>
        </div>

        {/* Status, Profile & Memory Action */}
        <div className="flex items-center gap-2.5 font-mono">
          {/* Garmin Status Pill */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-[#171D2A] border border-white/[0.06]">
            <span
              className={`w-2 h-2 rounded-full ${
                status?.garmin_connected ? 'bg-[#10B981] animate-pulse' : 'bg-[#F59E0B]'
              }`}
            />
            <span className="text-[11px] text-slate-300">
              {isDuo
                ? status?.both_connected
                  ? '2 montres connectées'
                  : 'Garmin connecté'
                : status?.garmin_connected
                ? 'Garmin Live'
                : 'Hors ligne'}
            </span>
          </div>

          {/* Athlete Profile Goal */}
          <div className="hidden lg:flex flex-col text-right pl-2 border-l border-white/[0.08]">
            <span className="text-xs font-bold text-white">{athleteName}</span>
            <span
              className={`text-[10px] font-medium ${
                isDuo ? 'text-[#F59E0B]' : isClara ? 'text-[#F43F5E]' : 'text-[#00A7E1]'
              }`}
            >
              {goalText}
            </span>
          </div>

          {/* Memory & Profile Button */}
          <button
            type="button"
            onClick={onOpenMemory}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[#171D2A] hover:bg-[#1E2638] text-slate-300 hover:text-white border border-white/[0.08] transition-colors"
            title="Consulter le profil et la mémoire adaptative du coach"
          >
            <Brain className="w-3.5 h-3.5 text-[#00A7E1]" />
            <span className="hidden sm:inline">Mémoire & Profil</span>
          </button>
        </div>
      </div>
    </header>
  );
};
