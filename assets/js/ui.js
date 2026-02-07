import { QUESTS, DAILY_FIELDS } from "./constants.js";
import { avg, escapeHtml } from "./utils.js";
import { computeSkillGains, computeProgression, levelFromXp } from "./progression.js";

const recapState = {
  pages: [],
  currentIndex: 0,
};

/**
 * Renders contextual status messages into the target container.
 */
export function showMessages(containerId, messages, style) {
  const box = document.getElementById(containerId);
  box.innerHTML = messages.map((m) => `<div class="msg ${style}">${m}</div>`).join("");
}

/**
 * Activates tab button interactions for section switching.
 */
export function setupTabs() {
  const navTabs = document.querySelectorAll(".tabs .tab-btn[data-tab]");
  const allTabTriggers = document.querySelectorAll("[data-tab]");
  allTabTriggers.forEach((tabBtn) => {
    tabBtn.addEventListener("click", () => activateTab(tabBtn.dataset.tab, navTabs));
  });
}

/**
 * Switches tab panels and updates button active state.
 */
function activateTab(tabId, tabs = document.querySelectorAll(".tabs .tab-btn[data-tab]")) {
  tabs.forEach((btn) => btn.classList.toggle("active", btn.dataset.tab === tabId));
  document.querySelectorAll(".tab").forEach((tab) => tab.classList.add("hidden"));
  document.getElementById(tabId).classList.remove("hidden");
}

/**
 * Hydrates daily form fields for a selected date from existing stored entry.
 */
export function hydrateFormForDate(state) {
  const date = document.getElementById("entry-date").value;
  const entry = state.entries[date];

  DAILY_FIELDS.forEach((field) => {
    const input = document.getElementById(field);
    input.value = entry && entry[field] !== null ? entry[field] : "";
  });
}

/**
 * Reads and normalizes daily form input into the entry schema.
 */
export function readEntryFromForm() {
  const parseOptionalNumber = (id) => {
    const raw = document.getElementById(id).value;
    if (raw === "") return null;
    const parsed = Number(raw);
    return Number.isNaN(parsed) ? null : parsed;
  };

  return {
    date: document.getElementById("entry-date").value,
    calories: parseOptionalNumber("calories"),
    sleepHours: parseOptionalNumber("sleepHours"),
    mood: parseOptionalNumber("mood"),
    steps: parseOptionalNumber("steps"),
    exerciseMinutes: parseOptionalNumber("exerciseMinutes"),
    exerciseEffort: parseOptionalNumber("exerciseEffort"),
  };
}

/**
 * Renders and opens the three-step daily recap modal (skills -> attributes -> quests).
 */
export function renderRecap(entry, state) {
  const gains = computeSkillGains(entry);
  const progression = computeProgression(state.entries, state.acceptedQuests);

  const baseXp = 20;
  const bonusXp = calculateBonusXp(entry);
  const totalXp = baseXp + bonusXp.total;

  const skillRows = Object.entries(gains)
    .map(([skill, xp]) => `<tr><td>${skill}</td><td>+${xp} XP</td></tr>`)
    .join("");

  const attributeCards = Object.entries(progression.attributeXp)
    .map(([attribute, xp]) => {
      const levelInfo = levelFromXp(xp);
      return `<div class="card"><strong>${attribute}</strong><div class="metric">L${levelInfo.level}</div><div>${levelInfo.inLevelXp}/${levelInfo.next} XP</div></div>`;
    })
    .join("");

  const questRows = Object.entries(QUESTS)
    .map(([key, q]) => {
      const current = progression.quests[key].current;
      const acceptedPill = progression.quests[key].accepted
        ? '<span class="pill">Accepted</span>'
        : '<span class="pill muted-pill">Not accepted</span>';
      return `<tr><td>${q.label} ${acceptedPill}</td><td>${current}/${q.target}</td></tr>`;
    })
    .join("");

  const bonusReasons = bonusXp.reasons.length
    ? `<ul>${bonusXp.reasons.map((reason) => `<li>${reason}</li>`).join("")}</ul>`
    : "<p class=\"muted\">No bonus XP earned today.</p>";

  recapState.pages = [
    `<div class="recap-page active"><h4>1) Skills</h4><p class="muted">Base XP: +${baseXp} XP • Bonus XP: +${bonusXp.total} XP • Total: +${totalXp} XP</p><table><thead><tr><th>Skill</th><th>Gain</th></tr></thead><tbody>${skillRows}</tbody></table><h5 class="spacer-top">Bonus XP Breakdown</h5>${bonusReasons}</div>`,
    `<div class="recap-page"><h4>2) Attributes</h4><div class="cards">${attributeCards}</div></div>`,
    `<div class="recap-page"><h4>3) Quests</h4><table><thead><tr><th>Quest</th><th>Progress</th></tr></thead><tbody>${questRows}</tbody></table></div>`,
  ];
  recapState.currentIndex = 0;

  document.getElementById("recap-modal").classList.remove("hidden");
  document.getElementById("recap-modal").setAttribute("aria-hidden", "false");
  renderRecapPage(state.settings.enableAnimations);
}

/**
 * Attaches modal controls once at startup.
 */
export function setupRecapModalControls() {
  const closeButton = document.getElementById("close-recap");
  const modal = document.getElementById("recap-modal");

  closeButton.addEventListener("click", (event) => {
    // Keep the close action deterministic even if the button is nested in other interactive wrappers.
    event.preventDefault();
    event.stopPropagation();
    closeRecapModal();
  });

  // Allow closing by clicking the dimmed backdrop for a standard modal UX.
  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeRecapModal();
  });

  // Support keyboard-driven dismissal for accessibility and fallback reliability.
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modal.getAttribute("aria-hidden") === "false") {
      closeRecapModal();
    }
  });

  document.getElementById("recap-prev").addEventListener("click", () => {
    recapState.currentIndex = Math.max(0, recapState.currentIndex - 1);
    renderRecapPage();
  });
  document.getElementById("recap-next").addEventListener("click", () => {
    if (recapState.currentIndex >= recapState.pages.length - 1) {
      closeRecapModal();
      return;
    }
    recapState.currentIndex += 1;
    renderRecapPage();
  });

  // Enforce a closed state at startup in case the modal DOM was restored by browser session history.
  closeRecapModal();
}

function closeRecapModal() {
  const modal = document.getElementById("recap-modal");

  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");

  // Reset recap internals so a stale page does not flash when the modal is reopened.
  recapState.pages = [];
  recapState.currentIndex = 0;
  document.getElementById("recap-steps").innerHTML = "";
  document.getElementById("recap-dots").innerHTML = "";
}

/**
 * Renders current recap page with a small transition animation for readability.
 */
function renderRecapPage(enableAnimation = true) {
  const container = document.getElementById("recap-steps");
  const dots = document.getElementById("recap-dots");
  container.innerHTML = recapState.pages[recapState.currentIndex] || "";

  const page = container.querySelector(".recap-page");
  if (page && enableAnimation) {
    page.classList.add("recap-enter");
    requestAnimationFrame(() => page.classList.add("recap-enter-active"));
  }

  dots.innerHTML = recapState.pages
    .map((_, index) => `<span class="dot ${index === recapState.currentIndex ? "dot-active" : ""}"></span>`)
    .join("");

  document.getElementById("recap-prev").disabled = recapState.currentIndex === 0;
  document.getElementById("recap-next").textContent = recapState.currentIndex === recapState.pages.length - 1 ? "Finish" : "Next";
}

/**
 * Provides explicit and explainable bonus XP rules for recap communication.
 */
function calculateBonusXp(entry) {
  const reasons = [];
  let total = 0;

  if (entry.sleepHours !== null && entry.sleepHours >= 7 && entry.sleepHours <= 9) {
    total += 5;
    reasons.push("+5 XP rested bonus: sleep stayed in the 7–9h recovery range.");
  }
  if (entry.exerciseMinutes !== null && entry.exerciseMinutes >= 30) {
    total += 5;
    reasons.push("+5 XP training bonus: you logged at least 30 minutes of exercise.");
  }
  if (entry.mood !== null && entry.mood >= 8) {
    total += 5;
    reasons.push("+5 XP momentum bonus: mood reached 8 or higher.");
  }

  return { total, reasons };
}

/**
 * Renders the dashboard aggregate and 7-day trend summary views.
 */
export function renderDashboard(state) {
  const progression = computeProgression(state.entries, state.acceptedQuests);
  const entries = progression.orderedEntries;
  const latest7 = entries.slice(-7);

  const averages = {
    calories: avg(latest7.map((e) => e.calories).filter((v) => v !== null)),
    sleepHours: avg(latest7.map((e) => e.sleepHours).filter((v) => v !== null)),
    mood: avg(latest7.map((e) => e.mood).filter((v) => v !== null)),
    steps: avg(latest7.map((e) => e.steps).filter((v) => v !== null)),
    exerciseMinutes: avg(latest7.map((e) => e.exerciseMinutes).filter((v) => v !== null)),
  };

  const skillLines = Object.entries(progression.skillXp)
    .map(([skill, xp]) => `<li>${skill}: ${xp} XP</li>`)
    .join("") || "<li>No data yet.</li>";

  const tableRows = latest7
    .map(
      (entry) => `
    <tr>
      <td>${entry.date}</td><td>${formatValue(entry.calories)}</td><td>${formatValue(entry.sleepHours)}</td><td>${formatValue(entry.mood)}</td><td>${formatValue(entry.steps)}</td><td>${formatValue(entry.exerciseMinutes)}</td>
    </tr>
  `
    )
    .join("") || `<tr><td colspan="6">No entries yet.</td></tr>`;

  const attributeCards = Object.entries(progression.attributeXp)
    .map(([attribute, xp]) => {
      const levelInfo = levelFromXp(xp);
      return `<div class="card"><strong>${attribute}</strong><div class="metric">L${levelInfo.level}</div><div>${levelInfo.inLevelXp}/${levelInfo.next} XP to next level</div></div>`;
    })
    .join("");

  const moodBars = latest7
    .map((entry) => {
      // Distinguish explicit low mood values from missing mood logs to prevent misleading zero-height bars.
      const isMissingMood = entry.mood === null;
      const safeMood = isMissingMood ? 0 : entry.mood;
      const height = Math.round((safeMood / 10) * 100);
      const barClass = isMissingMood ? "bar bar-missing" : "bar";
      const barTitle = isMissingMood ? "No mood data logged" : `Mood: ${entry.mood}/10`;
      return `<div class="bar-col"><div class="${barClass}" style="height:${height}%" title="${barTitle}"></div><span>${entry.date.slice(5)}</span></div>`;
    })
    .join("");

  const questHighlights = Object.entries(QUESTS)
    .map(([key, quest]) => {
      const data = progression.quests[key];
      return `<div class="card"><strong>${quest.label}</strong><div class="metric">${data.current}/${data.target}</div><div class="muted">${data.accepted ? "Tracking active" : "Accept in Quest Log"}</div></div>`;
    })
    .join("");

  const tips = state.settings.showTips
    ? '<div class="msg good">Tip: Use the “Log Daily Record” button at the top to keep your streak and maximize bonus XP opportunities.</div>'
    : "";

  document.getElementById("dashboard-content").innerHTML = `
    ${tips}
    <div class="cards ${state.settings.compactCards ? "compact" : ""}">
      <div class="card"><strong>Overall XP</strong><div class="metric">${progression.overallXp}</div></div>
      <div class="card"><strong>Total Logged Days</strong><div class="metric">${entries.length}</div></div>
      <div class="card"><strong>7-Day Avg Mood</strong><div class="metric">${averages.mood.toFixed(1)}</div></div>
    </div>

    <h3 class="spacer-top">7-Day Mood Graph</h3>
    <p class="chart-legend muted">Legend: <span class="legend-chip legend-low" aria-hidden="true"></span> Filled bar = logged mood (including low values). <span class="legend-chip legend-missing" aria-hidden="true"></span> Hollow dotted bar = no data logged.</p>
    <div class="chart-wrap">${moodBars || '<p class="muted">Add entries to generate chart data.</p>'}</div>

    <h3 class="spacer-top">Recent Entries (Last 7)</h3>
    <table>
      <thead><tr><th>Date</th><th>Calories</th><th>Sleep</th><th>Mood</th><th>Steps</th><th>Exercise Min</th></tr></thead>
      <tbody>${tableRows}</tbody>
    </table>

    <h3 class="spacer-top">Skill XP</h3>
    <ul>${skillLines}</ul>

    <h3>Attribute Levels</h3>
    <div class="cards ${state.settings.compactCards ? "compact" : ""}">${attributeCards}</div>

    <h3 class="spacer-top">Quest Highlights</h3>
    <div class="cards ${state.settings.compactCards ? "compact" : ""}">${questHighlights}</div>
  `;
}

/**
 * Renders quest acceptance controls and progress in a dedicated quest log.
 */
export function renderQuestLog(state) {
  const progression = computeProgression(state.entries, state.acceptedQuests);

  const rows = Object.entries(QUESTS)
    .map(([key, quest]) => {
      const progress = progression.quests[key];
      return `
      <div class="card quest-card">
        <h3>${quest.label}</h3>
        <p class="muted">Type: ${quest.type} • Target: ${quest.target}</p>
        <div class="metric">${progress.current}/${progress.target}</div>
        <button class="${progress.accepted ? "ghost" : "primary"} quest-accept-btn" data-quest-id="${key}" type="button" ${
          progress.accepted ? "disabled" : ""
        }>${progress.accepted ? "Accepted" : "Accept Quest"}</button>
      </div>`;
    })
    .join("");

  document.getElementById("quest-log-content").innerHTML = `<div class="cards">${rows}</div>`;
}

/**
 * Renders recent weekly/monthly review notes.
 */
export function renderReviewsList(state) {
  const weekly = Object.entries(state.reviews.weekly)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 5)
    .map(([period, review]) => `<li><strong>${period}</strong>: ${escapeHtml(review.text)}</li>`)
    .join("") || "<li>No weekly reviews yet.</li>";

  const monthly = Object.entries(state.reviews.monthly)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 5)
    .map(([period, review]) => `<li><strong>${period}</strong>: ${escapeHtml(review.text)}</li>`)
    .join("") || "<li>No monthly reviews yet.</li>";

  document.getElementById("reviews-list").innerHTML = `
    <div class="row">
      <div class="card"><h3>Recent Weekly Reviews</h3><ul>${weekly}</ul></div>
      <div class="card"><h3>Recent Monthly Reviews</h3><ul>${monthly}</ul></div>
    </div>
  `;
}

/**
 * Applies settings state values into UI controls and body class toggles.
 */
export function hydrateSettings(state) {
  document.getElementById("setting-compact").checked = state.settings.compactCards;
  document.getElementById("setting-animations").checked = state.settings.enableAnimations;
  document.getElementById("setting-showtips").checked = state.settings.showTips;
}

function formatValue(value) {
  return value === null ? "—" : value;
}
