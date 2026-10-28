import React from 'react';
import { Activity, Zap, Moon, Heart, Smile, RefreshCw } from 'lucide-react';
import type { Biometrics } from '../types';

interface GarminDuoStatsProps {
  biometrics: Biometrics | null;
  loading: boolean;
  onRefresh?: () => void;
}

export const GarminDuoStats: React.FC<GarminDuoStatsProps> = ({
  biometrics,
  loading,
  onRefresh,
}) => {
  const louis = biometrics?.louis || biometrics;
  const clara = biometrics?.clara;

  const renderAthleteStats = (
    data: Biometrics | null | undefined,
    name: string,
    icon: string,
    theme: {
      accentText: string;
      accentBorder: string;
      badgeBg: string;
    }
  ) => {
    const readinessScore = data?.readiness_score;
    const bodyBattery = data?.body_battery;
    const sleepHours = data?.sleep_hours;
    const restingHr = data?.resting_hr;
    const avgStress = data?.avg_stress;

    return (
      <div className={`p-4 rounded-xl matte-card-subtle border ${theme.accentBorder} space-y-3`}>
        {/* Athlete Header */}
        <div className="flex items-center justify-between pb-2 border-b border-[#232B3E]">
          <div className="flex items-center gap-2">
            <span className="text-base">{icon}</span>
            <span className={`text-xs font-bold uppercase tracking-wider ${theme.accentText}`}>
              {name}
            </span>
          </div>

          <span
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${theme.badgeBg}`}
          >
            {readinessScore !== null && readinessScore !== undefined
              ? `Readiness ${readinessScore}/100`
              : data?.garmin_connected
              ? 'En attente synchro'
              : 'Non connecté'}
          </span>
        </div>

        {/* 4 Stats Grid */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          {/* Body Battery */}
          <div className="p-2.5 rounded-lg bg-[#121622] border border-[#1E2535]">
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
              <span className="flex items-center gap-1">
                <Zap className="w-3 h-3 text-[#D99738]" /> Body Battery
              </span>
            </div>
            <div className="text-base font-bold font-mono text-slate-200">
              {bodyBattery !== null && bodyBattery !== undefined ? `${bodyBattery}%` : '--'}
            </div>
          </div>

          {/* Sleep */}
          <div className="p-2.5 rounded-lg bg-[#121622] border border-[#1E2535]">
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
              <span className="flex items-center gap-1">
                <Moon className="w-3 h-3 text-[#9D78DE]" /> Sommeil
              </span>
            </div>
            <div className="text-base font-bold font-mono text-slate-200">
              {sleepHours !== null && sleepHours !== undefined ? `${sleepHours}h` : '--'}
            </div>
          </div>

          {/* Resting HR */}
          <div className="p-2.5 rounded-lg bg-[#121622] border border-[#1E2535]">
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
              <span className="flex items-center gap-1">
                <Heart className="w-3 h-3 text-[#E0583A]" /> FC Repos
              </span>
            </div>
            <div className="text-base font-bold font-mono text-slate-200">
              {restingHr !== null && restingHr !== undefined ? `${restingHr} bpm` : '--'}
            </div>
          </div>

          {/* Stress */}
          <div className="p-2.5 rounded-lg bg-[#121622] border border-[#1E2535]">
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
              <span className="flex items-center gap-1">
                <Smile className="w-3 h-3 text-[#4EA8DE]" /> Stress
              </span>
            </div>
            <div className="text-base font-bold font-mono text-slate-200">
              {avgStress !== null && avgStress !== undefined ? `${avgStress}/100` : '--'}
            </div>
          </div>
        </div>

        {/* Sync message if any */}
        {data?.summary_message && (
          <p className="text-[11px] text-slate-400 leading-snug line-clamp-2 italic pt-1 border-t border-[#1E2535]">
            "{data.summary_message}"
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="matte-card rounded-2xl p-4 sm:p-5 space-y-4 text-slate-200">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-[#1E2535]">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#4EA8DE]" />
          <h3 className="text-sm font-bold text-white tracking-wide">
            Biométries & Récupération Garmin
          </h3>
        </div>

        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors"
            title="Rafraîchir les métriques"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#4EA8DE]' : ''}`} />
          </button>
        )}
      </div>

      {/* Two Athlete Cards Stacked / Dual */}
      <div className="space-y-3">
        {renderAthleteStats(louis, 'Louis Poutrain', '🏃‍♂️', {
          accentText: 'text-[#E0583A]',
          accentBorder: 'border-[#E0583A]/25',
          badgeBg: 'bg-[#E0583A]/10 text-[#E0583A] border-[#E0583A]/30',
        })}

        {renderAthleteStats(clara, 'Clara', '🏃‍♀️', {
          accentText: 'text-[#9D78DE]',
          accentBorder: 'border-[#9D78DE]/25',
          badgeBg: 'bg-[#9D78DE]/10 text-[#9D78DE] border-[#9D78DE]/30',
        })}
      </div>
    </div>
  );
};
