import type {
  AthleteStatus,
  Biometrics,
  Activity,
  DetailedActivity,
  WeeklyPlanData,
  ManualSessionValidationParams,
  AthleteMemory,
  HistoryProfile,
  SearchSource,
} from '../types';

export interface ChatResponse {
  content: string;
  model: string;
  source: string;
  search_used: boolean;
  search_sources?: SearchSource[];
  learned_facts?: string[];
}

import type { AthleteId } from '../types';

export const api = {
  async getStatus(athlete?: AthleteId): Promise<AthleteStatus> {
    const q = athlete ? `?athlete=${athlete}` : '';
    const res = await fetch(`/api/status${q}`);
    if (!res.ok) throw new Error('Échec du chargement du statut');
    return res.json();
  },

  async getBiometrics(athlete?: AthleteId): Promise<Biometrics> {
    const q = athlete ? `?athlete=${athlete}` : '';
    const res = await fetch(`/api/biometrics${q}`);
    if (!res.ok) throw new Error('Échec du chargement des biométries');
    return res.json();
  },

  async getActivities(athlete?: AthleteId): Promise<Activity[]> {
    const q = athlete ? `?athlete=${athlete}` : '';
    const res = await fetch(`/api/activities${q}`);
    if (!res.ok) throw new Error('Échec du chargement des activités');
    const data = await res.json();
    return data.activities || [];
  },

  async getWeeklyPlan(offset: number = 0, athlete?: AthleteId): Promise<WeeklyPlanData> {
    const q = athlete ? `&athlete=${athlete}` : '';
    const res = await fetch(`/api/weekly-plan?offset=${offset}${q}`);
    if (!res.ok) throw new Error('Échec du chargement du planning');
    return res.json();
  },

  async scheduleWorkout(params: {
    date_iso: string;
    athlete_id?: string;
    workout_name?: string;
    duration_minutes?: number;
    hr_min?: number;
    hr_max?: number;
    workout_structure?: any;
  }): Promise<{ status: string; workout_id?: string; workout_name?: string; date?: string; message?: string }> {
    const res = await fetch('/api/calendar/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Impossible de programmer la séance sur Garmin');
    }
    return res.json();
  },

  async generate3WeekPlan(): Promise<{ status: string; sessions_count?: number }> {
    const res = await fetch('/api/calendar/generate-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Impossible de générer le plan 3 semaines');
    }
    return res.json();
  },

  async toggleManualCompletion(
    params: ManualSessionValidationParams
  ): Promise<{
    status: string;
    date_iso: string;
    completed: boolean;
    garmin_synced?: boolean;
    garmin_activity_id?: string | number;
    error_message?: string;
  }> {
    const res = await fetch('/api/calendar/manual-toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Impossible de mettre à jour le statut de la séance');
    }
    return res.json();
  },

  async getAcwr(): Promise<any> {
    const res = await fetch('/api/physiology/acwr');
    if (!res.ok) throw new Error('Impossible de charger le ratio ACWR');
    return res.json();
  },

  async getCoachingAdaptations(): Promise<{ adaptation: any | null }> {
    const res = await fetch('/api/coaching/adaptations');
    if (!res.ok) return { adaptation: null };
    return res.json();
  },

  async getAdaptations(): Promise<any | null> {
    const res = await api.getCoachingAdaptations();
    return res.adaptation;
  },

  async applyAdaptation(adaptationId: number): Promise<any> {
    const res = await fetch('/api/coaching/adaptations/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adaptation_id: adaptationId }),
    });
    if (!res.ok) throw new Error("Échec de l'application de l'adaptation");
    return res.json();
  },

  async dismissAdaptation(adaptationId: number): Promise<any> {
    const res = await fetch('/api/coaching/adaptations/dismiss', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adaptation_id: adaptationId }),
    });
    if (!res.ok) throw new Error("Échec du rejet de l'adaptation");
    return res.json();
  },

  async sendChat(params: {
    message: string;
    use_search?: boolean;
    history?: { role: string; content: string }[];
    model?: string;
    athlete_context?: AthleteId;
  }): Promise<ChatResponse> {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: params.message,
        use_search: params.use_search ?? true,
        history: params.history ?? [],
        model: params.model,
        athlete_context: params.athlete_context || 'louis',
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Erreur de communication avec le coach');
    }
    return res.json();
  },

  async sendMessage(
    message: string,
    use_search?: boolean,
    history?: { role: string; content: string }[],
    model?: string,
    athlete_context?: AthleteId
  ): Promise<{
    reply: string;
    content: string;
    sources?: SearchSource[];
    search_sources?: SearchSource[];
    learned_facts?: string[];
  }> {
    const res = await api.sendChat({
      message,
      use_search,
      history,
      model,
      athlete_context,
    });
    return {
      reply: res.content,
      content: res.content,
      sources: res.search_sources,
      search_sources: res.search_sources,
      learned_facts: res.learned_facts,
    };
  },

  async getMemory(): Promise<AthleteMemory> {
    const res = await fetch('/api/memory');
    if (!res.ok) throw new Error('Échec du chargement de la mémoire');
    return res.json();
  },

  async resetMemory(): Promise<AthleteMemory> {
    const res = await fetch('/api/memory/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error('Échec de la réinitialisation de la mémoire');
    const data = await res.json();
    return data.memory;
  },

  async addMemoryFact(category: string, fact: string): Promise<AthleteMemory> {
    const res = await fetch('/api/memory/fact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category, fact }),
    });
    if (!res.ok) throw new Error("Échec de l'ajout du fait");
    const data = await res.json();
    return data.memory;
  },

  async removeMemoryFact(category: string, fact: string): Promise<AthleteMemory> {
    const res = await fetch('/api/memory/fact/remove', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category, fact }),
    });
    if (!res.ok) throw new Error('Échec de la suppression du fait');
    const data = await res.json();
    return data.memory;
  },

  async getHistory(): Promise<HistoryProfile> {
    const res = await fetch('/api/history');
    if (!res.ok) throw new Error("Échec du chargement de l'historique");
    return res.json();
  },

  async getActivityDetail(activityId: number | string): Promise<DetailedActivity> {
    const res = await fetch(`/api/activity/${activityId}`);
    if (!res.ok) throw new Error("Échec du chargement des détails de l'activité");
    return res.json();
  },
};
