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

// Raw hex consts for Recharts / SVG chart code (CSS vars are unreliable there)
const CYAN = "#2563EB";
const CORAL = "#C2417A";
const NEUTRAL = "#64748B";

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
      <div className="flex flex-col items-center justify-center p-2 rounded-tile bg-surface-2 border border-border">
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
            <span className="font-mono text-xs font-bold text-ink tracking-tight leading-none">
              {displayVal !== null ? displayVal : '--'}
            </span>
            <span className="text-micro font-mono text-ink-muted leading-none mt-0.5">{unit}</span>
          </div>
        </div>
        <span className="text-micro font-medium text-ink mt-1 uppercase tracking-wider">
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
        className={`p-3.5 rounded-tile bg-surface-2 border ${accent.borderClass} space-y-3 relative overflow-hidden`}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <div className="flex items-center gap-2">
            <div
              className="w-2.5 h-2.5 rounded-pill"
              style={{ backgroundColor: accent.color }}
            />
            <div>
              <div className="flex items-center gap-1.5">
                <span className={`text-xs font-bold uppercase tracking-wider ${accent.textClass}`}>
                  {name}
                </span>
                <span className="text-micro font-mono text-ink-faint uppercase">{role}</span>
              </div>
            </div>
          </div>

          <span
            className={`text-micro font-mono font-semibold px-2 py-0.5 rounded-tile border ${accent.badgeClass}`}
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
          <div className="p-2 rounded-tile bg-surface-2 border border-border">
            <div className="text-micro uppercase font-mono text-ink-muted flex items-center justify-center gap-1 mb-0.5">
              <Moon className="w-2.5 h-2.5 text-ink-muted" />
              Sommeil
            </div>
            <div className="font-mono text-xs font-bold text-ink">
              {sleep !== null && sleep !== undefined ? `${sleep}h` : '--'}
            </div>
          </div>

          {/* FC Repos */}
          <div className="p-2 rounded-tile bg-surface-2 border border-border">
            <div className="text-micro uppercase font-mono text-ink-muted flex items-center justify-center gap-1 mb-0.5">
              <Heart className="w-2.5 h-2.5 text-athlete-coral" />
              FC Repos
            </div>
            <div className="font-mono text-xs font-bold text-ink">
              {rhr !== null && rhr !== undefined ? `${rhr}` : '--'}{' '}
              <span className="text-micro text-ink-muted font-normal">bpm</span>
            </div>
          </div>

          {/* Stress */}
          <div className="p-2 rounded-tile bg-surface-2 border border-border">
            <div className="text-micro uppercase font-mono text-ink-muted flex items-center justify-center gap-1 mb-0.5">
              <Smile className="w-2.5 h-2.5 text-duo" />
              Stress
            </div>
            <div className="font-mono text-xs font-bold text-ink">
              {stress !== null && stress !== undefined ? `${stress}` : '--'}
              <span className="text-micro text-ink-muted font-normal">/100</span>
            </div>
          </div>
        </div>

        {/* Sync Summary message */}
        {data?.summary_message && (
          <p className="text-micro text-ink-muted leading-snug line-clamp-2 italic pt-1 border-t border-border">
            "{data.summary_message}"
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="telemetry-card rounded-card p-4 sm:p-5 space-y-4 text-ink">
      {/* 1. Header with Mode Toggle & Refresh */}
      <div className="flex items-center justify-between pb-3 border-b border-border-strong">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-tile bg-surface-3 border border-border-strong flex items-center justify-center text-athlete-cyan">
            <Radio className="w-4 h-4 animate-pulse text-athlete-cyan" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink">
                Télémétrie Duo & Récupération
              </h3>
              <span className="w-1.5 h-1.5 rounded-pill bg-metric-good animate-ping" />
            </div>
            <p className="text-xs text-ink-muted font-mono">
              Confrontation physiologique Garmin Connect
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View Switcher: Radar vs Miroir */}
          <div className="flex items-center p-0.5 rounded-tile bg-surface-2 border border-border text-xs">
            <button
              type="button"
              onClick={() => setViewMode('radar')}
              className={`flex items-center gap-1 px-2 py-1 rounded-tile text-micro font-semibold transition-all ${
                viewMode === 'radar'
                  ? 'bg-surface-3 text-ink shadow-sm border border-border-strong'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              <Gauge className="w-3 h-3 text-athlete-cyan" />
              <span className="hidden sm:inline">Radar</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('mirror')}
              className={`flex items-center gap-1 px-2 py-1 rounded-tile text-micro font-semibold transition-all ${
                viewMode === 'mirror'
                  ? 'bg-surface-3 text-ink shadow-sm border border-border-strong'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              <SlidersHorizontal className="w-3 h-3 text-athlete-coral" />
              <span className="hidden sm:inline">Miroir</span>
            </button>
          </div>

          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              className="p-1.5 rounded-tile bg-surface-2 hover:bg-surface-3 text-ink-muted hover:text-ink transition-colors border border-border"
              title="Rafraîchir la télémétrie Garmin"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-athlete-cyan' : ''}`} />
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
              <span className="w-3 h-3 rounded-pill bg-athlete-cyan/20 border border-athlete-cyan" />
              <span className="text-xs font-bold text-ink">Louis</span>
              <span className="font-mono text-micro text-ink-muted">
                (Readiness: {louis?.readiness_score ?? '--'})
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-pill bg-athlete-coral/20 border border-athlete-coral" />
              <span className="text-xs font-bold text-ink">Clara</span>
              <span className="font-mono text-micro text-ink-muted">
                (Readiness: {clara?.readiness_score ?? '--'})
              </span>
            </div>
          </div>

          {/* Recharts Radar */}
          <div className="h-64 w-full bg-surface-2 rounded-tile border border-border p-1 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius="70%">
                <PolarGrid stroke="rgba(255, 255, 255, 0.08)" strokeDasharray="3 3" />
                <PolarAngleAxis
                  dataKey="metric"
                  tick={{ fill: NEUTRAL, fontSize: 11, fontFamily: 'var(--font-mono)' }}
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
                        <div className="p-2.5 rounded-tile bg-surface-2 border border-border-strong shadow-xl text-xs space-y-1">
                          <div className="font-bold text-ink">{data.metric}</div>
                          <div className="flex items-center justify-between gap-4 font-mono text-athlete-cyan">
                            <span>Louis :</span>
                            <span className="font-bold">{data.louis} / 100</span>
                          </div>
                          <div className="flex items-center justify-between gap-4 font-mono text-athlete-coral">
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
                  stroke={CYAN}
                  fill={CYAN}
                  fillOpacity={0.25}
                  strokeWidth={2}
                />
                <Radar
                  name="Clara"
                  dataKey="clara"
                  stroke={CORAL}
                  fill={CORAL}
                  fillOpacity={0.25}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Quick Dual Physiological Insight */}
          <div className="p-2.5 rounded-tile bg-surface-2 border border-border flex items-center gap-2.5 text-xs text-ink">
            <TrendingUp className="w-4 h-4 text-metric-good flex-shrink-0" />
            <div className="text-xs leading-tight">
              <strong className="text-ink">Équilibre Duo :</strong> Récupération coordonnée
              propice aux séances d'intensité partagée cette semaine.
            </div>
          </div>
        </div>
      )}

      {/* 3. Mirror View (Side-by-Side Dual Telemetry Cards) */}
      {viewMode === 'mirror' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {renderAthleteMirrorCard(louis, 'Louis Poutrain', 'Athlète 1', {
            color: CYAN,
            glowClass: 'shadow-[0_0_12px_-2px_rgba(37,99,235,0.30)]',
            borderClass: 'border-athlete-cyan/30',
            textClass: 'text-athlete-cyan',
            badgeClass: 'bg-athlete-cyan/10 text-athlete-cyan border-athlete-cyan/30',
          })}

          {renderAthleteMirrorCard(clara, 'Clara', 'Athlète 2', {
            color: CORAL,
            glowClass: 'shadow-[0_0_12px_-2px_rgba(194,65,122,0.30)]',
            borderClass: 'border-athlete-coral/30',
            textClass: 'text-athlete-coral',
            badgeClass: 'bg-athlete-coral/10 text-athlete-coral border-athlete-coral/30',
          })}
        </div>
      )}
    </div>
  );
};
