import React from 'react';
import { Activity as ActivityIcon, Heart, RefreshCw, ChevronRight } from 'lucide-react';
import type { Activity } from '../types';

interface RecentActivitiesProps {
  activities: Activity[];
  loading: boolean;
  onSelectActivity?: (id: number | string) => void;
  onRefresh?: () => void;
}

export const RecentActivities: React.FC<RecentActivitiesProps> = ({
  activities,
  loading,
  onSelectActivity,
  onRefresh,
}) => {
  return (
    <div className="matte-card rounded-2xl p-4 sm:p-5 space-y-3.5 text-slate-200">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-[#1E2535]">
        <div className="flex items-center gap-2">
          <ActivityIcon className="w-4 h-4 text-[#3FA372]" />
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide">
              Sorties Récentes Synchronisées
            </h3>
            <p className="text-[11px] text-slate-400">Activités Garmin enregistrées</p>
          </div>
        </div>

        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors"
            title="Rafraîchir les activités"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#3FA372]' : ''}`} />
          </button>
        )}
      </div>

      {/* List */}
      {activities.length === 0 ? (
        <div className="p-6 text-center text-xs text-slate-500 bg-[#121622] rounded-xl border border-[#1E2535]">
          {loading ? 'Chargement des activités Garmin...' : 'Aucune sortie enregistrée cette semaine.'}
        </div>
      ) : (
        <div className="space-y-2">
          {activities.slice(0, 5).map((act, idx) => {
            const isClara = act.athlete_id === 'clara' || (act as any).athlete_name === 'Clara';
            const athleteLabel = isClara ? 'Clara' : 'Louis';
            const athleteBadgeStyle = isClara
              ? 'bg-[#9D78DE]/15 text-[#9D78DE] border-[#9D78DE]/30'
              : 'bg-[#E0583A]/15 text-[#E0583A] border-[#E0583A]/30';

            const isRunning = act.sport?.toLowerCase().includes('running') || act.sport?.toLowerCase().includes('course');
            const isCycling = act.sport?.toLowerCase().includes('cycling') || act.sport?.toLowerCase().includes('cyclisme');
            const sportIcon = isRunning ? '🏃' : isCycling ? '🚴' : '⚡';

            return (
              <div
                key={act.id || idx}
                onClick={() => onSelectActivity?.(act.id)}
                className="p-3 rounded-xl matte-card-subtle matte-card-hover flex items-center justify-between gap-3 cursor-pointer group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-lg flex-shrink-0">{sportIcon}</span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded border ${athleteBadgeStyle}`}>
                        {athleteLabel}
                      </span>
                      <span className="text-xs font-bold text-white truncate group-hover:text-[#4EA8DE] transition-colors">
                        {act.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[10.5px] text-slate-400 mt-0.5">
                      <span>{act.date}</span>
                      <span>•</span>
                      <span>{act.duration_minutes} min</span>
                      {act.avg_hr && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-0.5 text-slate-300 font-mono">
                            <Heart className="w-2.5 h-2.5 text-[#E0583A]" />
                            {act.avg_hr} bpm
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0 text-right">
                  <div>
                    <div className="text-xs font-bold font-mono text-white">
                      {act.distance_km > 0 ? `${act.distance_km} km` : `${act.duration_minutes} min`}
                    </div>
                    {act.speed_kmh ? (
                      <div className="text-[10px] font-mono text-slate-400">
                        {act.speed_kmh} km/h
                      </div>
                    ) : null}
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-300 transition-colors" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
