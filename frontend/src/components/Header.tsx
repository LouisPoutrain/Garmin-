import React from 'react';
import {
  Brain,
  Radio,
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

  const goalBadge = isDuo
    ? "SUB-40 & SUB-50"
    : isClara
    ? 'SUB-50 (4:59/KM)'
    : 'SUB-40 (3:59/KM)';

  return (
    <header className="mb-4">
      <div className="bg-[#0B0F19] border border-white/[0.05] rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        {/* Brand / F1 Pit Wall Style */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#04070D] border border-white/[0.06] flex items-center justify-center text-[#00E5FF] shadow-[0_0_12px_rgba(0,229,255,0.15)] flex-shrink-0">
            <Radio className="w-4 h-4 text-[#00E5FF] animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xs sm:text-sm font-bold tracking-tight text-white font-mono flex items-center gap-1.5">
                <span>PIT WALL</span>
                <span className="text-zinc-600">•</span>
                <span className={isDuo ? 'text-amber-400' : isClara ? 'text-[#FB7185]' : 'text-[#00E5FF]'}>
                  {isDuo ? 'DUO TELEMETRY' : isClara ? 'CLARA 10K' : 'LOUIS 10K'}
                </span>
              </h1>
              <span className="text-[10px] font-mono uppercase tracking-[0.18em] px-1.5 py-0.5 rounded border border-white/[0.06] bg-white/[0.02] text-zinc-400">
                80/20 POLARIZED
              </span>
            </div>
            <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-zinc-500 font-semibold mt-0.5">
              McLAREN & WHOOP TELEMETRY PROTOCOL
            </p>
          </div>
        </div>

        {/* Athlete Switcher (Geist / Raycast Minimalist Segmented Control) */}
        <div className="flex items-center p-1 rounded-xl bg-[#04070D] border border-white/[0.05] gap-1 font-mono text-xs">
          <button
            type="button"
            onClick={() => onSelectAthlete('duo')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
              currentAthlete === 'duo'
                ? 'border border-amber-400/30 text-amber-300 bg-amber-400/10 shadow-[0_0_12px_rgba(245,158,11,0.15)]'
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.03]'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span>DUO SPLIT</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectAthlete('louis')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
              currentAthlete === 'louis'
                ? 'border border-[#00E5FF]/30 text-[#00E5FF] bg-[#00E5FF]/10 shadow-[0_0_12px_rgba(0,229,255,0.15)]'
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.03]'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#00E5FF]" />
            <span>LOUIS</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectAthlete('clara')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
              currentAthlete === 'clara'
                ? 'border border-[#FB7185]/30 text-[#FB7185] bg-[#FB7185]/10 shadow-[0_0_12px_rgba(251,113,133,0.15)]'
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.03]'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#FB7185]" />
            <span>CLARA</span>
          </button>
        </div>

        {/* Live Feed & Ghost Actions */}
        <div className="flex items-center gap-2.5 font-mono">
          {/* Garmin Live Status */}
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#04070D] border border-white/[0.05]">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                status?.garmin_connected ? 'bg-[#10B981] shadow-[0_0_8px_#10B981]' : 'bg-amber-400'
              }`}
            />
            <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-400 font-semibold">
              {isDuo
                ? status?.both_connected
                  ? 'DUAL TELEMETRY LIVE'
                  : 'GARMIN SYNCED'
                : status?.garmin_connected
                ? 'TELEMETRY LIVE'
                : 'OFFLINE'}
            </span>
          </div>

          {/* Goal pill */}
          <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#04070D] border border-white/[0.05] text-[10px] tracking-[0.15em] uppercase font-bold text-zinc-300">
            <span className="text-zinc-500">{athleteName} :</span>
            <span className={isDuo ? 'text-amber-400' : isClara ? 'text-[#FB7185]' : 'text-[#00E5FF]'}>
              {goalBadge}
            </span>
          </div>

          {/* Ghost Memory Button */}
          <button
            type="button"
            onClick={onOpenMemory}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium text-zinc-400 hover:text-white bg-[#04070D] hover:bg-white/[0.04] border border-white/[0.05] hover:border-white/[0.1] transition-all"
            title="Consulter la mémoire adaptative du coach"
          >
            <Brain className="w-3.5 h-3.5 text-[#00E5FF]" />
            <span className="hidden sm:inline text-[11px] uppercase tracking-[0.15em]">Mémoire</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
