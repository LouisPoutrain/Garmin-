import React, { useState } from 'react';
import {
  Moon,
  Heart,
  Smile,
  RefreshCw,
  Gauge,
  Radio,
  SlidersHorizontal,
  TrendingUp,
} from 'lucide-react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
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
  const [viewMode, setViewMode] = useState<'radar' | 'mirror'>('radar');

  const louis = biometrics?.louis || biometrics;
  const clara = biometrics?.clara;

  // Normalization for Radar Chart (0 - 100)
  const getNormScore = (val: number | null | undefined, fallback: number) => {
    if (val === null || val === undefined) return fallback;
    return Math.max(10, Math.min(100, Math.round(val)));
  };

  const getSleepScore = (hours: number | null | undefined, score: number | null | undefined) => {
    if (score !== null && score !== undefined) return score;
    if (hours !== null && hours !== undefined) return Math.min(100, Math.round((hours / 8.2) * 100));
    return 75;
  };

  const getRhrScore = (rhr: number | null | undefined) => {
    if (rhr === null || rhr === undefined) return 70;
    // Lower resting HR is better (e.g. 48 bpm -> 95, 68 bpm -> 55)
    return Math.max(20, Math.min(100, Math.round(100 - (rhr - 45) * 2.2)));
  };

  const getCalmScore = (stress: number | null | undefined) => {
    if (stress === null || stress === undefined) return 70;
    return Math.max(10, Math.min(100, 100 - stress));
  };

  const radarData = [
    {
      metric: 'Préparation',
      louis: getNormScore(louis?.readiness_score, 78),
      clara: getNormScore(clara?.readiness_score, 82),
      fullMark: 100,
    },
    {
      metric: 'Batterie',
      louis: getNormScore(louis?.body_battery, 70),
      clara: getNormScore(clara?.body_battery, 85),
      fullMark: 100,
    },
    {
      metric: 'Sommeil',
      louis: getSleepScore(louis?.sleep_hours, louis?.sleep_score),
      clara: getSleepScore(clara?.sleep_hours, clara?.sleep_score),
      fullMark: 100,
    },
    {
      metric: 'Forme FC',
      louis: getRhrScore(louis?.resting_hr),
      clara: getRhrScore(clara?.resting_hr),
      fullMark: 100,
    },
    {
      metric: 'Anti-Stress',
      louis: getCalmScore(louis?.avg_stress),
      clara: getCalmScore(clara?.avg_stress),
      fullMark: 100,
    },
    {
      metric: 'Régularité',
      louis: 85,
      clara: 80,
      fullMark: 100,
    },
  ];

  // Circular SVG Gauge Component for telemetry
  const CircularGauge = ({
    value,
    max = 100,
    color,
    label,
    unit = '%',
  }: {
    value: number | null | undefined;
    max?: number;
    color: string;
    label: string;
    unit?: string;
  }) => {
    const radius = 28;
    const stroke = 4.5;
    const normalizedRadius = radius - stroke * 2;
    const circumference = normalizedRadius * 2 * Math.PI;
    const displayVal = value !== null && value !== undefined ? Math.round(value) : null;
    const percent = displayVal !== null ? Math.min(100, Math.max(0, (displayVal / max) * 100)) : 0;
    const strokeDashoffset = circumference - (percent / 100) * circumference;

    return (
      <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-[#0F141F] border border-white/[0.04]">
        <div className="relative w-16 h-16 flex items-center justify-center">
          <svg height={radius * 2} width={radius * 2} className="rotate-[-90deg]">
            <circle
              stroke="rgba(255, 255, 255, 0.08)"
              fill="transparent"
              strokeWidth={stroke}
              r={normalizedRadius}
              cx={radius}
              cy={radius}
            />
            <circle
              stroke={color}
              fill="transparent"
              strokeWidth={stroke}
              strokeDasharray={`${circumference} ${circumference}`}
              style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.6s ease' }}
              strokeLinecap="round"
              r={normalizedRadius}
              cx={radius}
              cy={radius}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="font-mono text-xs font-bold text-white tracking-tight leading-none">
              {displayVal !== null ? displayVal : '--'}
            </span>
            <span className="text-[9px] font-mono text-slate-400 leading-none mt-0.5">{unit}</span>
          </div>
        </div>
        <span className="text-[10px] font-medium text-slate-300 mt-1 uppercase tracking-wider">
          {label}
        </span>
      </div>
    );
  };

  const renderAthleteMirrorCard = (
    data: Biometrics | null | undefined,
    name: string,
    role: string,
    accent: {
      color: string;
      glowClass: string;
      borderClass: string;
      textClass: string;
      badgeClass: string;
    }
  ) => {
    const readiness = data?.readiness_score;
    const bb = data?.body_battery;
    const sleep = data?.sleep_hours;
    const rhr = data?.resting_hr;
    const stress = data?.avg_stress;

    return (
      <div
        className={`p-3.5 rounded-xl bg-[#121722] border ${accent.borderClass} space-y-3 relative overflow-hidden`}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: accent.color }}
            />
            <div>
              <div className="flex items-center gap-1.5">
                <span className={`text-xs font-bold uppercase tracking-wider ${accent.textClass}`}>
                  {name}
                </span>
                <span className="text-[9px] font-mono text-slate-500 uppercase">{role}</span>
              </div>
            </div>
          </div>

          <span
            className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md border ${accent.badgeClass}`}
          >
            {readiness !== null && readiness !== undefined
              ? `Readiness ${readiness}`
              : data?.garmin_connected
              ? 'Synchro requise'
              : 'Hors ligne'}
          </span>
        </div>

        {/* Circular Gauges Dual */}
        <div className="grid grid-cols-2 gap-2">
          <CircularGauge
            value={readiness}
            color={accent.color}
            label="Readiness"
            unit="/100"
          />
          <CircularGauge
            value={bb}
            color={accent.color}
            label="Body Battery"
            unit="%"
          />
        </div>

        {/* 3 Telemetry Metrics Chips */}
        <div className="grid grid-cols-3 gap-1.5 text-center">
          {/* Sommeil */}
          <div className="p-2 rounded-lg bg-[#0F141F] border border-white/[0.04]">
            <div className="text-[9px] uppercase font-mono text-slate-400 flex items-center justify-center gap-1 mb-0.5">
              <Moon className="w-2.5 h-2.5 text-slate-400" />
              Sommeil
            </div>
            <div className="font-mono text-xs font-bold text-slate-200">
              {sleep !== null && sleep !== undefined ? `${sleep}h` : '--'}
            </div>
          </div>

          {/* FC Repos */}
          <div className="p-2 rounded-lg bg-[#0F141F] border border-white/[0.04]">
            <div className="text-[9px] uppercase font-mono text-slate-400 flex items-center justify-center gap-1 mb-0.5">
              <Heart className="w-2.5 h-2.5 text-rose-400" />
              FC Repos
            </div>
            <div className="font-mono text-xs font-bold text-slate-200">
              {rhr !== null && rhr !== undefined ? `${rhr}` : '--'}{' '}
              <span className="text-[9px] text-slate-400 font-normal">bpm</span>
            </div>
          </div>

          {/* Stress */}
          <div className="p-2 rounded-lg bg-[#0F141F] border border-white/[0.04]">
            <div className="text-[9px] uppercase font-mono text-slate-400 flex items-center justify-center gap-1 mb-0.5">
              <Smile className="w-2.5 h-2.5 text-amber-400" />
              Stress
            </div>
            <div className="font-mono text-xs font-bold text-slate-200">
              {stress !== null && stress !== undefined ? `${stress}` : '--'}
              <span className="text-[9px] text-slate-400 font-normal">/100</span>
            </div>
          </div>
        </div>

        {/* Sync Summary message */}
        {data?.summary_message && (
          <p className="text-[10.5px] text-slate-400 leading-snug line-clamp-2 italic pt-1 border-t border-white/[0.04]">
            "{data.summary_message}"
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="telemetry-card rounded-2xl p-4 sm:p-5 space-y-4 text-slate-200">
      {/* 1. Header with Mode Toggle & Refresh */}
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.07]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#171D2A] border border-white/[0.08] flex items-center justify-center text-[#00A7E1]">
            <Radio className="w-4 h-4 animate-pulse text-[#00A7E1]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                Télémétrie Duo & Récupération
              </h3>
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-ping" />
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              Confrontation physiologique Garmin Connect
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View Switcher: Radar vs Miroir */}
          <div className="flex items-center p-0.5 rounded-lg bg-[#0F141F] border border-white/[0.06] text-xs">
            <button
              type="button"
              onClick={() => setViewMode('radar')}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold transition-all ${
                viewMode === 'radar'
                  ? 'bg-[#1C2538] text-white shadow-sm border border-white/[0.08]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Gauge className="w-3 h-3 text-[#00A7E1]" />
              <span className="hidden sm:inline">Radar</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('mirror')}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold transition-all ${
                viewMode === 'mirror'
                  ? 'bg-[#1C2538] text-white shadow-sm border border-white/[0.08]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <SlidersHorizontal className="w-3 h-3 text-[#F43F5E]" />
              <span className="hidden sm:inline">Miroir</span>
            </button>
          </div>

          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              className="p-1.5 rounded-lg bg-[#171D2A] hover:bg-[#20293C] text-slate-400 hover:text-white transition-colors border border-white/[0.06]"
              title="Rafraîchir la télémétrie Garmin"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#00A7E1]' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* 2. Radar Chart View */}
      {viewMode === 'radar' && (
        <div className="space-y-3">
          {/* Legend row */}
          <div className="flex items-center justify-between text-xs px-2 pt-1">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#00A7E1]/20 border border-[#00A7E1]" />
              <span className="text-xs font-bold text-white">Louis</span>
              <span className="font-mono text-[10px] text-slate-400">
                (Readiness: {louis?.readiness_score ?? '--'})
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#F43F5E]/20 border border-[#F43F5E]" />
              <span className="text-xs font-bold text-white">Clara</span>
              <span className="font-mono text-[10px] text-slate-400">
                (Readiness: {clara?.readiness_score ?? '--'})
              </span>
            </div>
          </div>

          {/* Recharts Radar */}
          <div className="h-64 w-full bg-[#0E131D] rounded-xl border border-white/[0.04] p-1 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius="70%">
                <PolarGrid stroke="rgba(255, 255, 255, 0.08)" strokeDasharray="3 3" />
                <PolarAngleAxis
                  dataKey="metric"
                  tick={{ fill: '#94A3B8', fontSize: 11, fontFamily: 'var(--font-mono)' }}
                />
                <PolarRadiusAxis
                  angle={30}
                  domain={[0, 100]}
                  tick={false}
                  axisLine={false}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="p-2.5 rounded-lg bg-[#0F141F] border border-white/10 shadow-xl text-xs space-y-1">
                          <div className="font-bold text-white">{data.metric}</div>
                          <div className="flex items-center justify-between gap-4 font-mono text-[#00A7E1]">
                            <span>Louis :</span>
                            <span className="font-bold">{data.louis} / 100</span>
                          </div>
                          <div className="flex items-center justify-between gap-4 font-mono text-[#F43F5E]">
                            <span>Clara :</span>
                            <span className="font-bold">{data.clara} / 100</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Radar
                  name="Louis"
                  dataKey="louis"
                  stroke="#00A7E1"
                  fill="#00A7E1"
                  fillOpacity={0.25}
                  strokeWidth={2}
                />
                <Radar
                  name="Clara"
                  dataKey="clara"
                  stroke="#F43F5E"
                  fill="#F43F5E"
                  fillOpacity={0.25}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Quick Dual Physiological Insight */}
          <div className="p-2.5 rounded-xl bg-[#0F141F] border border-white/[0.04] flex items-center gap-2.5 text-xs text-slate-300">
            <TrendingUp className="w-4 h-4 text-[#10B981] flex-shrink-0" />
            <div className="text-[11px] leading-tight">
              <strong className="text-white">Équilibre Duo :</strong> Récupération coordonnée
              propice aux séances d'intensité partagée cette semaine.
            </div>
          </div>
        </div>
      )}

      {/* 3. Mirror View (Side-by-Side Dual Telemetry Cards) */}
      {viewMode === 'mirror' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {renderAthleteMirrorCard(louis, 'Louis Poutrain', 'Athlète 1', {
            color: '#00A7E1',
            glowClass: 'glow-cyan',
            borderClass: 'border-[#00A7E1]/30',
            textClass: 'text-[#00A7E1]',
            badgeClass: 'bg-[#00A7E1]/10 text-[#00A7E1] border-[#00A7E1]/30',
          })}

          {renderAthleteMirrorCard(clara, 'Clara', 'Athlète 2', {
            color: '#F43F5E',
            glowClass: 'glow-coral',
            borderClass: 'border-[#F43F5E]/30',
            textClass: 'text-[#F43F5E]',
            badgeClass: 'bg-[#F43F5E]/10 text-[#F43F5E] border-[#F43F5E]/30',
          })}
        </div>
      )}
    </div>
  );
};
