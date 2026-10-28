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
} from 'lucide-react';
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

  const zoneColors = [
    'from-slate-600 to-slate-500', // Z1
    'from-sky-600 to-cyan-500',    // Z2
    'from-amber-600 to-yellow-500', // Z3
    'from-orange-600 to-orange-500', // Z4
    'from-rose-600 to-red-600',    // Z5
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
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', duration: 0.4 }}
          className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-white/10 shadow-2xl overflow-hidden z-10"
        >
          {/* Header */}
          <div className="p-6 border-b border-white/10 bg-slate-900/60 flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${
                  isRunning
                    ? 'bg-gradient-to-tr from-[#FF5E36] to-[#FF8C66] text-white shadow-[#FF5E36]/20'
                    : isCycling
                    ? 'bg-gradient-to-tr from-cyan-600 to-blue-500 text-white shadow-cyan-500/20'
                    : 'bg-gradient-to-tr from-purple-600 to-indigo-500 text-white shadow-purple-500/20'
                }`}
              >
                <ActivityIcon className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-xl font-extrabold text-white tracking-tight">
                    {activity.name}
                  </h2>
                  <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/10 text-slate-300 border border-white/10">
                    {activity.sport}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-3">
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
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="p-6 overflow-y-auto space-y-6">
            {/* Top Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                  Distance & Durée
                </span>
                <div className="text-2xl font-black text-white mt-1.5">
                  {activity.distance_km} <span className="text-sm font-semibold text-slate-400">km</span>
                </div>
                <div className="text-xs font-semibold text-cyan-300 mt-0.5">
                  {activity.duration_formatted} (mouv: {activity.moving_duration_formatted})
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Gauge className="w-3.5 h-3.5 text-[#FF5E36]" />
                  {isRunning ? 'Allure Moyenne' : 'Vitesse Moyenne'}
                </span>
                <div className="text-2xl font-black text-white mt-1.5">
                  {isRunning ? activity.avg_pace : `${activity.avg_speed_kmh} km/h`}
                </div>
                <div className="text-xs font-semibold text-slate-400 mt-0.5">
                  Max: {activity.max_speed_kmh ? `${activity.max_speed_kmh} km/h` : 'N/D'}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Heart className="w-3.5 h-3.5 text-rose-400" />
                  Fréquence Cardiaque
                </span>
                <div className="text-2xl font-black text-rose-300 mt-1.5">
                  {activity.avg_hr || 'N/D'} <span className="text-sm font-semibold text-slate-400">bpm</span>
                </div>
                <div className="text-xs font-semibold text-slate-400 mt-0.5">
                  Pic Max: {activity.max_hr ? `${activity.max_hr} bpm` : 'N/D'}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Mountain className="w-3.5 h-3.5 text-purple-400" />
                  Dénivelé & Calories
                </span>
                <div className="text-2xl font-black text-purple-300 mt-1.5">
                  +{activity.elevation.gain_m} <span className="text-sm font-semibold text-slate-400">m</span>
                </div>
                <div className="text-xs font-semibold text-slate-400 mt-0.5">
                  {activity.calories} kcal ({activity.elevation.loss_m ? `-${activity.elevation.loss_m}m` : ''})
                </div>
              </div>
            </div>

            {/* Biomechanics & Training Effect */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <Compass className="w-4 h-4 text-cyan-400" />
                  Biomécanique & Foulée
                </h3>
                <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                  <div className="p-2.5 rounded-xl bg-white/5">
                    <span className="text-[10px] text-slate-400 block font-medium">Cadence Moy</span>
                    <span className="text-base font-extrabold text-white">
                      {activity.biomechanics.avg_cadence_spm || 'N/D'} <span className="text-[10px] text-slate-400">spm</span>
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/5">
                    <span className="text-[10px] text-slate-400 block font-medium">Cadence Max</span>
                    <span className="text-base font-extrabold text-white">
                      {activity.biomechanics.max_cadence_spm || 'N/D'} <span className="text-[10px] text-slate-400">spm</span>
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/5">
                    <span className="text-[10px] text-slate-400 block font-medium">Foulée</span>
                    <span className="text-base font-extrabold text-cyan-300">
                      {activity.biomechanics.stride_length_cm || 'N/D'} <span className="text-[10px] text-slate-400">cm</span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  Training Effect (Garmin)
                </h3>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="p-2.5 rounded-xl bg-white/5 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Impact Aérobie</span>
                      <span className="text-base font-extrabold text-cyan-300">
                        {activity.training_effect?.aerobic?.toFixed(1) || 'N/D'} / 5.0
                      </span>
                    </div>
                    <Flame className="w-5 h-5 text-cyan-400/80" />
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/5 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Impact Anaérobie</span>
                      <span className="text-base font-extrabold text-rose-300">
                        {activity.training_effect?.anaerobic?.toFixed(1) || 'N/D'} / 5.0
                      </span>
                    </div>
                    <Zap className="w-5 h-5 text-rose-400/80" />
                  </div>
                </div>
              </div>
            </div>

            {/* Heart Rate Zones Distribution */}
            {activity.hr_zones && activity.hr_zones.length > 0 && (
              <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <Heart className="w-4 h-4 text-rose-400" />
                  Répartition du Temps par Zone Cardiaque
                </h3>
                
                {/* Horizontal Segmented Bar */}
                <div className="h-4 rounded-full overflow-hidden flex bg-slate-800">
                  {activity.hr_zones.map((zone, idx) => (
                    <div
                      key={zone.zone_number}
                      style={{ width: `${Math.max(zone.percent, 0.5)}%` }}
                      title={`${zone.zone_name}: ${zone.duration_formatted} (${zone.percent}%)`}
                      className={`h-full bg-gradient-to-r ${zoneColors[idx % zoneColors.length]} transition-all`}
                    />
                  ))}
                </div>

                {/* Legend Chips */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
                  {activity.hr_zones.map((zone) => (
                    <div
                      key={zone.zone_number}
                      className="p-2 rounded-xl bg-white/5 border border-white/5 text-center"
                    >
                      <div className="text-[10px] font-bold text-slate-400 truncate">
                        Z{zone.zone_number} {zone.low_boundary_bpm ? `(≥${zone.low_boundary_bpm} bpm)` : ''}
                      </div>
                      <div className="text-xs font-extrabold text-white mt-0.5">
                        {zone.duration_formatted}
                      </div>
                      <div className="text-[10px] font-semibold text-slate-400">
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
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-cyan-400" />
                    Découpage Kilomètre par Kilomètre ({activity.laps.length} Laps)
                  </h3>
                  <span className="text-[11px] text-slate-400 font-medium">
                    Précision officielle Garmin Connect
                  </span>
                </div>

                <div className="rounded-2xl border border-white/10 overflow-hidden bg-slate-900/40">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-200">
                      <thead className="bg-white/5 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                        <tr>
                          <th className="px-4 py-3">Lap</th>
                          <th className="px-4 py-3">Distance</th>
                          <th className="px-4 py-3">{isRunning ? 'Allure' : 'Vitesse'}</th>
                          <th className="px-4 py-3">FC Moyenne</th>
                          <th className="px-4 py-3">FC Max</th>
                          <th className="px-4 py-3">Cadence</th>
                          <th className="px-4 py-3">Dénivelé</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 font-medium">
                        {activity.laps.map((lap) => {
                          const isFastest = lap.pace && (lap.pace.includes('03:') || lap.pace.includes('3:'));
                          return (
                            <tr
                              key={lap.lap_number}
                              className={`hover:bg-white/[0.04] transition-colors ${
                                isFastest ? 'bg-cyan-500/10 font-bold' : ''
                              }`}
                            >
                              <td className="px-4 py-2.5">
                                <span className="w-6 h-6 rounded-full bg-white/10 inline-flex items-center justify-center text-xs font-bold text-white">
                                  {lap.lap_number}
                                </span>
                              </td>
                              <td className="px-4 py-2.5">{lap.distance_km} km</td>
                              <td className="px-4 py-2.5 font-bold text-cyan-300">
                                {lap.pace || `${lap.speed_kmh} km/h`}
                                {isFastest && (
                                  <span className="ml-1.5 text-[10px] px-1.5 py-0.2 rounded bg-cyan-400/20 text-cyan-300">
                                    Fast
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-2.5">
                                <span className={lap.avg_hr && lap.avg_hr > 175 ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                                  {lap.avg_hr ? `${lap.avg_hr} bpm` : 'N/D'}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 text-slate-400">
                                {lap.max_hr ? `${lap.max_hr} bpm` : 'N/D'}
                              </td>
                              <td className="px-4 py-2.5 text-slate-300">
                                {lap.avg_cadence ? `${lap.avg_cadence} spm` : 'N/D'}
                              </td>
                              <td className="px-4 py-2.5 text-purple-300">
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
          <div className="p-4 border-t border-white/10 bg-slate-900/80 flex items-center justify-between gap-4">
            <span className="text-xs text-slate-400 hidden sm:inline">
              Données synchronisées avec les fichiers FIT Garmin Connect.
            </span>
            <div className="flex items-center gap-2.5 ml-auto">
              <button
                onClick={onClose}
                className="px-5 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 transition-colors border border-white/10"
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
