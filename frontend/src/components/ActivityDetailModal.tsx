import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
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
  Calendar,
  Sun,
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

  const zoneColors = [
    'var(--color-metric-neutral)',
    'var(--color-athlete-cyan)',
    'var(--color-metric-good)',
    'var(--color-duo)',
    'var(--color-athlete-coral)',
  ];

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
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AnimatePresence>
        <Dialog.Portal forceMount>
          {/* Backdrop */}
          <Dialog.Overlay asChild>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-bg/85 backdrop-blur-md"
            />
          </Dialog.Overlay>

          {/* Modal Window */}
          <Dialog.Content asChild>
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ type: 'spring', duration: 0.35 }}
              className="relative w-full max-w-4xl max-h-[92vh] m-auto flex flex-col rounded-card bg-surface-1 border border-border shadow-2xl overflow-hidden z-10 text-ink focus:outline-none"
            >
              {/* Header */}
              <div className="p-5 sm:p-6 border-b border-border bg-surface-2 flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div
                    className={`w-12 h-12 rounded-tile flex items-center justify-center shadow-lg ${
                      isRunning
                        ? 'bg-athlete-cyan/20 border border-athlete-cyan/40 text-athlete-cyan shadow-[0_0_12px_-2px_rgba(37,99,235,0.30)]'
                        : isCycling
                        ? 'bg-metric-good/20 border border-metric-good/40 text-metric-good shadow-[0_0_12px_-2px_rgba(52,211,153,0.35)]'
                        : 'bg-duo/20 border border-duo/40 text-duo'
                    }`}
                  >
                    <ActivityIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <Dialog.Title className="text-title font-bold text-ink tracking-tight">
                        {activity.name}
                      </Dialog.Title>
                      <span className="text-micro font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-tile bg-surface-3 text-ink border border-border">
                        {activity.sport}
                      </span>
                    </div>
                    <Dialog.Description className="text-xs text-ink-muted mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {activity.date}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {activity.time}
                      </span>
                      {activity.weather?.temperature_c && (
                        <span className="inline-flex items-center gap-1">
                          <Sun className="w-3 h-3" /> {activity.weather.temperature_c}°C ({activity.weather.condition || 'Dégagé'})
                        </span>
                      )}
                    </Dialog.Description>
                  </div>
                </div>

                <Dialog.Close asChild>
                  <button
                    className="p-2 rounded-tile text-ink-muted hover:text-ink hover:bg-surface-3 transition-colors"
                    aria-label="Fermer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </Dialog.Close>
              </div>

              {/* Scrollable Content */}
              <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
                {/* Top Metric Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-card bg-surface-2 border border-border">
                    <span className="text-micro font-mono font-bold uppercase tracking-wider text-ink-muted flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-athlete-cyan" />
                      Distance & Durée
                    </span>
                    <div className="text-hero font-bold font-mono text-ink mt-1">
                      {activity.distance_km} <span className="text-xs font-normal text-ink-muted">km</span>
                    </div>
                    <div className="text-label font-mono text-athlete-cyan mt-0.5">
                      {activity.duration_formatted}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-card bg-surface-2 border border-border">
                    <span className="text-micro font-mono font-bold uppercase tracking-wider text-ink-muted flex items-center gap-1.5">
                      <Gauge className="w-3 h-3 text-duo" />
                      {isRunning ? 'Allure Moyenne' : 'Vitesse Moyenne'}
                    </span>
                    <div className="text-hero font-bold font-mono text-ink mt-1">
                      {isRunning ? activity.avg_pace : `${activity.avg_speed_kmh} km/h`}
                    </div>
                    <div className="text-label font-mono text-ink-muted mt-0.5">
                      Max : {activity.max_speed_kmh ? `${activity.max_speed_kmh} km/h` : '--'}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-card bg-surface-2 border border-border">
                    <span className="text-micro font-mono font-bold uppercase tracking-wider text-ink-muted flex items-center gap-1.5">
                      <Heart className="w-3 h-3 text-athlete-coral" />
                      Fréquence Cardiaque
                    </span>
                    <div className="text-hero font-bold font-mono text-athlete-coral mt-1">
                      {activity.avg_hr || '--'} <span className="text-xs font-normal text-ink-muted">bpm</span>
                    </div>
                    <div className="text-label font-mono text-ink-muted mt-0.5">
                      Pic Max : {activity.max_hr ? `${activity.max_hr} bpm` : '--'}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-card bg-surface-2 border border-border">
                    <span className="text-micro font-mono font-bold uppercase tracking-wider text-ink-muted flex items-center gap-1.5">
                      <Mountain className="w-3 h-3 text-athlete-cyan" />
                      Dénivelé & Calories
                    </span>
                    <div className="text-hero font-bold font-mono text-athlete-cyan mt-1">
                      +{activity.elevation.gain_m} <span className="text-xs font-normal text-ink-muted">m</span>
                    </div>
                    <div className="text-label font-mono text-ink-muted mt-0.5">
                      {activity.calories} kcal
                    </div>
                  </div>
                </div>

                {/* Biomechanics & Training Effect */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-4 rounded-card bg-surface-2 border border-border space-y-2">
                    <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-ink flex items-center gap-2">
                      <Compass className="w-4 h-4 text-athlete-cyan" />
                      Biomécanique & Foulée
                    </h3>
                    <div className="grid grid-cols-3 gap-2 pt-1 text-center font-mono">
                      <div className="p-2.5 rounded-tile bg-surface-2 border border-border">
                        <span className="text-micro text-ink-muted block uppercase">Cadence Moy</span>
                        <span className="text-sm font-bold text-ink">
                          {activity.biomechanics.avg_cadence_spm || '--'} <span className="text-micro text-ink-muted">spm</span>
                        </span>
                      </div>
                      <div className="p-2.5 rounded-tile bg-surface-2 border border-border">
                        <span className="text-micro text-ink-muted block uppercase">Cadence Max</span>
                        <span className="text-sm font-bold text-ink">
                          {activity.biomechanics.max_cadence_spm || '--'} <span className="text-micro text-ink-muted">spm</span>
                        </span>
                      </div>
                      <div className="p-2.5 rounded-tile bg-surface-2 border border-border">
                        <span className="text-micro text-ink-muted block uppercase">Foulée</span>
                        <span className="text-sm font-bold text-athlete-cyan">
                          {activity.biomechanics.stride_length_cm || '--'} <span className="text-micro text-ink-muted">cm</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-card bg-surface-2 border border-border space-y-2">
                    <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-ink flex items-center gap-2">
                      <Zap className="w-4 h-4 text-duo" />
                      Training Effect (Garmin)
                    </h3>
                    <div className="grid grid-cols-2 gap-2 pt-1 font-mono">
                      <div className="p-2.5 rounded-tile bg-surface-2 border border-border flex items-center justify-between">
                        <div>
                          <span className="text-micro text-ink-muted block uppercase">Aérobie</span>
                          <span className="text-sm font-bold text-athlete-cyan">
                            {activity.training_effect?.aerobic?.toFixed(1) || '--'} / 5.0
                          </span>
                        </div>
                        <Flame className="w-4 h-4 text-athlete-cyan" />
                      </div>
                      <div className="p-2.5 rounded-tile bg-surface-2 border border-border flex items-center justify-between">
                        <div>
                          <span className="text-micro text-ink-muted block uppercase">Anaérobie</span>
                          <span className="text-sm font-bold text-athlete-coral">
                            {activity.training_effect?.anaerobic?.toFixed(1) || '--'} / 5.0
                          </span>
                        </div>
                        <Zap className="w-4 h-4 text-athlete-coral" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Heart Rate Zones Distribution (Stacked Bar with Recharts) */}
                {activity.hr_zones && activity.hr_zones.length > 0 && (
                  <div className="p-4 rounded-card bg-surface-2 border border-border space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-ink flex items-center gap-2">
                        <BarChart2 className="w-4 h-4 text-athlete-coral" />
                        Répartition par Zone Cardiaque (Barres Superposées)
                      </h3>
                      <span className="text-micro font-mono text-ink-muted">Total 100%</span>
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
                                  <div className="p-2 rounded-tile bg-surface-2 border border-border-strong text-xs font-mono text-ink shadow-xl space-y-1">
                                    <div className="font-bold text-ink">Temps passé en Zones :</div>
                                    {activity.hr_zones.map((z, idx) => (
                                      <div key={idx} className="flex items-center justify-between gap-3 text-label">
                                        <span style={{ color: zoneColors[idx] }}>Zone {z.zone_number} ({z.zone_name}) :</span>
                                        <span className="font-bold">{z.duration_formatted} ({z.percent}%)</span>
                                      </div>
                                    ))}
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Bar dataKey="Z1" stackId="hr" fill="var(--color-metric-neutral)" radius={[4, 0, 0, 4]} />
                          <Bar dataKey="Z2" stackId="hr" fill="var(--color-athlete-cyan)" />
                          <Bar dataKey="Z3" stackId="hr" fill="var(--color-metric-good)" />
                          <Bar dataKey="Z4" stackId="hr" fill="var(--color-duo)" />
                          <Bar dataKey="Z5" stackId="hr" fill="var(--color-athlete-coral)" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Legend Chips with Detailed BPM */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1 font-mono">
                      {activity.hr_zones.map((zone, idx) => (
                        <div
                          key={zone.zone_number}
                          className="p-2 rounded-tile bg-surface-2 border border-border text-center"
                        >
                          <div className="text-micro font-bold text-ink-muted flex items-center justify-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-pill" style={{ backgroundColor: zoneColors[idx] }} />
                            Z{zone.zone_number} {zone.low_boundary_bpm ? `≥${zone.low_boundary_bpm}` : ''}
                          </div>
                          <div className="text-xs font-bold text-ink mt-0.5">
                            {zone.duration_formatted}
                          </div>
                          <div className="text-micro text-ink-muted">
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
                      <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-ink flex items-center gap-2">
                        <Clock className="w-4 h-4 text-athlete-cyan" />
                        Découpage Kilométrique ({activity.laps.length} Laps)
                      </h3>
                      <span className="text-label font-mono text-ink-muted">
                        Garmin Precision
                      </span>
                    </div>

                    <div className="rounded-card border border-border overflow-hidden bg-surface-2">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs font-mono text-ink">
                          <thead className="bg-surface-2 text-micro uppercase font-bold text-ink-muted tracking-wider">
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
                          <tbody className="divide-y divide-border">
                            {activity.laps.map((lap) => {
                              const isFastest = lap.pace && (lap.pace.includes('03:') || lap.pace.includes('3:'));
                              return (
                                <tr
                                  key={lap.lap_number}
                                  className={`hover:bg-white/[0.02] transition-colors ${
                                    isFastest ? 'bg-athlete-cyan/10 font-bold' : ''
                                  }`}
                                >
                                  <td className="px-4 py-2.5">
                                    <span className="w-5 h-5 rounded-tile bg-surface-3 inline-flex items-center justify-center text-micro font-bold text-ink">
                                      {lap.lap_number}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2.5">{lap.distance_km} km</td>
                                  <td className="px-4 py-2.5 font-bold text-athlete-cyan">
                                    {lap.pace || `${lap.speed_kmh} km/h`}
                                  </td>
                                  <td className="px-4 py-2.5">
                                    <span className={lap.avg_hr && lap.avg_hr > 175 ? 'text-athlete-coral font-bold' : 'text-ink'}>
                                      {lap.avg_hr ? `${lap.avg_hr} bpm` : '--'}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2.5 text-ink-muted">
                                    {lap.max_hr ? `${lap.max_hr} bpm` : '--'}
                                  </td>
                                  <td className="px-4 py-2.5 text-ink">
                                    {lap.avg_cadence ? `${lap.avg_cadence} spm` : '--'}
                                  </td>
                                  <td className="px-4 py-2.5 text-duo">
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
              <div className="p-4 border-t border-border bg-surface-2 flex items-center justify-between gap-4">
                <span className="text-label font-mono text-ink-muted hidden sm:inline">
                  Fichier FIT officiel Garmin Connect analysé.
                </span>
                <div className="flex items-center gap-2.5 ml-auto">
                  <button
                    onClick={onClose}
                    className="px-5 py-2 rounded-tile text-xs font-semibold btn-ghost"
                  >
                    Fermer
                  </button>
                </div>
              </div>
            </motion.div>
          </Dialog.Content>
        </Dialog.Portal>
      </AnimatePresence>
    </Dialog.Root>
  );
};
