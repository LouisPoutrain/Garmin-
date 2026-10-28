import React from 'react';
import {
  Zap,
  Brain,
  HeartHandshake,
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
      <div className="matte-card rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-slate-200">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#1C2333] border border-[#2B354C] flex items-center justify-center text-[#E0583A]">
            {isDuo ? (
              <HeartHandshake className="w-4 h-4 text-[#D99738]" />
            ) : (
              <Zap className="w-4 h-4 fill-[#E0583A] text-[#E0583A]" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold tracking-tight text-white">
                GARMIN{' '}
                <span className={isDuo ? 'text-[#D99738]' : isClara ? 'text-[#9D78DE]' : 'text-[#E0583A]'}>
                  {isDuo ? 'DUO COACH' : isClara ? 'CLARA COACH' : 'LOUIS COACH'}
                </span>
              </h1>
              <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-[#1C2333] text-slate-400 border border-[#283348]">
                {isDuo ? 'Duo 10K' : 'Polarisé 80/20'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              {isDuo ? 'Coordination d’entraînement du couple • Sciences du Sport' : 'Préparation 10 km & Entraînement Polarisé'}
            </p>
          </div>
        </div>

        {/* Athlete Switcher (Segmented Control) */}
        <div className="flex items-center p-0.5 rounded-xl bg-[#0D1017] border border-[#1E2535] gap-1">
          <button
            type="button"
            onClick={() => onSelectAthlete('duo')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              currentAthlete === 'duo'
                ? 'bg-[#D99738] text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
            }`}
          >
            <span>🤝</span>
            <span>Duo</span>
          </button>
          <button
            type="button"
            onClick={() => onSelectAthlete('louis')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              currentAthlete === 'louis'
                ? 'bg-[#E0583A] text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
            }`}
          >
            <span>🏃‍♂️</span>
            <span>Louis</span>
          </button>
          <button
            type="button"
            onClick={() => onSelectAthlete('clara')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              currentAthlete === 'clara'
                ? 'bg-[#9D78DE] text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
            }`}
          >
            <span>🏃‍♀️</span>
            <span>Clara</span>
          </button>
        </div>

        {/* Status, Profile & Memory Action */}
        <div className="flex items-center gap-2.5">
          {/* Garmin Status Pill */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-[#171C2B] border border-[#232B3E]">
            <span
              className={`w-2 h-2 rounded-full ${
                status?.garmin_connected ? 'bg-[#3FA372]' : 'bg-[#D99738]'
              }`}
            />
            <span className="text-[11px] text-slate-300">
              {isDuo
                ? status?.both_connected
                  ? '2 montres synchronisées'
                  : 'Garmin connecté'
                : status?.garmin_connected
                ? 'Connecté'
                : 'Hors ligne'}
            </span>
          </div>

          {/* Athlete Profile Goal */}
          <div className="hidden lg:flex flex-col text-right pl-2 border-l border-[#1E2535]">
            <span className="text-xs font-bold text-slate-200">{athleteName}</span>
            <span
              className={`text-[10px] font-medium ${
                isDuo ? 'text-[#D99738]' : isClara ? 'text-[#9D78DE]' : 'text-[#E0583A]'
              }`}
            >
              {goalText}
            </span>
          </div>

          {/* Memory & Profile Button */}
          <button
            type="button"
            onClick={onOpenMemory}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium btn-matte-secondary"
            title="Consulter le profil et la mémoire adaptative du coach"
          >
            <Brain className="w-3.5 h-3.5 text-[#9D78DE]" />
            <span className="hidden sm:inline">Mémoire & Profil</span>
          </button>
        </div>
      </div>
    </header>
  );
};
