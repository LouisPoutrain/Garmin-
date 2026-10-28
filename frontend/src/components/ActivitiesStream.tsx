import React from 'react';
import { Activity as ActivityIcon, Heart, RefreshCw } from 'lucide-react';
import type { Activity } from '../types';
import { Skeleton } from './Skeleton';
import { EmptyState } from './EmptyState';

interface ActivitiesStreamProps {
  activities: Activity[];
  loading: boolean;
  onRefresh?: () => void;
  onSelectActivity?: (activityId: number | string) => void;
}

export const ActivitiesStream: React.FC<ActivitiesStreamProps> = ({
  activities,
  loading,
  onRefresh,
  onSelectActivity,
}) => {
  if (loading && activities.length === 0) {
    return (
      <div className="glass-panel p-4 rounded-2xl mb-4 space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-16" />
        </div>
        <Skeleton className="h-16 rounded-xl" />
        <Skeleton className="h-16 rounded-xl" />
        <Skeleton className="h-16 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="glass-panel p-4 rounded-2xl mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ActivityIcon className="w-4 h-4 text-[#FF5E36]" />
          <h3 className="text-sm font-bold text-white tracking-wide">
            Dernières Activités
          </h3>
        </div>
        <button
          onClick={onRefresh}
          className="text-[11px] font-semibold text-slate-400 hover:text-cyan-400 flex items-center gap-1 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400 rounded"
        >
          <RefreshCw className="w-3 h-3" /> Garmin Sync
        </button>
      </div>

      {activities.length === 0 ? (
        <EmptyState
          icon={ActivityIcon}
          title="Aucune séance récente"
          description="Les séances synchronisées sur Garmin Connect apparaîtront ici automatiquement."
          actionText="Actualiser"
          onAction={onRefresh}
        />
      ) : (
        <div className="space-y-2">
          {activities.map((act, index) => {
            const isCycling =
              act.sport.toLowerCase().includes('cycl') ||
              act.sport.toLowerCase().includes('bike');
            const isUltimate = act.sport.toLowerCase().includes('ultimate');
            const sportIcon = isUltimate ? '🥏' : isCycling ? '🚴' : '🏃‍♂️';

            const iconBorder = isUltimate
              ? 'border-purple-500/30 bg-purple-500/10'
              : isCycling
              ? 'border-cyan-500/30 bg-cyan-500/10'
              : 'border-orange-500/30 bg-orange-500/10';

            return (
              <div
                key={act.id || index}
                onClick={() => onSelectActivity?.(act.id)}
                className="p-3 rounded-xl bg-[#0E1320] hover:bg-[#141A29] border border-white/5 hover:border-cyan-500/30 transition-all flex items-center justify-between gap-3 group cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-xl border ${iconBorder} flex items-center justify-center text-lg shadow-sm group-hover:scale-105 transition-all flex-shrink-0`}>
                    {sportIcon}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-slate-100 truncate group-hover:text-cyan-300 transition-colors">
                      {act.name}
                    </h4>
                    <div className="flex items-center gap-2 text-[10.5px] text-slate-400 mt-0.5">
                      <span>{act.date}</span>
                      <span>•</span>
                      <span>{act.time}</span>
                      {act.avg_hr && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-rose-400 font-bold">
                            <Heart className="w-2.5 h-2.5 fill-rose-500 text-rose-500 animate-pulse" />
                            <span className="font-mono">{act.avg_hr}</span> bpm
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <div className="text-xs font-black font-mono text-white tracking-tight">
                    {act.distance_km > 0 ? `${act.distance_km} km` : `${act.duration_minutes} min`}
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 font-medium">
                    {act.duration_minutes} min {act.speed_kmh ? `• ${act.speed_kmh} km/h` : ''}
                  </div>
                  {act.aerobic_te !== undefined && act.aerobic_te !== null && (
                    <div className="mt-1 flex items-center justify-end gap-1">
                      <span className="text-[9px] font-black font-mono px-1.5 py-0.2 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                        TE {act.aerobic_te.toFixed(1)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
