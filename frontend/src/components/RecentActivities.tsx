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
    <div className="telemetry-card rounded-2xl p-4 sm:p-5 space-y-3.5 text-slate-200">
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-white/[0.07]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#171D2A] border border-white/[0.08] flex items-center justify-center text-[#10B981]">
            <ActivityIcon className="w-4 h-4 text-[#10B981]" />
          </div>
          <div>
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
              Télémétrie des Sorties Récentes
            </h3>
            <p className="text-[11px] font-mono text-slate-400">Activités Garmin enregistrées</p>
          </div>
        </div>

        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="p-1.5 rounded-lg bg-[#171D2A] hover:bg-[#20293C] text-slate-400 hover:text-white transition-colors border border-white/[0.06]"
            title="Rafraîchir les activités"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#10B981]' : ''}`} />
          </button>
        )}
      </div>

      {/* List */}
      {activities.length === 0 ? (
        <div className="p-6 text-center text-xs font-mono text-slate-500 bg-[#0F141F] rounded-xl border border-white/[0.04]">
          {loading ? 'Chargement de la télémétrie Garmin...' : 'Aucune sortie enregistrée cette semaine.'}
        </div>
      ) : (
        <div className="space-y-2">
          {activities.slice(0, 5).map((act, idx) => {
            const isClara = act.athlete_id === 'clara' || (act as any).athlete_name === 'Clara';
            const athleteLabel = isClara ? 'Clara' : 'Louis';
            const athleteBadgeStyle = isClara
              ? 'bg-[#F43F5E]/15 text-[#F43F5E] border-[#F43F5E]/30'
              : 'bg-[#00A7E1]/15 text-[#00A7E1] border-[#00A7E1]/30';

            const isRunning = act.sport?.toLowerCase().includes('running') || act.sport?.toLowerCase().includes('course');
            const isCycling = act.sport?.toLowerCase().includes('cycling') || act.sport?.toLowerCase().includes('cyclisme');
            const sportIcon = isRunning ? '🏃' : isCycling ? '🚴' : '⚡';

            return (
              <div
                key={act.id || idx}
                onClick={() => onSelectActivity?.(act.id)}
                className="p-3 rounded-xl bg-[#0F141F] hover:bg-[#151D2C] border border-white/[0.04] hover:border-white/[0.12] flex items-center justify-between gap-3 cursor-pointer group transition-all"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-lg flex-shrink-0">{sportIcon}</span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.2 rounded border ${athleteBadgeStyle}`}>
                        {athleteLabel}
                      </span>
                      <span className="text-xs font-bold text-white truncate group-hover:text-[#00A7E1] transition-colors">
                        {act.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[10.5px] font-mono text-slate-400 mt-0.5">
                      <span>{act.date}</span>
                      <span>•</span>
                      <span>{act.duration_minutes} min</span>
                      {act.avg_hr && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-0.5 text-slate-300">
                            <Heart className="w-2.5 h-2.5 text-[#F43F5E]" />
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
                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-[#00A7E1] transition-colors" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
