import React from 'react';
import {
  Zap,
  Moon,
  Heart,
  Smile,
  Activity,
  RotateCcw,
  TrendingUp,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
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
        <Skeleton className="h-44 rounded-2xl" />
        <Skeleton className="h-44 rounded-2xl" />
        <Skeleton className="h-44 rounded-2xl" />
        <Skeleton className="h-44 rounded-2xl" />
      </section>
    );
  }

  if (error && !biometrics) {
    return (
      <div className="telemetry-card p-4 rounded-2xl mb-6 flex items-center justify-between border-rose-500/30 bg-rose-950/20">
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
  const readiness = biometrics?.readiness_score ?? 78;
  const bodyBattery = biometrics?.body_battery ?? 72;
  const sleepHours = biometrics?.sleep_hours ?? 7.4;
  const sleepScore = biometrics?.sleep_score ?? 82;
  const rhr = biometrics?.resting_hr ?? 52;
  const stress = biometrics?.avg_stress ?? 28;

  // 7-day HRV telemetry sparkline mock/trend data (ms)
  const hrvTrendData = [
    { day: 'J-6', hrv: 58, baseline: 62 },
    { day: 'J-5', hrv: 64, baseline: 62 },
    { day: 'J-4', hrv: 61, baseline: 62 },
    { day: 'J-3', hrv: 70, baseline: 62 },
    { day: 'J-2', hrv: 66, baseline: 62 },
    { day: 'J-1', hrv: 63, baseline: 62 },
    { day: 'Auj', hrv: 68, baseline: 62 },
  ];

  // SVG Circular Gauge helper
  const RenderCircularProgress = ({
    value,
    max = 100,
    color,
    label: _label,
    unit = '',
  }: {
    value: number | null | undefined;
    max?: number;
    color: string;
    label?: string;
    unit?: string;
  }) => {
    const radius = 34;
    const stroke = 5;
    const normalizedRadius = radius - stroke * 2;
    const circumference = normalizedRadius * 2 * Math.PI;
    const displayVal = value !== null && value !== undefined ? Math.round(value) : null;
    const percent = displayVal !== null ? Math.min(100, Math.max(0, (displayVal / max) * 100)) : 0;
    const strokeDashoffset = circumference - (percent / 100) * circumference;

    return (
      <div className="relative w-20 h-20 flex items-center justify-center">
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
            style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.8s cubic-bezier(0.16, 1, 0.3, 1)' }}
            strokeLinecap="round"
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="font-mono text-sm font-bold text-white tracking-tight leading-none">
            {displayVal !== null ? displayVal : '--'}
          </span>
          {unit && <span className="text-[9px] font-mono text-slate-400 leading-none mt-0.5">{unit}</span>}
        </div>
      </div>
    );
  };

  return (
    <section className="mb-6 space-y-3">
      {/* Bento Grid 4 Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Bento 1: Readiness & Récupération */}
        <div className="telemetry-card p-4 rounded-2xl flex flex-col justify-between space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#00A7E1] animate-pulse" />
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#00A7E1]">
                Score de Préparation
              </span>
            </div>
            <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-[#00A7E1]/15 text-[#00A7E1] border border-[#00A7E1]/30">
              {isSynced ? 'GARMIN CONNECTÉ' : 'ESTIMATION'}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <RenderCircularProgress
              value={readiness}
              color="#00A7E1"
              label="Readiness"
              unit="/100"
            />
            <div className="space-y-1">
              <div className="text-xs font-bold text-white">
                {readiness >= 75 ? 'Forme Optimale' : readiness >= 50 ? 'Modéré' : 'Récupération'}
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">
                Capacité aérobie prête pour fractionné ou tempo.
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-white/[0.04] flex items-center justify-between text-[10px] font-mono text-slate-400">
            <span>Seuil d'effort : &gt; 65</span>
            <span className="text-[#00A7E1] font-bold">FEU VERT</span>
          </div>
        </div>

        {/* Bento 2: Sommeil Architecture */}
        <div className="telemetry-card p-4 rounded-2xl flex flex-col justify-between space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Moon className="w-3.5 h-3.5 text-[#A855F7]" />
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#A855F7]">
                Sommeil & Récup
              </span>
            </div>
            <span className="text-[10px] font-mono font-bold text-white">
              {sleepHours}h
            </span>
          </div>

          <div className="flex items-center gap-4">
            <RenderCircularProgress
              value={sleepScore}
              color="#A855F7"
              label="Score Sommeil"
              unit="/100"
            />
            <div className="space-y-1">
              <div className="text-xs font-bold text-white">Score {sleepScore}/100</div>
              <div className="text-[11px] font-mono text-slate-400">
                Profond : <span className="text-slate-200">1h35</span> • REM : <span className="text-slate-200">2h10</span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-white/[0.04] flex items-center justify-between text-[10px] font-mono text-slate-400">
            <span>Régularité</span>
            <span className="text-[#10B981] font-bold">+12 min vs moyenne</span>
          </div>
        </div>

        {/* Bento 3: HRV Sparkline 7 Jours */}
        <div className="telemetry-card p-4 rounded-2xl flex flex-col justify-between space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-[#10B981]" />
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#10B981]">
                VFC / HRV 7 Jours
              </span>
            </div>
            <span className="text-[10px] font-mono font-bold text-[#10B981]">
              68 ms (Équilibré)
            </span>
          </div>

          {/* Mini Sparkline Recharts */}
          <div className="h-16 w-full -mx-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hrvTrendData}>
                <defs>
                  <linearGradient id="hrvGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#10B981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" hide />
                <YAxis domain={['dataMin - 5', 'dataMax + 5']} hide />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="p-1.5 rounded bg-[#0F141F] border border-white/10 text-[10px] font-mono text-white">
                          {payload[0].payload.day} : <span className="text-[#10B981] font-bold">{payload[0].value} ms</span>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="hrv"
                  stroke="#10B981"
                  strokeWidth={2}
                  fill="url(#hrvGlow)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="pt-2 border-t border-white/[0.04] flex items-center justify-between text-[10px] font-mono text-slate-400">
            <span>Plage normale : 58-72 ms</span>
            <span className="text-white font-bold flex items-center gap-0.5">
              <TrendingUp className="w-3 h-3 text-[#10B981]" /> Stable
            </span>
          </div>
        </div>

        {/* Bento 4: Body Battery & Stress */}
        <div className="telemetry-card p-4 rounded-2xl flex flex-col justify-between space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-[#F59E0B]" />
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#F59E0B]">
                Body Battery & Stress
              </span>
            </div>
            <span className="text-[10px] font-mono font-bold text-[#F59E0B]">
              {bodyBattery}%
            </span>
          </div>

          <div className="space-y-2">
            <div>
              <div className="flex justify-between text-[11px] font-mono text-slate-300 mb-1">
                <span>Réserves d'énergie</span>
                <span className="text-white font-bold">{bodyBattery}%</span>
              </div>
              <div className="h-2 w-full bg-[#171D2A] rounded-full overflow-hidden border border-white/[0.04]">
                <div
                  style={{ width: `${bodyBattery}%` }}
                  className="h-full rounded-full bg-gradient-to-r from-[#F59E0B] to-[#10B981] transition-all duration-700"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 text-center font-mono">
              <div className="p-1.5 rounded-lg bg-[#0F141F] border border-white/[0.04]">
                <div className="text-[9px] text-slate-400 uppercase">FC Repos</div>
                <div className="text-xs font-bold text-white flex items-center justify-center gap-1">
                  <Heart className="w-2.5 h-2.5 text-rose-400" />
                  {rhr} bpm
                </div>
              </div>
              <div className="p-1.5 rounded-lg bg-[#0F141F] border border-white/[0.04]">
                <div className="text-[9px] text-slate-400 uppercase">Stress</div>
                <div className="text-xs font-bold text-white flex items-center justify-center gap-1">
                  <Smile className="w-2.5 h-2.5 text-sky-400" />
                  {stress}/100
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-white/[0.04] flex items-center justify-between text-[10px] font-mono text-slate-400">
            <span>Recharge nocturne</span>
            <span className="text-[#10B981] font-bold">+58 pts</span>
          </div>
        </div>
      </div>
    </section>
  );
};
