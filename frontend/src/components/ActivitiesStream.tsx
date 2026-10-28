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
      <div className="telemetry-card p-4 rounded-2xl mb-4 space-y-3">
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
    <div className="telemetry-card p-4 sm:p-5 rounded-2xl mb-4 text-slate-200">
      <div className="flex items-center justify-between mb-3.5 pb-2.5 border-b border-white/[0.07]">
        <div className="flex items-center gap-2">
          <ActivityIcon className="w-4 h-4 text-[#00A7E1]" />
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
            Flux Télémétrique des Activités
          </h3>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="text-[11px] font-mono font-semibold text-slate-400 hover:text-[#00A7E1] flex items-center gap-1 transition-colors"
          >
            <RefreshCw className="w-3 h-3" /> Garmin Sync
          </button>
        )}
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

            const isClara = act.athlete_id === 'clara' || (act as any).athlete_name === 'Clara';
            const athleteBadge = isClara
              ? 'bg-[#F43F5E]/15 text-[#F43F5E] border-[#F43F5E]/30'
              : 'bg-[#00A7E1]/15 text-[#00A7E1] border-[#00A7E1]/30';

            return (
              <div
                key={act.id || index}
                onClick={() => onSelectActivity?.(act.id)}
                className="p-3 rounded-xl bg-[#0F141F] hover:bg-[#151D2C] border border-white/[0.04] hover:border-white/[0.12] transition-all flex items-center justify-between gap-3 group cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-[#171D2A] border border-white/[0.08] flex items-center justify-center text-lg flex-shrink-0">
                    {sportIcon}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.2 rounded border ${athleteBadge}`}>
                        {isClara ? 'Clara' : 'Louis'}
                      </span>
                      <h4 className="text-xs font-bold text-slate-100 truncate group-hover:text-[#00A7E1] transition-colors">
                        {act.name}
                      </h4>
                    </div>
                    <div className="flex items-center gap-2 text-[10.5px] font-mono text-slate-400 mt-0.5">
                      <span>{act.date}</span>
                      <span>•</span>
                      <span>{act.time}</span>
                      {act.avg_hr && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-[#F43F5E] font-bold">
                            <Heart className="w-2.5 h-2.5" />
                            {act.avg_hr} bpm
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right flex-shrink-0 font-mono">
                  <div className="text-xs font-bold text-white">
                    {act.distance_km > 0 ? `${act.distance_km} km` : `${act.duration_minutes} min`}
                  </div>
                  {act.speed_kmh ? (
                    <div className="text-[10px] text-slate-400">
                      {act.speed_kmh} km/h
                    </div>
                  ) : (
                    <div className="text-[10px] text-slate-400">
                      {act.duration_minutes} min
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
