import React from 'react';
import { Activity as ActivityIcon, Heart, RefreshCw, ChevronRight } from 'lucide-react';
import type { Activity } from '../types';
import { getSportIcon } from '../lib/sportIcons';

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
    <div className="telemetry-card rounded-card p-4 sm:p-5 space-y-3.5 text-ink">
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-tile bg-surface-2 border border-border flex items-center justify-center text-metric-good">
            <ActivityIcon className="w-4 h-4 text-metric-good" />
          </div>
          <div>
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-ink">
              Télémétrie des Sorties Récentes
            </h3>
            <p className="text-xs font-mono text-ink-muted">Activités Garmin enregistrées</p>
          </div>
        </div>

        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="p-1.5 rounded-tile bg-surface-2 hover:bg-surface-3 text-ink-muted hover:text-ink transition-colors border border-border"
            title="Rafraîchir les activités"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-metric-good' : ''}`} />
          </button>
        )}
      </div>

      {/* List */}
      {activities.length === 0 ? (
        <div className="p-6 text-center text-xs font-mono text-ink-faint bg-surface-2 rounded-tile border border-border">
          {loading ? 'Chargement de la télémétrie Garmin...' : 'Aucune sortie enregistrée cette semaine.'}
        </div>
      ) : (
        <div className="space-y-2">
          {activities.slice(0, 5).map((act, idx) => {
            const isClara = act.athlete_id === 'clara' || (act as any).athlete_name === 'Clara';
            const athleteLabel = isClara ? 'Clara' : 'Louis';
            const athleteBadgeStyle = isClara
              ? 'bg-athlete-coral/15 text-athlete-coral border-athlete-coral/30'
              : 'bg-athlete-cyan/15 text-athlete-cyan border-athlete-cyan/30';

            const SportIcon = getSportIcon(act.sport);

            return (
              <button
                key={act.id || idx}
                type="button"
                onClick={() => onSelectActivity?.(act.id)}
                className="w-full text-left p-3 rounded-tile bg-surface-2 hover:bg-surface-3 border border-border hover:border-border-strong flex items-center justify-between gap-3 cursor-pointer group transition-all"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <SportIcon className="w-4 h-4 flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-micro font-mono font-bold uppercase px-1.5 py-0.2 rounded-pill border ${athleteBadgeStyle}`}>
                        {athleteLabel}
                      </span>
                      <span className="text-xs font-bold text-ink truncate group-hover:text-athlete-cyan transition-colors">
                        {act.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-micro font-mono text-ink-muted mt-0.5">
                      <span>{act.date}</span>
                      <span>•</span>
                      <span>{act.duration_minutes} min</span>
                      {act.avg_hr && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-0.5 text-ink-muted">
                            <Heart className="w-2.5 h-2.5 text-athlete-coral" />
                            {act.avg_hr} bpm
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0 text-right">
                  <div>
                    <div className="text-xs font-bold font-mono text-ink">
                      {act.distance_km > 0 ? `${act.distance_km} km` : `${act.duration_minutes} min`}
                    </div>
                    {act.speed_kmh ? (
                      <div className="text-micro font-mono text-ink-muted">
                        {act.speed_kmh} km/h
                      </div>
                    ) : null}
                  </div>
                  <ChevronRight className="w-4 h-4 text-ink-faint group-hover:text-athlete-cyan transition-colors" />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
