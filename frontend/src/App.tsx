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

export const App: React.FC = () => {
  // Athlete Selector State ('duo' by default, or 'louis' | 'clara')
  const [currentAthlete, setCurrentAthlete] = useState<AthleteId>('duo');

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
          colors: ['#4EA8DE', '#3FA372', '#9D78DE'],
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
      colors: ['#4EA8DE', '#E0583A', '#9D78DE'],
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
      colors: ['#D99738', '#3FA372', '#4EA8DE'],
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
      colors: ['#4EA8DE', '#E0583A', '#9D78DE'],
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
    <div className="min-h-screen max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 text-slate-200">
      {/* 1. Header (Brand, Athlete Switcher, Garmin Connection, Memory) */}
      <Header
        status={status}
        loading={loadingInitial}
        currentAthlete={currentAthlete}
        onSelectAthlete={handleSelectAthlete}
        onOpenMemory={() => setMemoryModalOpen(true)}
      />

      {/* Proactive Adaptation Alert if any */}
      <AdaptationAlert
        adaptation={adaptation}
        onApply={handleApplyAdaptation}
        onDismiss={handleDismissAdaptation}
      />

      {/* ZONE 5: Barre de progression commune 10k */}
      <ProgressionBanner
        progression={weeklyPlan?.progression || null}
        scorecard={weeklyPlan?.scorecard || weeklyPlan?.calendar?.scorecard}
        louisScorecard={weeklyPlan?.louis_scorecard}
        claraScorecard={weeklyPlan?.clara_scorecard}
      />

      {/* Main Single-Page Cockpit Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Colonne Principale Gauche : Hero Séance du Jour, Emploi du Temps Commun (Zone 1) & Sorties Récentes (Zone 4) */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-5">
          {/* HERO : Séance du Jour Haute Visibilité */}
          <TodayActionCard
            todaySession={todaySession}
            onScheduleWorkout={handleScheduleWorkout}
            onOpenCustomizer={(day) => setCustomizerDay(day)}
            onOpenManualModal={(day) => setModalDay(day)}
          />

          {/* ZONE 1 : Emploi du Temps Commun */}
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

          {/* ZONE 4 : Sorties Récentes Synchronisées */}
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

        {/* Colonne Latérale Droite : Stats Garmin à tous les deux (Zone 3) & Chat Coach IA (Zone 2) */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-5">
          {/* ZONE 3 : Stats Garmin à tous les deux */}
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

          {/* ZONE 2 : Chat Coach IA */}
          <CoachChat
            messages={messages}
            loading={loadingChat}
            onSendMessage={handleSendMessage}
          />
        </div>
      </div>

      {/* Global Modals */}
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
