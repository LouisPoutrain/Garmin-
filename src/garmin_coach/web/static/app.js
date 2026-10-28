/**
 * Garmin AI Coach - Reactive Client Logic
 */

let conversationHistory = [];

document.addEventListener("DOMContentLoaded", () => {
  initDashboard();
  setupEventListeners();
});

async function initDashboard() {
  await Promise.all([
    loadStatus(),
    loadBiometrics(),
    loadActivities(),
    loadWeeklyPlan(),
  ]);
}

function setupEventListeners() {
  const btnSend = document.getElementById("btnSendChat");
  const chatInput = document.getElementById("chatInput");

  btnSend.addEventListener("click", () => sendChatMessage());
  chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  });

  // Action Bar Buttons
  document.getElementById("btnMorningCheckin").addEventListener("click", () => {
    sendChatMessage("Fais mon check-in matinal complet d'après mes métriques Garmin et dis-moi quelle est la séance idéale pour aujourd'hui.");
  });

  document.getElementById("btnAnalyzeLast").addEventListener("click", () => {
    sendChatMessage("Analyse ma dernière activité enregistrée sur Garmin Connect avec l'impact aérobie et la gestion d'effort.");
  });

  document.getElementById("btnWeeklyPlanner").addEventListener("click", () => {
    sendChatMessage("Génère un plan d'entraînement hebdomadaire polarisé (80% Zone 2 / 20% Haute Intensité) adapté à mes objectifs.");
  });

  // Memory & Deep History Modal
  const memoryModal = document.getElementById("memoryModal");
  document.getElementById("btnOpenMemory").addEventListener("click", () => {
    openMemoryModal();
  });

  document.getElementById("btnCloseMemoryModal").addEventListener("click", () => {
    memoryModal.style.display = "none";
  });

  memoryModal.addEventListener("click", (e) => {
    if (e.target === memoryModal) {
      memoryModal.style.display = "none";
    }
  });

  document.getElementById("btnAddMemoryFact").addEventListener("click", () => {
    addNewMemoryFact();
  });

  document.getElementById("btnClearInjuries").addEventListener("click", () => {
    sendChatMessage("Je n'ai plus mal, toutes mes douleurs sont guéries !");
    memoryModal.style.display = "none";
  });

  // Delegate prompt chips
  document.addEventListener("click", (e) => {
    if (e.target.classList.contains("chip")) {
      const prompt = e.target.getAttribute("data-prompt");
      if (prompt) {
        sendChatMessage(prompt);
      }
    }
  });
}

async function loadStatus() {
  try {
    const res = await fetch("/api/status");
    if (!res.ok) return;
    const data = await res.json();
    
    document.getElementById("athleteName").textContent = data.athlete_name || "Louis Poutrain";
    document.getElementById("athleteGoal").textContent = data.primary_goal || "Endurance & VO2 Max";
    
    const badge = document.getElementById("garminStatusBadge");
    const badgeText = document.getElementById("garminStatusText");
    if (data.garmin_connected) {
      badge.className = "status-pill connected";
      badgeText.textContent = "Garmin Connecté";
    } else {
      badge.className = "status-pill";
      badgeText.textContent = "Jetons manquants";
    }
  } catch (e) {
    console.error("Status load failed", e);
  }
}

async function loadBiometrics() {
  try {
    const res = await fetch("/api/biometrics");
    if (!res.ok) return;
    const data = await res.json();

    // 1. Training Readiness & Gauge
    const score = data.readiness_score || 75;
    document.getElementById("readinessValue").textContent = score;
    
    const circle = document.getElementById("readinessCircle");
    const circumference = 2 * Math.PI * 42; // ~263.89
    const offset = circumference - (score / 100) * circumference;
    circle.style.strokeDasharray = circumference;
    circle.style.strokeDashoffset = offset;

    const badge = document.getElementById("readinessBadge");
    const card = document.getElementById("readinessCard");
    const title = document.getElementById("readinessTitle");
    const desc = document.getElementById("readinessDesc");

    if (data.readiness_level === "green") {
      badge.textContent = "FEU VERT";
      badge.className = "badge badge-green";
      card.className = "metric-card readiness-card glass glow-green";
      circle.style.stroke = "var(--color-green)";
      circle.style.filter = "drop-shadow(0 0 8px var(--color-green))";
      title.textContent = "Forme Optimale";
      desc.textContent = "Corps restauré. Idéal pour une séance clé d'intervalles ou de tempo.";
    } else if (data.readiness_level === "yellow") {
      badge.textContent = "FEU JAUNE";
      badge.style.background = "rgba(245, 158, 11, 0.15)";
      badge.style.color = "var(--color-amber)";
      badge.style.borderColor = "rgba(245, 158, 11, 0.4)";
      circle.style.stroke = "var(--color-amber)";
      circle.style.filter = "drop-shadow(0 0 8px var(--color-amber))";
      title.textContent = "Récupération Partielle";
      desc.textContent = "Fatigue modérée. Privilégiez l'endurance fondamentale Z2.";
    } else {
      badge.textContent = "FEU ROUGE";
      badge.style.background = "rgba(239, 68, 68, 0.15)";
      badge.style.color = "var(--color-red)";
      badge.style.borderColor = "rgba(239, 68, 68, 0.4)";
      circle.style.stroke = "var(--color-red)";
      circle.style.filter = "drop-shadow(0 0 8px var(--color-red))";
      title.textContent = "Repos Prioritaire";
      desc.textContent = "Réserves basses. Repos complet ou récupération active légère.";
    }

    // 2. Body Battery
    const bb = data.body_battery || 73;
    document.getElementById("bodyBatteryValue").textContent = bb;
    document.getElementById("bodyBatteryBar").style.width = `${bb}%`;

    // 3. Sommeil
    const sleepH = data.sleep_hours || 7.5;
    document.getElementById("sleepHours").textContent = sleepH;
    document.getElementById("sleepScore").textContent = `${data.sleep_score || 82}/100`;
    document.getElementById("restingHr").textContent = `${data.resting_hr || 56} bpm`;
    document.getElementById("sleepScoreBar").style.width = `${data.sleep_score || 82}%`;

    // 4. Stress
    const stress = data.avg_stress || 21;
    document.getElementById("stressValue").textContent = stress;
    document.getElementById("stressBar").style.width = `${stress}%`;

  } catch (e) {
    console.error("Biometrics load failed", e);
  }
}

async function loadActivities() {
  const container = document.getElementById("activitiesList");
  try {
    const res = await fetch("/api/activities");
    if (!res.ok) return;
    const data = await res.json();
    const activities = data.activities || [];

    if (activities.length === 0) {
      container.innerHTML = `<div class="activity-sub">Aucune activité récente trouvée.</div>`;
      return;
    }

    container.innerHTML = activities.map(act => {
      const isCycling = act.sport.includes("cycl") || act.sport.includes("bike");
      const icon = isCycling ? "🚴" : "🏃";
      return `
        <div class="activity-item">
          <div class="activity-meta">
            <div class="activity-sport-icon">${icon}</div>
            <div>
              <div class="activity-title">${escapeHtml(act.name)}</div>
              <div class="activity-sub">${act.date} • ${act.time} ${act.avg_hr ? `• ❤️ ${act.avg_hr} bpm` : ''}</div>
            </div>
          </div>
          <div class="activity-metrics">
            <div class="activity-dist">${act.distance_km} km</div>
            <div class="activity-dur">${act.duration_minutes} min ${act.speed_kmh ? `• ${act.speed_kmh} km/h` : ''}</div>
          </div>
        </div>
      `;
    }).join("");

  } catch (e) {
    container.innerHTML = `<div class="activity-sub">Erreur lors de la synchronisation des séances.</div>`;
  }
}

async function loadWeeklyPlan() {
  const container = document.getElementById("weeklyDaysList");
  try {
    const res = await fetch("/api/weekly-plan");
    if (!res.ok) return;
    const data = await res.json();
    const days = data.days || [];
    const prog = data.progression || {};

    // 1. Update Goal & Progression Card
    if (prog.goal_title) {
      const titleEl = document.getElementById("goalCardTitle");
      if (titleEl) titleEl.textContent = prog.goal_title;
    }
    if (prog.target_time) {
      const targetEl = document.getElementById("targetTimeVal");
      if (targetEl) targetEl.textContent = prog.target_time;
    }
    if (prog.current_pr) {
      const prEl = document.getElementById("currentPrVal");
      if (prEl) prEl.textContent = prog.current_pr.split(" ")[0];
    }
    if (prog.current_pace) {
      const paceEl = document.getElementById("currentPaceVal");
      if (paceEl) paceEl.textContent = `${prog.current_pace} (Chinon)`;
    }
    if (prog.delta_text) {
      const deltaEl = document.getElementById("goalDeltaVal");
      if (deltaEl) deltaEl.textContent = prog.delta_text;
    }
    if (prog.next_milestone) {
      const nextEl = document.getElementById("nextMilestoneVal");
      if (nextEl) nextEl.textContent = `Prochain : ${prog.next_milestone.replace("Palier 1 : ", "")}`;
    }
    if (prog.progress_percent) {
      const barEl = document.getElementById("goalProgressBar");
      if (barEl) barEl.style.width = `${prog.progress_percent}%`;
    }

    // 2. Render weekly days with sport icons and intensity
    container.innerHTML = days.map(d => {
      const isKey = d.is_key || d.type.includes("Clé") || d.type.includes("Fractionné") || d.type.includes("Longue");
      const isUltimate = d.sport === "ultimate" || d.type.includes("Ultimate");
      const icon = d.sport_icon || (isUltimate ? "🥏" : (isKey ? "⚡" : "🏃‍♂️"));
      const rowClass = isKey ? 'key-session' : (isUltimate ? 'ultimate-session' : '');

      return `
        <div class="day-row ${rowClass}">
          <div class="day-row-meta">
            <span class="day-sport-icon">${icon}</span>
            <div>
              <span class="day-name">${d.day}</span>
              <span class="day-intensity-tag">${escapeHtml(d.intensity || '')}</span>
            </div>
          </div>
          <span class="day-focus" style="margin-left:8px;">${escapeHtml(d.type)}</span>
          <span class="day-dur">${d.duration}</span>
        </div>
      `;
    }).join("");
  } catch (e) {
    console.error("Weekly plan load error", e);
  }
}

async function sendChatMessage(customText = null) {
  const input = document.getElementById("chatInput");
  const text = (customText || input.value).trim();
  if (!text) return;

  if (!customText) {
    input.value = "";
  }

  // 1. Append User Message
  appendMessage("user", text);

  // 2. Append Coach Placeholder
  const loadingId = "loading-" + Date.now();
  appendLoadingMessage(loadingId);

  // 3. Post to API
  const useSearch = document.getElementById("toggleWebSearch").checked;
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: text,
        use_search: useSearch,
        history: conversationHistory,
      }),
    });

    removeMessage(loadingId);

    if (!res.ok) {
      appendMessage("coach", "Désolé, une erreur est survenue lors de la communication avec le coach.");
      return;
    }

    const data = await res.json();
    conversationHistory.push({ role: "user", content: text });
    conversationHistory.push({ role: "assistant", content: data.content });

    appendMessage("coach", data.content, data.search_used, data.search_sources, data.learned_facts || []);

  } catch (e) {
    removeMessage(loadingId);
    appendMessage("coach", "Impossible de joindre le serveur du coach. Veuillez vérifier la connexion.");
  }
}

function appendMessage(role, text, searchUsed = false, sources = [], learnedFacts = []) {
  const container = document.getElementById("chatMessages");
  const div = document.createElement("div");
  div.className = `message ${role}`;

  const avatar = role === "coach" ? "AI" : "LP";
  const formattedText = formatMarkdown(text);

  let learningHtml = "";
  if (learnedFacts && learnedFacts.length > 0) {
    learningHtml = learnedFacts.map(fact => `
      <div class="learning-pill">
        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 0 1 7-7z"/></svg>
        <span>${escapeHtml(fact)}</span>
      </div>
    `).join("");
  }

  let searchHtml = "";
  if (searchUsed && sources && sources.length > 0) {
    const sourceLinks = sources.map(s => `
      <a href="${s.url}" target="_blank" rel="noopener noreferrer" style="color:var(--color-cyan); text-decoration:none; margin-right:8px;">
        🌐 ${escapeHtml(s.title.slice(0, 30))}...
      </a>
    `).join("");

    searchHtml = `
      <div class="web-search-tag">
        <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
        Recherche web appliquée : ${sourceLinks}
      </div>
    `;
  }

  div.innerHTML = `
    <div class="message-avatar">${avatar}</div>
    <div class="message-bubble">
      ${learningHtml}
      ${formattedText}
      ${searchHtml}
    </div>
  `;

  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function appendLoadingMessage(id) {
  const container = document.getElementById("chatMessages");
  const div = document.createElement("div");
  div.className = "message coach";
  div.id = id;
  div.innerHTML = `
    <div class="message-avatar">AI</div>
    <div class="message-bubble">
      <span style="display:inline-flex; align-items:center; gap:6px; color:var(--text-muted); font-size:13px;">
        <span class="status-dot" style="width:6px; height:6px;"></span> Analyse biométrique et recherche en cours...
      </span>
    </div>
  `;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function removeMessage(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

function formatMarkdown(text) {
  if (!text) return "";
  let html = escapeHtml(text);

  // Headers
  html = html.replace(/^### (.*$)/gim, '<h4 style="margin:8px 0 4px; font-weight:700; color:var(--color-cyan);">$1</h4>');
  html = html.replace(/^## (.*$)/gim, '<h3 style="margin:10px 0 6px; font-weight:700;">$1</h3>');

  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  // Lists
  html = html.replace(/^- (.*$)/gim, '<li style="margin-left:16px;">$1</li>');
  html = html.replace(/(<li.*<\/li>)/gims, '<ul style="margin:6px 0;">$1</ul>');

  // Paragraphs
  html = html.replace(/\n\n+/g, '</p><p>');
  html = `<p>${html}</p>`;
  return html;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* ==============================================================================
   COACH MEMORY & DEEP HISTORY MODAL LOGIC
   ============================================================================== */

async function openMemoryModal() {
  const modal = document.getElementById("memoryModal");
  modal.style.display = "flex";
  await loadMemoryModal();
}

async function loadMemoryModal() {
  try {
    // 1. Fetch History Profile
    const histRes = await fetch("/api/history");
    if (histRes.ok) {
      const hist = await histRes.json();
      document.getElementById("histTotalKm").textContent = `${hist.lifetime_volume_km || 802.7} km`;
      document.getElementById("histTotalSessions").textContent = `${hist.total_activities_analyzed || 100} séances`;

      const run = hist.running_profile || {};
      document.getElementById("histRunKm").textContent = `${run.total_km || 504.7} km`;
      document.getElementById("histRunDetails").textContent = `${run.sessions || 71} sorties • Allure moy ${run.average_pace || '5:46'}`;
      
      const cyc = hist.cycling_profile || {};
      document.getElementById("histBikeKm").textContent = `${cyc.total_km || 184.2} km`;

      if (run.longest_run) {
        document.getElementById("histRecordName").textContent = run.longest_run;
      }
    }

    // 2. Fetch Memory
    const memRes = await fetch("/api/memory");
    if (memRes.ok) {
      const mem = await memRes.json();
      const facts = mem.facts || {};

      renderMemoryCategory("memInjuriesList", facts.injuries_and_sensitivities || [], "injuries_and_sensitivities", "Aucune blessure active signalée.");
      renderMemoryCategory("memPreferencesList", facts.preferences || [], "preferences", "Aucune préférence enregistrée.");
      renderMemoryCategory("memGoalsList", facts.active_goals || [], "active_goals", "Aucun objectif spécifique.");
      renderMemoryCategory("memConstraintsList", facts.schedule_constraints || [], "schedule_constraints", "Aucune contrainte d'agenda.");
    }
  } catch (e) {
    console.error("Failed to load memory or history profile", e);
  }
}

function renderMemoryCategory(elementId, items, category, emptyText) {
  const container = document.getElementById(elementId);
  if (!items || items.length === 0) {
    container.innerHTML = `<div class="mem-empty-text">${emptyText}</div>`;
    return;
  }

  container.innerHTML = items.map(item => `
    <div class="mem-item">
      <span class="mem-item-text">${escapeHtml(item)}</span>
      <button class="btn-remove-fact" title="Supprimer de la mémoire" onclick="removeMemoryFact('${category}', '${escapeHtml(item).replace(/'/g, "\\'")}')">&times;</button>
    </div>
  `).join("");
}

async function addNewMemoryFact() {
  const catSelect = document.getElementById("newMemoryCategory");
  const input = document.getElementById("newMemoryFact");
  const fact = input.value.trim();
  if (!fact) return;

  const category = catSelect.value;
  try {
    const res = await fetch("/api/memory/fact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, fact }),
    });
    if (res.ok) {
      input.value = "";
      await loadMemoryModal();
    }
  } catch (e) {
    console.error("Failed to add memory fact", e);
  }
}

async function removeMemoryFact(category, fact) {
  try {
    const res = await fetch("/api/memory/fact/remove", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, fact }),
    });
    if (res.ok) {
      await loadMemoryModal();
    }
  } catch (e) {
    console.error("Failed to remove memory fact", e);
  }
}

window.removeMemoryFact = removeMemoryFact;
window.openMemoryModal = openMemoryModal;
