import React, { useState, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { api } from './services/api';
import type {
  AthleteId,
  AthleteStatus,
  Biometrics,
  Activity,
  WeeklyPlanData,
  DayPlan,
  ManualSessionValidationParams,
  AthleteMemory,
  HistoryProfile,
  ChatMessage,
  DetailedActivity,
  CoachingAdaptation,
} from './types';
import { Header } from './components/Header';
import { ProgressionBanner } from './components/ProgressionBanner';
import { CommonSchedule } from './components/CommonSchedule';
import { GarminDuoStats } from './components/GarminDuoStats';
import { RecentActivities } from './components/RecentActivities';
import { CoachChat } from './components/CoachChat';
import { AdaptationAlert } from './components/AdaptationAlert';
import { TodayActionCard } from './components/TodayActionCard';
import { MemoryModal } from './components/MemoryModal';
import { ActivityDetailModal } from './components/ActivityDetailModal';
import { WorkoutCustomizerModal } from './components/WorkoutCustomizerModal';
import { ManualSessionModal } from './components/ManualSessionModal';
import { StartPrepModal } from './components/StartPrepModal';
import { Sun, CalendarRange, Gauge, MessageSquare } from 'lucide-react';
import { cn } from './lib/utils';

const TABS = [
  { id: 'today', label: "Aujourd'hui", icon: Sun },
  { id: 'week', label: 'Semaine', icon: CalendarRange },
  { id: 'stats', label: 'Stats', icon: Gauge },
  { id: 'coach', label: 'Coach', icon: MessageSquare },
] as const;

const getInitialAthlete = (): AthleteId => {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const param = params.get('athlete')?.toLowerCase();
    if (param === 'louis' || param === 'clara' || param === 'duo') {
      return param as AthleteId;
    }
    const saved = localStorage.getItem('garmin_duo_athlete');
    if (saved === 'louis' || saved === 'clara' || saved === 'duo') {
      return saved as AthleteId;
    }
  }
  return 'duo';
};

export const App: React.FC = () => {
  // Athlete Selector State ('duo' by default, or 'louis' | 'clara' from URL / storage)
  const [currentAthlete, setCurrentAthlete] = useState<AthleteId>(getInitialAthlete);
  // Onglet actif — un seul rôle par écran
  const [activeTab, setActiveTab] = useState<'today' | 'week' | 'stats' | 'coach'>('today');

  // Application Data States
  const [status, setStatus] = useState<AthleteStatus | null>(null);
  const [biometrics, setBiometrics] = useState<Biometrics | null>(null);
  const [adaptation, setAdaptation] = useState<CoachingAdaptation | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlanData | null>(null);
  const [memory, setMemory] = useState<AthleteMemory | null>(null);
  const [history, setHistory] = useState<HistoryProfile | null>(null);

  // Loading States
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingBiometrics, setLoadingBiometrics] = useState(false);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);
  const [_errorBiometrics, setErrorBiometrics] = useState<string | null>(null);

  // Modals & UI States
  const [memoryModalOpen, setMemoryModalOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<DetailedActivity | null>(null);
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [customizerDay, setCustomizerDay] = useState<DayPlan | null>(null);
  const [modalDay, setModalDay] = useState<DayPlan | null>(null);
  const [startPrepOpen, setStartPrepOpen] = useState(false);

  const [weeklyOffset, setWeeklyOffset] = useState<number>(0);
  const [loadingPlan, setLoadingPlan] = useState<boolean>(false);

  // Chat Conversation History
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-msg',
      role: 'coach',
      content:
        "Bonjour ! Heureux de vous retrouver sur votre cockpit d'entraînement en duo pour Louis & Clara.\n\nAu programme : coordination de vos séances, suivi physiologique connecté Garmin et montée en puissance vers vos objectifs 10 km (Louis < 40' & Clara < 50').\n\nComment se sont passées vos dernières sensations ?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  // Main Dashboard Data Loading (Single Source of Truth)
  const loadDashboardData = useCallback(async (athlete: AthleteId = currentAthlete, offset: number = weeklyOffset) => {
    try {
      const [
        statusRes,
        bioRes,
        actsRes,
        planRes,
        memRes,
        histRes,
        adaptRes,
      ] = await Promise.allSettled([
        api.getStatus(athlete),
        api.getBiometrics(athlete),
        api.getActivities(athlete),
        api.getWeeklyPlan(offset, athlete),
        api.getMemory(),
        api.getHistory(),
        api.getAdaptations(),
      ]);

      if (statusRes.status === 'fulfilled') setStatus(statusRes.value);
      if (bioRes.status === 'fulfilled') {
        setBiometrics(bioRes.value);
        setErrorBiometrics(null);
      } else {
        setErrorBiometrics(bioRes.reason?.message || 'Erreur biométrique');
      }
      if (actsRes.status === 'fulfilled') setActivities(actsRes.value);
      if (planRes.status === 'fulfilled') setWeeklyPlan(planRes.value);
      if (memRes.status === 'fulfilled') setMemory(memRes.value);
      if (histRes.status === 'fulfilled') setHistory(histRes.value);
      if (adaptRes.status === 'fulfilled') setAdaptation(adaptRes.value);
    } catch (err) {
      console.error('Erreur chargement cockpit:', err);
    } finally {
      setLoadingInitial(false);
    }
  }, [currentAthlete, weeklyOffset]);

  // Initial Load & On Athlete Switch
  useEffect(() => {
    loadDashboardData(currentAthlete, weeklyOffset);
  }, [currentAthlete, weeklyOffset, loadDashboardData]);

  // Switch Athlete Handler
  const handleSelectAthlete = (athlete: AthleteId) => {
    if (athlete === currentAthlete) return;
    setCurrentAthlete(athlete);
    try {
      localStorage.setItem('garmin_duo_athlete', athlete);
      const url = new URL(window.location.href);
      url.searchParams.set('athlete', athlete);
      window.history.replaceState({}, '', url.toString());
    } catch {
      // Ignore in non-browser environments
    }
    setLoadingInitial(true);
  };

  // Chat message sending
  const handleSendMessage = async (text: string, useSearch: boolean) => {
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoadingChat(true);

    try {
      const historyPayload = messages.slice(-8).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await api.sendMessage(text, useSearch, historyPayload, undefined, currentAthlete);

      const coachMsg: ChatMessage = {
        id: `coach-${Date.now()}`,
        role: 'coach',
        content: response.reply,
        sources: response.sources,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, coachMsg]);

      if (response.learned_facts && response.learned_facts.length > 0) {
        api.getMemory().then((m) => setMemory(m)).catch(() => {});
      }

      if (text.toLowerCase().includes('guéri') || text.toLowerCase().includes('victoire')) {
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.8 },
          colors: ['#2563EB', '#059669', '#B45309'],
        });
      }
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'coach',
        content: `⚠️ Une erreur est survenue lors de la communication : ${err.message || 'Erreur réseau'}. Veuillez réessayer.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        error: true,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoadingChat(false);
    }
  };

  // Démarrage de la préparation : bascule sur le coach et lance le cadrage du plan en duo
  const handleStartPrepCoach = () => {
    setStartPrepOpen(false);
    setActiveTab('coach');
    handleSendMessage(
      "On démarre la préparation en duo ! Peux-tu animer le cadrage initial : valider nos allures repères, rappeler les règles d'or, puis co-construire avec nous l'emploi du temps hebdomadaire et l'organisation des semaines ?",
      true
    );
  };

  // Memory Fact Operations
  const handleAddFact = async (category: string, fact: string) => {
    const updatedMemory = await api.addMemoryFact(category, fact);
    setMemory(updatedMemory);
  };

  const handleRemoveFact = async (category: string, fact: string) => {
    const updatedMemory = await api.removeMemoryFact(category, fact);
    setMemory(updatedMemory);
  };

  const handleClearInjuries = async () => {
    const list = memory?.facts?.injuries_and_sensitivities || [];
    for (const item of list) {
      await api.removeMemoryFact('injuries_and_sensitivities', item);
    }
    const updated = await api.getMemory();
    setMemory(updated);
  };

  const handleResetMemory = async () => {
    if (window.confirm("Êtes-vous certain de vouloir réinitialiser la mémoire du coach à un état 100% neutre ?")) {
      const updated = await api.resetMemory();
      setMemory(updated);
    }
  };

  const handleSelectActivity = async (activityId: number | string) => {
    try {
      const detail = await api.getActivityDetail(activityId);
      setSelectedActivity(detail);
      setActivityModalOpen(true);
    } catch (err) {
      console.error('Erreur chargement activité:', err);
    }
  };

  // Calendar Week Navigation
  const handleNavigateWeek = async (newOffset: number) => {
    setLoadingPlan(true);
    setWeeklyOffset(newOffset);
    try {
      const plan = await api.getWeeklyPlan(newOffset, currentAthlete);
      setWeeklyPlan(plan);
    } catch (e) {
      console.error('Erreur navigation calendrier:', e);
    } finally {
      setLoadingPlan(false);
    }
  };

  // Schedule Workout directly on Garmin Connect
  const handleScheduleWorkout = async (day: DayPlan, targetAthlete?: string) => {
    if (!day.date_iso) return;
    const dur = day.workout_structure?.duration_minutes || (day.duration ? parseInt(day.duration) || 35 : 35);
    const athleteToSchedule = targetAthlete || day.athlete_id || (currentAthlete === 'duo' ? 'louis' : currentAthlete);
    await api.scheduleWorkout({
      date_iso: day.date_iso,
      athlete_id: athleteToSchedule,
      workout_name: day.workout_structure?.workout_name || day.type,
      duration_minutes: dur,
      workout_structure: day.workout_structure,
      hr_min: day.workout_structure?.hr_min,
      hr_max: day.workout_structure?.hr_max,
    });
    confetti({
      particleCount: 35,
      spread: 55,
      origin: { y: 0.7 },
    });
    const updated = await api.getWeeklyPlan(weeklyOffset, currentAthlete);
    setWeeklyPlan(updated);
  };

  // Generate / Reset 3-Week Progressive Cycle
  const handleGeneratePlan = async () => {
    await api.generate3WeekPlan();
    confetti({
      particleCount: 50,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#2563EB', '#C2417A', '#B45309'],
    });
    const updated = await api.getWeeklyPlan(weeklyOffset, currentAthlete);
    setWeeklyPlan(updated);
  };

  // Toggle Manual Completion
  const handleToggleManualCompletion = async (params: ManualSessionValidationParams) => {
    if (!params.date_iso) return;
    const targetAthlete = params.athlete_id || (currentAthlete === 'duo' ? 'louis' : currentAthlete);
    await api.toggleManualCompletion({
      ...params,
      athlete_id: targetAthlete,
    });
    if (params.completed) {
      confetti({
        particleCount: 30,
        spread: 50,
        origin: { y: 0.7 },
      });
    }
    const updated = await api.getWeeklyPlan(weeklyOffset, currentAthlete);
    setWeeklyPlan(updated);
  };

  const handleApplyAdaptation = async (adaptationId: number) => {
    await api.applyAdaptation(adaptationId);
    setAdaptation(null);
    confetti({
      particleCount: 45,
      spread: 60,
      origin: { y: 0.7 },
      colors: ['#B45309', '#059669', '#2563EB'],
    });
    loadDashboardData();
  };

  const handleDismissAdaptation = async (adaptationId: number) => {
    await api.dismissAdaptation(adaptationId);
    setAdaptation(null);
  };

  const handleCustomizerSubmit = async (customizedData: {
    date_iso: string;
    workout_name: string;
    duration_minutes: number;
    workout_structure: any;
  }) => {
    await api.scheduleWorkout({
      date_iso: customizedData.date_iso,
      workout_name: customizedData.workout_name,
      duration_minutes: customizedData.duration_minutes,
      workout_structure: customizedData.workout_structure,
      hr_min: customizedData.workout_structure?.hr_min,
      hr_max: customizedData.workout_structure?.hr_max,
    });
    confetti({
      particleCount: 40,
      spread: 60,
      origin: { y: 0.7 },
      colors: ['#2563EB', '#C2417A', '#B45309'],
    });
    const updated = await api.getWeeklyPlan(weeklyOffset, currentAthlete);
    setWeeklyPlan(updated);
  };

  const handleModalSubmit = async (params: ManualSessionValidationParams) => {
    await handleToggleManualCompletion(params);
    setModalDay(null);
  };

  const todaySession =
    weeklyPlan?.days?.find((d) => d.is_today || (weeklyPlan?.today_iso && d.date_iso === weeklyPlan.today_iso)) || null;

  return (
    <div className="min-h-screen max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 text-ink">
      {/* 1. Header (Brand, Athlete Switcher, Garmin Connection, Memory) */}
      <Header
        status={status}
        loading={loadingInitial}
        currentAthlete={currentAthlete}
        onSelectAthlete={handleSelectAthlete}
        onOpenMemory={() => setMemoryModalOpen(true)}
        onStartPrep={() => setStartPrepOpen(true)}
      />

      {/* Proactive Adaptation Alert if any — toujours visible (c'est une alerte) */}
      <AdaptationAlert
        adaptation={adaptation}
        onApply={handleApplyAdaptation}
        onDismiss={handleDismissAdaptation}
      />

      {/* Barre d'onglets — un seul rôle par écran */}
      <nav className="mt-5 mb-5" aria-label="Sections du cockpit">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center justify-center gap-2.5 rounded-card px-4 py-3.5 text-base font-semibold transition-all',
                  active
                    ? 'bg-athlete-cyan text-white shadow-[0_4px_14px_-4px_rgba(37,99,235,0.5)]'
                    : 'bg-surface-1 text-ink-muted border border-border hover:bg-surface-2 hover:text-ink'
                )}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Contenu de l'onglet actif */}
      {activeTab === 'today' && (
        <div className="space-y-5">
          {/* HERO : Séance du Jour */}
          <TodayActionCard
            todaySession={todaySession}
            onScheduleWorkout={handleScheduleWorkout}
            onOpenCustomizer={(day) => setCustomizerDay(day)}
            onOpenManualModal={(day) => setModalDay(day)}
          />

          {/* Progression 10k — fine, en bas de l'écran du jour */}
          <ProgressionBanner
            progression={weeklyPlan?.progression || null}
            scorecard={weeklyPlan?.scorecard || weeklyPlan?.calendar?.scorecard}
            louisScorecard={weeklyPlan?.louis_scorecard}
            claraScorecard={weeklyPlan?.clara_scorecard}
          />
        </div>
      )}

      {activeTab === 'week' && (
        <div className="space-y-5">
          {/* Emploi du Temps Commun */}
          <CommonSchedule
            days={weeklyPlan?.days || []}
            loading={loadingInitial || loadingPlan}
            weekTitle={weeklyPlan?.week_title || weeklyPlan?.calendar?.week_title}
            isCurrentWeek={weeklyPlan?.is_current_week ?? (weeklyOffset === 0)}
            offsetWeeks={weeklyOffset}
            todayIso={weeklyPlan?.today_iso}
            coordinationNotes={weeklyPlan?.coordination_notes}
            onNavigateWeek={handleNavigateWeek}
            onSelectActivity={handleSelectActivity}
            onScheduleWorkout={handleScheduleWorkout}
            onOpenCustomizer={(day) => setCustomizerDay(day)}
            onOpenManualModal={(day) => setModalDay(day)}
            onCancelManualCompletion={async (params) => {
              await api.toggleManualCompletion({
                date_iso: params.date_iso,
                completed: false,
                athlete_id: params.athlete_id,
                sport: params.sport,
              });
              const updated = await api.getWeeklyPlan(weeklyOffset, currentAthlete);
              setWeeklyPlan(updated);
            }}
            onGeneratePlan={handleGeneratePlan}
          />

          {/* Sorties Récentes Synchronisées */}
          <RecentActivities
            activities={activities}
            loading={loadingInitial || loadingActivities}
            onSelectActivity={handleSelectActivity}
            onRefresh={() => {
              setLoadingActivities(true);
              api.getActivities(currentAthlete)
                .then((acts) => setActivities(acts))
                .catch(() => {})
                .finally(() => setLoadingActivities(false));
            }}
          />
        </div>
      )}

      {activeTab === 'stats' && (
        <div className="space-y-5">
          {/* Stats Garmin à tous les deux */}
          <GarminDuoStats
            biometrics={biometrics}
            loading={loadingInitial || loadingBiometrics}
            onRefresh={() => {
              setLoadingBiometrics(true);
              api.getBiometrics(currentAthlete)
                .then((b) => {
                  setBiometrics(b);
                  setErrorBiometrics(null);
                })
                .catch((e) => setErrorBiometrics(e.message))
                .finally(() => setLoadingBiometrics(false));
            }}
          />
        </div>
      )}

      {activeTab === 'coach' && (
        <div className="max-w-3xl mx-auto space-y-5">
          {/* Chat Coach IA — largeur contrainte pour rester lisible */}
          <CoachChat
            messages={messages}
            loading={loadingChat}
            onSendMessage={handleSendMessage}
          />
        </div>
      )}

      {/* Global Modals */}
      <StartPrepModal
        open={startPrepOpen}
        onClose={() => setStartPrepOpen(false)}
        onTalkToCoach={handleStartPrepCoach}
        onPlanGenerated={() => loadDashboardData()}
      />

      <MemoryModal
        open={memoryModalOpen}
        onOpenChange={setMemoryModalOpen}
        memory={memory}
        history={history}
        onAddFact={handleAddFact}
        onRemoveFact={handleRemoveFact}
        onClearInjuries={handleClearInjuries}
        onResetMemory={handleResetMemory}
      />

      <ActivityDetailModal
        activity={selectedActivity}
        isOpen={activityModalOpen}
        onClose={() => setActivityModalOpen(false)}
      />

      <WorkoutCustomizerModal
        day={customizerDay}
        isOpen={!!customizerDay}
        onClose={() => setCustomizerDay(null)}
        onSubmit={handleCustomizerSubmit}
      />

      <ManualSessionModal
        day={modalDay}
        isOpen={!!modalDay}
        onClose={() => setModalDay(null)}
        onSubmit={handleModalSubmit}
      />
    </div>
  );
};

export default App;
