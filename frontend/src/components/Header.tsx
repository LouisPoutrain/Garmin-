import React from 'react';
import {
  Brain,
  Radio,
  Rocket,
} from 'lucide-react';
import type { AthleteStatus, AthleteId } from '../types';

interface HeaderProps {
  status: AthleteStatus | null;
  loading?: boolean;
  currentAthlete: AthleteId;
  onSelectAthlete: (athlete: AthleteId) => void;
  onOpenMemory: () => void;
  onStartPrep: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  status,
  currentAthlete,
  onSelectAthlete,
  onOpenMemory,
  onStartPrep,
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
      <div className="bg-surface-1 border border-border rounded-card px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        {/* Brand / F1 Pit Wall Style */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-tile bg-surface-2 border border-border flex items-center justify-center text-athlete-cyan shadow-[0_0_12px_-2px_rgba(37,99,235,0.30)] flex-shrink-0">
            <Radio className="w-4 h-4 text-athlete-cyan animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xs sm:text-sm font-bold tracking-tight text-ink font-mono flex items-center gap-1.5">
                <span>PIT WALL</span>
                <span className="text-ink-faint">•</span>
                <span className={isDuo ? 'text-duo' : isClara ? 'text-athlete-coral' : 'text-athlete-cyan'}>
                  {isDuo ? 'DUO TELEMETRY' : isClara ? 'CLARA 10K' : 'LOUIS 10K'}
                </span>
              </h1>
              <span className="text-micro font-mono uppercase tracking-[0.18em] px-1.5 py-0.5 rounded-tile border border-border bg-surface-2 text-ink-muted">
                80/20 POLARIZED
              </span>
            </div>
            <p className="text-label font-mono uppercase tracking-[0.2em] text-ink-faint font-semibold mt-0.5">
              McLAREN & WHOOP TELEMETRY PROTOCOL
            </p>
          </div>
        </div>

        {/* Athlete Switcher (Geist / Raycast Minimalist Segmented Control) */}
        <div className="flex items-center p-1 rounded-tile bg-surface-2 border border-border gap-1 font-mono text-xs">
          <button
            type="button"
            onClick={() => onSelectAthlete('duo')}
            className={`px-3 py-1.5 rounded-tile font-medium transition-all flex items-center gap-1.5 ${
              currentAthlete === 'duo'
                ? 'border border-duo/30 text-duo bg-duo/10 shadow-[0_0_12px_rgba(245,158,11,0.15)]'
                : 'text-ink-muted hover:text-ink hover:bg-surface-3'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-pill bg-duo" />
            <span>DUO SPLIT</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectAthlete('louis')}
            className={`px-3 py-1.5 rounded-tile font-medium transition-all flex items-center gap-1.5 ${
              currentAthlete === 'louis'
                ? 'border border-athlete-cyan/30 text-athlete-cyan bg-athlete-cyan/10 shadow-[0_0_12px_-2px_rgba(37,99,235,0.30)]'
                : 'text-ink-muted hover:text-ink hover:bg-surface-3'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-pill bg-athlete-cyan" />
            <span>LOUIS</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectAthlete('clara')}
            className={`px-3 py-1.5 rounded-tile font-medium transition-all flex items-center gap-1.5 ${
              currentAthlete === 'clara'
                ? 'border border-athlete-coral/30 text-athlete-coral bg-athlete-coral/10 shadow-[0_0_12px_-2px_rgba(194,65,122,0.30)]'
                : 'text-ink-muted hover:text-ink hover:bg-surface-3'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-pill bg-athlete-coral" />
            <span>CLARA</span>
          </button>
        </div>

        {/* Live Feed & Ghost Actions */}
        <div className="flex items-center gap-2.5 font-mono">
          {/* Garmin Live Status */}
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-tile bg-surface-2 border border-border">
            <span
              className={`w-1.5 h-1.5 rounded-pill ${
                status?.garmin_connected ? 'bg-metric-good shadow-[0_0_8px_var(--color-metric-good)]' : 'bg-duo'
              }`}
            />
            <span className="text-micro uppercase tracking-[0.18em] text-ink-muted font-semibold">
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
          <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-tile bg-surface-2 border border-border text-micro tracking-[0.15em] uppercase font-bold text-ink">
            <span className="text-ink-faint">{athleteName} :</span>
            <span className={isDuo ? 'text-duo' : isClara ? 'text-athlete-coral' : 'text-athlete-cyan'}>
              {goalBadge}
            </span>
          </div>

          {/* Démarrer la préparation */}
          <button
            type="button"
            onClick={onStartPrep}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-tile text-xs font-mono font-bold text-white bg-athlete-cyan hover:bg-athlete-cyan-dim shadow-[0_2px_10px_-2px_rgba(37,99,235,0.5)] transition-all"
            title="Démarrer la préparation en duo"
          >
            <Rocket className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-label uppercase tracking-[0.15em]">Démarrer</span>
          </button>

          {/* Ghost Memory Button */}
          <button
            type="button"
            onClick={onOpenMemory}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-tile text-xs font-mono font-medium text-ink-muted hover:text-ink bg-surface-2 hover:bg-surface-3 border border-border hover:border-border-strong transition-all"
            title="Consulter la mémoire adaptative du coach"
          >
            <Brain className="w-3.5 h-3.5 text-athlete-cyan" />
            <span className="hidden sm:inline text-label uppercase tracking-[0.15em]">Mémoire</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
