import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Activity as ActivityIcon,
  Heart,
  Flame,
  Zap,
  Mountain,
  Compass,
  Clock,
  Gauge,
  BarChart2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import type { DetailedActivity } from '../types';

interface ActivityDetailModalProps {
  activity: DetailedActivity | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ActivityDetailModal: React.FC<ActivityDetailModalProps> = ({
  activity,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !activity) return null;

  const isRunning = activity.sport.toLowerCase().includes('run');
  const isCycling = activity.sport.toLowerCase().includes('cycl') || activity.sport.toLowerCase().includes('bike');

  const zoneColorsHex = ['#64748B', '#00A7E1', '#10B981', '#F59E0B', '#F43F5E'];

  // Prepare stacked data for Recharts
  const stackedZoneData = [
    {
      name: 'Zones de FC',
      Z1: activity.hr_zones?.[0]?.percent ?? 0,
      Z2: activity.hr_zones?.[1]?.percent ?? 0,
      Z3: activity.hr_zones?.[2]?.percent ?? 0,
      Z4: activity.hr_zones?.[3]?.percent ?? 0,
      Z5: activity.hr_zones?.[4]?.percent ?? 0,
    },
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-[#070A10]/85 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ type: 'spring', duration: 0.35 }}
          className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl bg-[#0E131D] border border-white/[0.08] shadow-2xl overflow-hidden z-10 text-slate-200"
        >
          {/* Header */}
          <div className="p-5 sm:p-6 border-b border-white/[0.08] bg-[#121722] flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${
                  isRunning
                    ? 'bg-[#00A7E1]/20 border border-[#00A7E1]/40 text-[#00A7E1] shadow-[0_0_15px_rgba(0,167,225,0.2)]'
                    : isCycling
                    ? 'bg-[#10B981]/20 border border-[#10B981]/40 text-[#10B981] shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                    : 'bg-[#A855F7]/20 border border-[#A855F7]/40 text-[#A855F7]'
                }`}
              >
                <ActivityIcon className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                    {activity.name}
                  </h2>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#171D2A] text-slate-300 border border-white/[0.08]">
                    {activity.sport}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono">
                  <span>📅 {activity.date}</span>
                  <span>⏰ {activity.time}</span>
                  {activity.weather?.temperature_c && (
                    <span>☀️ {activity.weather.temperature_c}°C ({activity.weather.condition || 'Dégagé'})</span>
                  )}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
            {/* Top Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-2xl bg-[#121722] border border-white/[0.06]">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-[#00A7E1]" />
                  Distance & Durée
                </span>
                <div className="text-xl sm:text-2xl font-bold font-mono text-white mt-1">
                  {activity.distance_km} <span className="text-xs font-normal text-slate-400">km</span>
                </div>
                <div className="text-[11px] font-mono text-[#00A7E1] mt-0.5">
                  {activity.duration_formatted}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#121722] border border-white/[0.06]">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Gauge className="w-3 h-3 text-[#F59E0B]" />
                  {isRunning ? 'Allure Moyenne' : 'Vitesse Moyenne'}
                </span>
                <div className="text-xl sm:text-2xl font-bold font-mono text-white mt-1">
                  {isRunning ? activity.avg_pace : `${activity.avg_speed_kmh} km/h`}
                </div>
                <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                  Max : {activity.max_speed_kmh ? `${activity.max_speed_kmh} km/h` : '--'}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#121722] border border-white/[0.06]">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Heart className="w-3 h-3 text-[#F43F5E]" />
                  Fréquence Cardiaque
                </span>
                <div className="text-xl sm:text-2xl font-bold font-mono text-[#F43F5E] mt-1">
                  {activity.avg_hr || '--'} <span className="text-xs font-normal text-slate-400">bpm</span>
                </div>
                <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                  Pic Max : {activity.max_hr ? `${activity.max_hr} bpm` : '--'}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#121722] border border-white/[0.06]">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Mountain className="w-3 h-3 text-[#A855F7]" />
                  Dénivelé & Calories
                </span>
                <div className="text-xl sm:text-2xl font-bold font-mono text-[#A855F7] mt-1">
                  +{activity.elevation.gain_m} <span className="text-xs font-normal text-slate-400">m</span>
                </div>
                <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                  {activity.calories} kcal
                </div>
              </div>
            </div>

            {/* Biomechanics & Training Effect */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-4 rounded-2xl bg-[#121722] border border-white/[0.06] space-y-2">
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <Compass className="w-4 h-4 text-[#00A7E1]" />
                  Biomécanique & Foulée
                </h3>
                <div className="grid grid-cols-3 gap-2 pt-1 text-center font-mono">
                  <div className="p-2.5 rounded-xl bg-[#0F141F] border border-white/[0.04]">
                    <span className="text-[9px] text-slate-400 block uppercase">Cadence Moy</span>
                    <span className="text-sm font-bold text-white">
                      {activity.biomechanics.avg_cadence_spm || '--'} <span className="text-[9px] text-slate-400">spm</span>
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#0F141F] border border-white/[0.04]">
                    <span className="text-[9px] text-slate-400 block uppercase">Cadence Max</span>
                    <span className="text-sm font-bold text-white">
                      {activity.biomechanics.max_cadence_spm || '--'} <span className="text-[9px] text-slate-400">spm</span>
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#0F141F] border border-white/[0.04]">
                    <span className="text-[9px] text-slate-400 block uppercase">Foulée</span>
                    <span className="text-sm font-bold text-[#00A7E1]">
                      {activity.biomechanics.stride_length_cm || '--'} <span className="text-[9px] text-slate-400">cm</span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#121722] border border-white/[0.06] space-y-2">
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-[#F59E0B]" />
                  Training Effect (Garmin)
                </h3>
                <div className="grid grid-cols-2 gap-2 pt-1 font-mono">
                  <div className="p-2.5 rounded-xl bg-[#0F141F] border border-white/[0.04] flex items-center justify-between">
                    <div>
                      <span className="text-[9px] text-slate-400 block uppercase">Aérobie</span>
                      <span className="text-sm font-bold text-[#00A7E1]">
                        {activity.training_effect?.aerobic?.toFixed(1) || '--'} / 5.0
                      </span>
                    </div>
                    <Flame className="w-4 h-4 text-[#00A7E1]" />
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#0F141F] border border-white/[0.04] flex items-center justify-between">
                    <div>
                      <span className="text-[9px] text-slate-400 block uppercase">Anaérobie</span>
                      <span className="text-sm font-bold text-[#F43F5E]">
                        {activity.training_effect?.anaerobic?.toFixed(1) || '--'} / 5.0
                      </span>
                    </div>
                    <Zap className="w-4 h-4 text-[#F43F5E]" />
                  </div>
                </div>
              </div>
            </div>

            {/* Heart Rate Zones Distribution (Stacked Bar with Recharts) */}
            {activity.hr_zones && activity.hr_zones.length > 0 && (
              <div className="p-4 rounded-2xl bg-[#121722] border border-white/[0.06] space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <BarChart2 className="w-4 h-4 text-[#F43F5E]" />
                    Répartition par Zone Cardiaque (Barres Superposées)
                  </h3>
                  <span className="text-[10px] font-mono text-slate-400">Total 100%</span>
                </div>

                {/* Stacked Horizontal Bar using Recharts */}
                <div className="h-8 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={stackedZoneData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                      <XAxis type="number" domain={[0, 100]} hide />
                      <YAxis type="category" dataKey="name" hide />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="p-2 rounded-lg bg-[#0F141F] border border-white/10 text-xs font-mono text-white shadow-xl space-y-1">
                                <div className="font-bold text-slate-300">Temps passé en Zones :</div>
                                {activity.hr_zones.map((z, idx) => (
                                  <div key={idx} className="flex items-center justify-between gap-3 text-[11px]">
                                    <span style={{ color: zoneColorsHex[idx] }}>Zone {z.zone_number} ({z.zone_name}) :</span>
                                    <span className="font-bold">{z.duration_formatted} ({z.percent}%)</span>
                                  </div>
                                ))}
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="Z1" stackId="hr" fill="#64748B" radius={[4, 0, 0, 4]} />
                      <Bar dataKey="Z2" stackId="hr" fill="#00A7E1" />
                      <Bar dataKey="Z3" stackId="hr" fill="#10B981" />
                      <Bar dataKey="Z4" stackId="hr" fill="#F59E0B" />
                      <Bar dataKey="Z5" stackId="hr" fill="#F43F5E" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Legend Chips with Detailed BPM */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1 font-mono">
                  {activity.hr_zones.map((zone, idx) => (
                    <div
                      key={zone.zone_number}
                      className="p-2 rounded-xl bg-[#0F141F] border border-white/[0.04] text-center"
                    >
                      <div className="text-[10px] font-bold text-slate-400 flex items-center justify-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: zoneColorsHex[idx] }} />
                        Z{zone.zone_number} {zone.low_boundary_bpm ? `≥${zone.low_boundary_bpm}` : ''}
                      </div>
                      <div className="text-xs font-bold text-white mt-0.5">
                        {zone.duration_formatted}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {zone.percent}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Splits Table (Km by Km Laps) */}
            {activity.laps && activity.laps.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#00A7E1]" />
                    Découpage Kilométrique ({activity.laps.length} Laps)
                  </h3>
                  <span className="text-[11px] font-mono text-slate-400">
                    Garmin Precision
                  </span>
                </div>

                <div className="rounded-2xl border border-white/[0.06] overflow-hidden bg-[#121722]">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono text-slate-200">
                      <thead className="bg-[#0F141F] text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                        <tr>
                          <th className="px-4 py-2.5">Lap</th>
                          <th className="px-4 py-2.5">Distance</th>
                          <th className="px-4 py-2.5">{isRunning ? 'Allure' : 'Vitesse'}</th>
                          <th className="px-4 py-2.5">FC Moy</th>
                          <th className="px-4 py-2.5">FC Max</th>
                          <th className="px-4 py-2.5">Cadence</th>
                          <th className="px-4 py-2.5">Dénivelé</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.04]">
                        {activity.laps.map((lap) => {
                          const isFastest = lap.pace && (lap.pace.includes('03:') || lap.pace.includes('3:'));
                          return (
                            <tr
                              key={lap.lap_number}
                              className={`hover:bg-white/[0.02] transition-colors ${
                                isFastest ? 'bg-[#00A7E1]/10 font-bold' : ''
                              }`}
                            >
                              <td className="px-4 py-2.5">
                                <span className="w-5 h-5 rounded-md bg-[#171D2A] inline-flex items-center justify-center text-[10px] font-bold text-white">
                                  {lap.lap_number}
                                </span>
                              </td>
                              <td className="px-4 py-2.5">{lap.distance_km} km</td>
                              <td className="px-4 py-2.5 font-bold text-[#00A7E1]">
                                {lap.pace || `${lap.speed_kmh} km/h`}
                              </td>
                              <td className="px-4 py-2.5">
                                <span className={lap.avg_hr && lap.avg_hr > 175 ? 'text-[#F43F5E] font-bold' : 'text-slate-300'}>
                                  {lap.avg_hr ? `${lap.avg_hr} bpm` : '--'}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 text-slate-400">
                                {lap.max_hr ? `${lap.max_hr} bpm` : '--'}
                              </td>
                              <td className="px-4 py-2.5 text-slate-300">
                                {lap.avg_cadence ? `${lap.avg_cadence} spm` : '--'}
                              </td>
                              <td className="px-4 py-2.5 text-[#A855F7]">
                                +{lap.elevation_gain_m}m / -{lap.elevation_loss_m}m
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Action Bar */}
          <div className="p-4 border-t border-white/[0.08] bg-[#121722] flex items-center justify-between gap-4">
            <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
              Fichier FIT officiel Garmin Connect analysé.
            </span>
            <div className="flex items-center gap-2.5 ml-auto">
              <button
                onClick={onClose}
                className="px-5 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-[#171D2A] hover:bg-[#1E2638] transition-colors border border-white/[0.06]"
              >
                Fermer
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
