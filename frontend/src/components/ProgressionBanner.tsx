import React from 'react';
import { Target, Timer, Trophy, ArrowRight } from 'lucide-react';
import type { GoalProgression, Scorecard } from '../types';

interface ProgressionBannerProps {
  progression: GoalProgression | null;
  scorecard?: Scorecard;
  louisScorecard?: Scorecard;
  claraScorecard?: Scorecard;
  onSelectActivity?: (activityId: number | string) => void;
}

export const ProgressionBanner: React.FC<ProgressionBannerProps> = ({
  progression,
  scorecard,
  louisScorecard,
  claraScorecard,
}) => {
  const percent = progression?.progress_percent ?? 0;
  const completed = scorecard?.completed_sessions ?? 5;
  const total = scorecard?.total_planned_sessions ?? 6;

  // Days remaining until the goal deadline (null when the deadline is not parseable)
  let daysRemaining: number | null = null;
  if (progression?.target_deadline) {
    const t = new Date(progression.target_deadline).getTime();
    if (!Number.isNaN(t)) daysRemaining = Math.ceil((t - Date.now()) / 86400000);
  }

  const countdownLabel = daysRemaining !== null ? `J-${daysRemaining}` : 'J-171';
  const weeksLabel = daysRemaining !== null
    ? `${Math.round(daysRemaining / 7)} semaines restantes`
    : "24 semaines d'entraînement polarisé 80/20";

  const deadlineLabel = (() => {
    if (progression?.target_deadline) {
      const d = new Date(progression.target_deadline);
      if (!Number.isNaN(d.getTime())) {
        return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
      }
    }
    return '18 AVRIL 2027';
  })();

  const phaseLabel = percent < 40 ? 'PHASE 1' : percent < 75 ? 'PHASE 2' : 'PHASE 3';
  const nextMilestone = progression?.next_milestone || 'CYCLE SEMAINE 2 FRACTIONNÉ';
  const recordText = progression ? `${progression.current_pr} (${progression.current_pace}/km)` : '43:34 (4:21/km)';
  const deltaText = progression?.delta_text || "-3'35\" (-21s/km)";

  const louisRate = louisScorecard?.completion_rate_percent;
  const claraRate = claraScorecard?.completion_rate_percent;

  return (
    <div className="bg-surface-1 border border-border rounded-card p-4 sm:p-5 mb-5 relative overflow-hidden">
      {/* Top Telemetry Header : Countdown & Cycle Metric */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-label uppercase tracking-[0.2em] text-ink-faint font-semibold font-mono flex items-center gap-1.5">
              <Timer className="w-3.5 h-3.5 text-duo" />
              CYCLE DE PRÉPARATION 10 KM • DUEL EN DIRECT
            </span>
            <span className="text-micro font-mono uppercase tracking-[0.18em] px-2 py-0.5 rounded-tile border border-border bg-surface-2 text-ink-muted">
              ÉCHÉANCE {deadlineLabel}
            </span>
          </div>
          <div className="flex items-baseline gap-3 mt-1">
            <span className="font-mono text-hero tracking-tight text-ink font-bold">
              {countdownLabel}
            </span>
            <span className="text-xs font-mono text-ink-muted">
              {weeksLabel}
            </span>
          </div>
        </div>

        {/* Global Strain & Completion */}
        <div className="flex items-center gap-4 sm:gap-6 self-start sm:self-auto font-mono">
          <div className="px-3.5 py-2 rounded-tile bg-surface-2 border border-border">
            <div className="text-label uppercase tracking-[0.2em] text-ink-faint font-semibold">
              CHARGE SEMAINE
            </div>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="font-mono text-2xl font-bold text-ink">
                {completed}
              </span>
              <span className="text-xs text-ink-faint font-mono">/ {total} SÉANCES</span>
            </div>
          </div>

          <div className="px-3.5 py-2 rounded-tile bg-surface-2 border border-border">
            <div className="text-label uppercase tracking-[0.2em] text-ink-faint font-semibold">
              CYCLE GLOBAL
            </div>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="font-mono text-2xl font-bold text-metric-good">
                {percent}%
              </span>
              <span className="text-micro text-ink-faint uppercase tracking-widest font-mono">{phaseLabel}</span>
            </div>
          </div>
        </div>
      </div>

      {/* DUEL LOUIS VS CLARA : SPLIT TELEMETRY (Pit Wall Dual Columns) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 pt-4">
        {/* PILOTE A : LOUIS POUTRAIN */}
        <div className="p-4 rounded-tile bg-surface-2 border-l-2 border-athlete-cyan border-r border-t border-b border-border space-y-3 relative group">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-tile border border-athlete-cyan/30 text-athlete-cyan bg-athlete-cyan/10 text-micro font-mono font-bold tracking-[0.18em] uppercase">
                ATHLÈTE 1 • LOUIS
              </span>
              <span className="text-micro font-mono text-ink-faint uppercase tracking-widest">
                CLUB ULTIMATE
              </span>
            </div>
            <button
              type="button"
              className="text-micro font-mono text-athlete-cyan hover:text-ink flex items-center gap-1 transition-colors group-hover:translate-x-0.5 transition-transform"
              title="Voir les splits officiels du Record 10 km de Chinon"
            >
              <span>SPLITS PR (CHINON)</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div>
            <div className="text-label uppercase tracking-[0.2em] text-ink-faint font-semibold">
              ALLURE CIBLE SUB-40
            </div>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="font-mono text-hero tracking-tight text-ink font-bold">
                3:59
              </span>
              <span className="text-xs font-mono text-ink-faint uppercase tracking-wider">
                MIN/KM (15.0 KM/H)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border font-mono text-xs">
            <div>
              <div className="text-micro uppercase tracking-wider text-ink-faint">Record Actuel</div>
              <div className="text-ink font-bold mt-0.5">{recordText}</div>
            </div>
            <div>
              <div className="text-micro uppercase tracking-wider text-ink-faint">Delta Requis</div>
              <div className="text-athlete-cyan font-bold mt-0.5">{deltaText}</div>
            </div>
          </div>

          {/* Sub-bar segment LED */}
          <div className="pt-1">
            <div className="flex justify-between text-micro font-mono text-ink-faint pb-1">
              <span>PROGRESSION SUB-40</span>
              <span className="text-ink font-bold">{louisRate != null ? `${louisRate}%` : '--'}</span>
            </div>
            <div className="h-1.5 w-full bg-surface-2 rounded-pill overflow-hidden">
              <div
                style={{ width: `${louisRate != null ? louisRate : 0}%` }}
                className="h-full rounded-pill bg-athlete-cyan shadow-[0_0_8px_rgba(37,99,235,0.35)]"
              />
            </div>
          </div>
        </div>

        {/* PILOTE B : CLARA */}
        <div className="p-4 rounded-tile bg-surface-2 border-l-2 border-athlete-coral border-r border-t border-b border-border space-y-3 relative group">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-tile border border-athlete-coral/30 text-athlete-coral bg-athlete-coral/10 text-micro font-mono font-bold tracking-[0.18em] uppercase">
                ATHLÈTE 2 • CLARA
              </span>
              <span className="text-micro font-mono text-ink-faint uppercase tracking-widest">
                4 RUNS/SEM
              </span>
            </div>
            <span className="text-micro font-mono text-athlete-coral flex items-center gap-1">
              <Trophy className="w-3 h-3" />
              <span>OBJECTIF MAJEUR</span>
            </span>
          </div>

          <div>
            <div className="text-label uppercase tracking-[0.2em] text-ink-faint font-semibold">
              ALLURE CIBLE SUB-50
            </div>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="font-mono text-hero tracking-tight text-ink font-bold">
                4:59
              </span>
              <span className="text-xs font-mono text-ink-faint uppercase tracking-wider">
                MIN/KM (12.0 KM/H)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border font-mono text-xs">
            <div>
              <div className="text-micro uppercase tracking-wider text-ink-faint">Record Actuel</div>
              <div className="text-ink font-bold mt-0.5">53:40 (5:22/km)</div>
            </div>
            <div>
              <div className="text-micro uppercase tracking-wider text-ink-faint">Delta Requis</div>
              <div className="text-athlete-coral font-bold mt-0.5">-3'41" (-23s/km)</div>
            </div>
          </div>

          {/* Sub-bar segment LED */}
          <div className="pt-1">
            <div className="flex justify-between text-micro font-mono text-ink-faint pb-1">
              <span>PROGRESSION SUB-50</span>
              <span className="text-ink font-bold">{claraRate != null ? `${claraRate}%` : '--'}</span>
            </div>
            <div className="h-1.5 w-full bg-surface-2 rounded-pill overflow-hidden">
              <div
                style={{ width: `${claraRate != null ? claraRate : 0}%` }}
                className="h-full rounded-pill bg-athlete-coral shadow-[0_0_8px_rgba(194,65,122,0.35)]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Ultra-thin Whoop 2px Progress Line */}
      <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-label font-mono text-ink-faint">
        <span className="flex items-center gap-1.5">
          <Target className="w-3.5 h-3.5 text-ink-muted" />
          <span>PHASE ACTUELLE : REPRISE FONDAMENTALE Z2 & HABITUATION TENDINEUSE</span>
        </span>
        <span className="text-ink-muted hidden sm:inline">PROCHAIN PALIER : {nextMilestone}</span>
      </div>
    </div>
  );
};

export default ProgressionBanner;
