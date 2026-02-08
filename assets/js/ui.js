import { QUESTS, DAILY_FIELDS, DAILY_FIELD_LABELS } from "./constants.js";
import { avg, escapeHtml, convertHeightToDisplay, convertHeightToCm, convertWeightToDisplay, convertWeightToKg } from "./utils.js";
import { computeSkillGains, computeProgression, computeStreakMetrics, levelFromXp } from "./progression.js";
import {
  WEEKDAY_ORDER,
  computeMetricAverage,
  computeWeekdayAverages,
  findHighestLowestWeekday,
  getMetricWindow,
} from "./metric-analytics.js";

const recapState = {
  pages: [],
  currentIndex: 0,
};

/**
 * Ephemeral pagination state for review history lists.
 *
 * This state is intentionally kept in-memory (not persisted) so the default
 * view stays lightweight while still allowing users to progressively load
 * older weekly/monthly reviews on demand.
 */
const reviewsUiState = {
  weeklyLimit: 5,
  monthlyLimit: 5,
};

/**
 * Shared metric metadata used by both dashboard overview cards and drill-down details.
 *
 * Keeping this metadata centralized guarantees labels, units, and formatting rules
 * stay consistent without introducing per-metric hardcoded markup in renderers.
 */
const METRIC_DETAIL_META = {
  calories: { label: DAILY_FIELD_LABELS.calories, unitLabel: "kcal", averageDecimals: 0, valueDecimals: 0 },
  sleepHours: { label: DAILY_FIELD_LABELS.sleepHours, unitLabel: "hours", averageDecimals: 1, valueDecimals: 1 },
  mood: { label: DAILY_FIELD_LABELS.mood, unitLabel: "/10", averageDecimals: 1, valueDecimals: 0 },
  steps: { label: DAILY_FIELD_LABELS.steps, unitLabel: "steps", averageDecimals: 0, valueDecimals: 0 },
  exerciseMinutes: { label: DAILY_FIELD_LABELS.exerciseMinutes, unitLabel: "minutes", averageDecimals: 0, valueDecimals: 0 },
  exerciseEffort: { label: DAILY_FIELD_LABELS.exerciseEffort, unitLabel: "/10", averageDecimals: 1, valueDecimals: 0 },
};

/**
 * Returns metadata for a metric key while preserving key names as fallback labels.
 */
function getMetricMeta(metricKey) {
  return METRIC_DETAIL_META[metricKey] || {
    label: DAILY_FIELD_LABELS[metricKey] || metricKey,
    unitLabel: "",
    averageDecimals: 1,
    valueDecimals: 1,
  };
}

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
export function setupTabs(onTabSwitch) {
  const navTabs = document.querySelectorAll(".tabs .tab-btn[data-tab]");
  const allTabTriggers = document.querySelectorAll("[data-tab]");
  allTabTriggers.forEach((tabBtn) => {
    tabBtn.addEventListener("click", () => {
      const tabId = tabBtn.dataset.tab;
      activateTab(tabId, navTabs);

      // Optional callback allows callers to instrument engagement funnels
      // without coupling analytics logic into view rendering internals.
      if (typeof onTabSwitch === "function") {
        onTabSwitch({
          tabId,
          triggerType: tabBtn.classList.contains("hero-action") ? "hero-cta" : "nav-tab",
        });
      }
    });
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
 * Clears all field-level validation UI and inline error messages.
 */
export function clearEntryFieldErrors() {
  const form = document.getElementById("entry-form");
  const inputs = form.querySelectorAll("input");

  inputs.forEach((input) => {
    input.classList.remove("input-invalid");
    input.removeAttribute("aria-invalid");

    const errorSlot = document.getElementById(`${input.id}-error`);
    if (errorSlot) errorSlot.textContent = "";
  });
}

/**
 * Maps validation issues to individual form fields while preserving top-level summaries.
 */
export function showEntryFieldErrors(fieldErrors = {}) {
  clearEntryFieldErrors();

  Object.entries(fieldErrors).forEach(([fieldId, messages]) => {
    const input = document.getElementById(fieldId);
    const errorSlot = document.getElementById(`${fieldId}-error`);
    if (!input || !errorSlot || !messages?.length) return;

    input.classList.add("input-invalid");
    input.setAttribute("aria-invalid", "true");
    errorSlot.textContent = messages.join(" ");
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
 * Applies persisted profile values into settings form controls.
 *
 * Personalized calorie evaluation depends on profile factors (age, body size,
 * biological sex marker, and activity multiplier), so we hydrate these fields
 * on startup to keep TDEE guidance consistent across sessions.
 */
export function hydrateProfile(state, units = { height: "cm", weight: "kg" }) {
  const profile = state.profile || {};

  const setValue = (id, value) => {
    const input = document.getElementById(id);
    if (!input) return;
    input.value = value === null || value === undefined ? "" : String(value);
  };

  setValue("profile-age", profile.age);
  setValue("profile-gender", profile.gender);
  const heightDisplay = convertHeightToDisplay(profile.heightCm, units.height);
  const weightDisplay = convertWeightToDisplay(profile.weightKg, units.weight);

  setValue("profile-height", heightDisplay.whole);
  setValue("profile-height-secondary", heightDisplay.fraction);
  setValue("profile-weight", weightDisplay.whole);
  setValue("profile-weight-secondary", weightDisplay.fraction);
  setValue("profile-activity", profile.activityLevel);
  setValue("profile-tdee", profile.tdee !== null && profile.tdee !== undefined ? Math.round(profile.tdee) : "");

  clearProfileFieldErrors();
}

/**
 * Clears inline validation treatment for profile settings controls.
 */
export function clearProfileFieldErrors() {
  ["profile-age", "profile-gender", "profile-height", "profile-height-secondary", "profile-weight", "profile-weight-secondary", "profile-activity"].forEach((fieldId) => {
    const input = document.getElementById(fieldId);
    const errorSlot = document.getElementById(`${fieldId}-error`);
    if (!input) return;
    input.classList.remove("input-invalid");
    input.removeAttribute("aria-invalid");
    if (errorSlot) errorSlot.textContent = "";
  });
}

/**
 * Maps profile validation messages to field-level error placeholders.
 */
export function showProfileFieldErrors(fieldErrors = {}) {
  clearProfileFieldErrors();

  Object.entries(fieldErrors).forEach(([fieldId, messages]) => {
    const input = document.getElementById(fieldId);
    const errorSlot = document.getElementById(`${fieldId}-error`);
    if (!input || !errorSlot || !messages?.length) return;

    input.classList.add("input-invalid");
    input.setAttribute("aria-invalid", "true");
    errorSlot.textContent = messages.join(" ");
  });
}

/**
 * Reads and normalizes profile controls from Settings.
 *
 * This helper centralizes form parsing so controller code can validate once,
 * calculate TDEE deterministically, and persist a schema-safe profile payload.
 */
export function readProfileFromForm(units = { height: "cm", weight: "kg" }) {
  const parseOptionalNumber = (id) => {
    const raw = document.getElementById(id).value.trim();
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const parseOptionalInteger = (id) => {
    const raw = document.getElementById(id).value.trim();
    if (!raw) return null;
    const parsed = Number.parseInt(raw, 10);
    return Number.isInteger(parsed) ? parsed : null;
  };

  const normalizeOptionalEnum = (id) => {
    const raw = document.getElementById(id).value;
    return raw ? raw : null;
  };

  const heightWhole = document.getElementById("profile-height").value.trim();
  const heightSecondary = document.getElementById("profile-height-secondary").value.trim();
  const weightWhole = document.getElementById("profile-weight").value.trim();
  const weightSecondary = document.getElementById("profile-weight-secondary").value.trim();

  const hasHeight = heightWhole.length > 0;
  const hasWeight = weightWhole.length > 0;

  return {
    age: parseOptionalInteger("profile-age"),
    gender: normalizeOptionalEnum("profile-gender"),
    heightCm: hasHeight ? convertHeightToCm(heightWhole, heightSecondary || "0", units.height) : null,
    weightKg: hasWeight ? convertWeightToKg(weightWhole, weightSecondary || "0", units.weight) : null,
    activityLevel: normalizeOptionalEnum("profile-activity"),
  };
}

/**
 * Renders and opens the three-step daily recap modal (skills -> attributes -> quests).
 */
export function renderRecap(entry, state) {
  const gains = computeSkillGains(entry);
  const progression = computeProgression(state.entries, state.acceptedQuests, state.profile);

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

  const behaviorSummary = progression.behavior;
  const behaviorMessage = behaviorSummary.restDay.message;
  const behaviorExplanation = describeBehaviorAdjustment(behaviorSummary);
  const behaviorHint = behaviorSummary.recoveryXp > 0
    ? `Recovery boost active (+${behaviorSummary.recoveryXp} XP). ${behaviorExplanation.recoveryText}`
    : behaviorExplanation.recoveryText;

  recapState.pages = [
    `<div class="recap-page active"><h4>1) Skills</h4><p class="muted">Base XP: +${baseXp} XP • Bonus XP: +${bonusXp.total} XP • Total: +${totalXp} XP</p><table><thead><tr><th>Skill</th><th>Gain</th></tr></thead><tbody>${skillRows}</tbody></table><h5 class="spacer-top">Bonus XP Breakdown</h5>${bonusReasons}<h5 class="spacer-top">Behavior Mechanics</h5><p class="muted">Penalty rate: ${formatPercent(behaviorSummary.penaltyRate)} • Recovery rate: ${formatPercent(behaviorSummary.recoveryRate)}</p><p>${behaviorExplanation.penaltyText}</p><p>${behaviorHint}</p><p class="muted">${behaviorMessage}</p></div>`,
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
 * Builds clear user-facing behavior copy showing penalty/recovery contributors.
 */
function describeBehaviorAdjustment(behaviorSummary) {
  const penaltyDrivers = [];
  if (behaviorSummary.missedDayPenaltyRate > 0) penaltyDrivers.push("missed days");
  if (behaviorSummary.caloriePenaltyRate > 0) penaltyDrivers.push("calorie deviation");

  const recoveryDrivers = [];
  if ((behaviorSummary.recoveryRate - behaviorSummary.calorieRecoveryRate) > 0) recoveryDrivers.push("comeback streak");
  if (behaviorSummary.calorieRecoveryRate > 0) recoveryDrivers.push("calorie adherence");

  const penaltyText = penaltyDrivers.length
    ? `Penalty applied from ${penaltyDrivers.join(" + ")}.`
    : "No penalty applied today.";

  const recoveryText = recoveryDrivers.length
    ? `Recovery bonus supported by ${recoveryDrivers.join(" + ")}.`
    : "No recovery bonus yet—keep building consistency.";

  return { penaltyText, recoveryText };
}

/**
 * Formats behavior rates as a human-readable percentage string.
 */
function formatPercent(rate) {
  return `${Math.round(rate * 100)}%`;
}

/**
 * Renders the dashboard aggregate and 7-day trend summary views.
 */
export function renderDashboard(state) {
  const progression = computeProgression(state.entries, state.acceptedQuests, state.profile);
  const streakMetrics = computeStreakMetrics(state.entries);
  const entries = progression.orderedEntries;
  const latest7 = entries.slice(-7);

  const averages = {
    calories: avg(latest7.map((e) => e.calories).filter((v) => v !== null)),
    sleepHours: avg(latest7.map((e) => e.sleepHours).filter((v) => v !== null)),
    mood: avg(latest7.map((e) => e.mood).filter((v) => v !== null)),
    steps: avg(latest7.map((e) => e.steps).filter((v) => v !== null)),
    exerciseMinutes: avg(latest7.map((e) => e.exerciseMinutes).filter((v) => v !== null)),
    exerciseEffort: avg(latest7.map((e) => e.exerciseEffort).filter((v) => v !== null)),
  };

  // Track per-metric sample sizes so sparse datasets render with explicit placeholders, not misleading zeros.
  const averageSampleSizes = {
    calories: latest7.filter((entry) => entry.calories !== null).length,
    sleepHours: latest7.filter((entry) => entry.sleepHours !== null).length,
    mood: latest7.filter((entry) => entry.mood !== null).length,
    steps: latest7.filter((entry) => entry.steps !== null).length,
    exerciseMinutes: latest7.filter((entry) => entry.exerciseMinutes !== null).length,
    exerciseEffort: latest7.filter((entry) => entry.exerciseEffort !== null).length,
  };

  /**
   * Formats a 7-day average with an em dash fallback when not enough datapoints exist.
   */
  const formatAverage = (metricKey, decimals = 1) => {
    if (!averageSampleSizes[metricKey]) return formatValue(null);
    return averages[metricKey].toFixed(decimals);
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

  // The specific metrics requested for drill-down are surfaced as interactive summary cards.
  const detailMetricCards = [
    { key: "mood", title: "7-Day Avg Mood" },
    { key: "sleepHours", title: "7-Day Avg Sleep (hrs)" },
    { key: "steps", title: "7-Day Avg Steps" },
    { key: "exerciseMinutes", title: "7-Day Avg Exercise Min" },
    { key: "exerciseEffort", title: "7-Day Avg Exercise Effort" },
    { key: "calories", title: "7-Day Avg Calories" },
  ]
    .map(({ key, title }) => {
      const meta = getMetricMeta(key);
      const value = formatAverage(key, meta.averageDecimals);
      return `<button class="card dashboard-metric-trigger" type="button" data-metric-key="${key}" aria-label="Open ${meta.label} details"><strong>${title}</strong><div class="metric">${value}</div><div class="muted">Tap for detail view</div></button>`;
    })
    .join("");

  document.getElementById("dashboard-overview-content").innerHTML = `
    ${tips}
    <div class="cards dashboard-summary ${state.settings.compactCards ? "compact" : ""}">
      <div class="card"><strong>Overall XP</strong><div class="metric">${progression.overallXp}</div></div>
      <div class="card"><strong>Total Logged Days</strong><div class="metric">${entries.length}</div></div>
      <div class="card"><strong>Behavior Modifier</strong><div class="metric">-${progression.behavior.penaltyXp} / +${progression.behavior.recoveryXp}</div><div class="muted">Penalty ${formatPercent(progression.behavior.penaltyRate)} • Recovery ${formatPercent(progression.behavior.recoveryRate)} • Calorie penalty ${formatPercent(progression.behavior.caloriePenaltyRate)}</div></div>
      ${detailMetricCards}
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

    <h3 class="spacer-top">Behavior Mechanics</h3>
    <div class="cards ${state.settings.compactCards ? "compact" : ""}">
      <div class="card"><strong>Protected Rest Day</strong><div class="metric">${progression.behavior.restDay.eligible ? "Available" : "Not active"}</div><div class="muted">${progression.behavior.restDay.message}</div></div>
      <div class="card"><strong>Missed-Day Soft Penalty</strong><div class="metric">${formatPercent(progression.behavior.missedDayPenaltyRate)}</div><div class="muted">Applied only for implicit skipped days between logs.</div></div>
      <div class="card"><strong>Calorie Adherence Penalty</strong><div class="metric">${formatPercent(progression.behavior.caloriePenaltyRate)}</div><div class="muted">Based on recent calories outside your personalized TDEE range when profile data is complete.</div></div>
      <div class="card"><strong>Comeback Recovery</strong><div class="metric">${formatPercent(progression.behavior.recoveryRate)}</div><div class="muted">${progression.behavior.recoveryRate > 0 ? "Great rebound momentum—keep the streak going." : "No rush. Recovery bonus starts after a short comeback run."}</div></div>
    </div>

    <h3 class="spacer-top">Quest Highlights</h3>
    <div class="cards ${state.settings.compactCards ? "compact" : ""}">${questHighlights}</div>
  `;
}

/**
 * Renders a metric-specific detail panel from shared metadata and recent entries.
 */
export function renderMetricDetail(state, metricKey) {
  const MIN_POINTS_FOR_INSIGHTS = 5;
  const WINDOW_DAYS = 30;
  const detailContent = document.getElementById("dashboard-detail-content");
  if (!detailContent) return;

  if (!DAILY_FIELDS.includes(metricKey)) {
    detailContent.innerHTML = '<div class="msg warn">Unsupported metric detail requested.</div>';
    return;
  }

  const meta = getMetricMeta(metricKey);
  const progression = computeProgression(state.entries, state.acceptedQuests, state.profile);
  const orderedEntries = progression.orderedEntries;
  const entriesWithMetric = orderedEntries.filter((entry) => entry[metricKey] !== null);
  const metricWindow = getMetricWindow(orderedEntries, metricKey, WINDOW_DAYS);
  const windowValues = metricWindow.map((point) => point.value).filter((value) => Number.isFinite(value));
  const weekdayAverages = computeWeekdayAverages(metricWindow);
  const weekdayExtremes = findHighestLowestWeekday(weekdayAverages);

  const formatMetricValue = (value, decimals = meta.valueDecimals) => {
    if (value === null || value === undefined) return formatValue(null);
    return Number(value).toFixed(decimals);
  };

  const latestValue = entriesWithMetric.length ? entriesWithMetric[entriesWithMetric.length - 1][metricKey] : null;
  const minValue = entriesWithMetric.length ? Math.min(...entriesWithMetric.map((entry) => entry[metricKey])) : null;
  const maxValue = entriesWithMetric.length ? Math.max(...entriesWithMetric.map((entry) => entry[metricKey])) : null;
  const last30Average = computeMetricAverage(metricWindow);

  const maxWindowValue = windowValues.length ? Math.max(...windowValues) : 0;
  const metricBars = metricWindow
    .map((point) => {
      const hasValue = Number.isFinite(point.value);
      const barHeight = hasValue && maxWindowValue > 0 ? Math.max(6, (point.value / maxWindowValue) * 100) : 14;
      const shortDate = point.date.slice(5);
      return `
        <div class="bar-col" title="${point.date}: ${formatMetricValue(point.value)}">
          <div class="bar ${hasValue ? "" : "bar-missing"}" style="height:${barHeight}%"></div>
          <div>${shortDate}</div>
        </div>`;
    })
    .join("");

  const weekdayRows = WEEKDAY_ORDER
    .map((day) => {
      const value = weekdayAverages[day];
      const isHighest = weekdayExtremes.highest?.day === day;
      const isLowest = weekdayExtremes.lowest?.day === day;
      const tag = isHighest ? '<span class="pill">Highest</span>' : isLowest ? '<span class="pill muted-pill">Lowest</span>' : "";
      return `<tr><td>${day}</td><td>${formatMetricValue(value, meta.averageDecimals)}</td><td>${tag}</td></tr>`;
    })
    .join("");

  const emptyWindowMessage = `Need at least ${MIN_POINTS_FOR_INSIGHTS} logged ${meta.label.toLowerCase()} data points in the last ${WINDOW_DAYS} days to unlock this insight.`;

  const recentRows = orderedEntries
    .slice(-14)
    .reverse()
    .map((entry) => `<tr><td>${entry.date}</td><td>${formatMetricValue(entry[metricKey])}</td></tr>`)
    .join("") || `<tr><td colspan="2">No entries yet.</td></tr>`;

  detailContent.innerHTML = `
    <div class="row dashboard-detail-head">
      <button id="dashboard-detail-back" class="ghost" type="button" aria-label="Return to dashboard overview">← Back to overview</button>
    </div>
    <h3>${meta.label} Details</h3>
    <p class="muted">Unit: ${meta.unitLabel || "n/a"} • Last ${WINDOW_DAYS} days sample size: ${windowValues.length}</p>

    <div class="cards dashboard-summary">
      <div class="card"><strong>Latest Logged</strong><div class="metric">${formatMetricValue(latestValue)}</div></div>
      <div class="card"><strong>${WINDOW_DAYS}-Day Average</strong><div class="metric">${windowValues.length >= MIN_POINTS_FOR_INSIGHTS ? formatMetricValue(last30Average, meta.averageDecimals) : formatValue(null)}</div></div>
      <div class="card"><strong>Minimum Logged</strong><div class="metric">${formatMetricValue(minValue)}</div></div>
      <div class="card"><strong>Maximum Logged</strong><div class="metric">${formatMetricValue(maxValue)}</div></div>
    </div>

    <h4 class="spacer-top">${WINDOW_DAYS}-Day ${meta.label} Trend</h4>
    ${windowValues.length >= MIN_POINTS_FOR_INSIGHTS
      ? `<div class="chart-wrap metric-window-chart" aria-label="${WINDOW_DAYS}-day ${meta.label} trend graph">${metricBars}</div>`
      : `<div class="msg warn">${emptyWindowMessage}</div>`}

    <h4 class="spacer-top">Weekday ${meta.label} Averages</h4>
    ${windowValues.length >= MIN_POINTS_FOR_INSIGHTS
      ? `<table aria-label="Weekday ${meta.label} averages"><thead><tr><th>Weekday</th><th>Average</th><th>Highlight</th></tr></thead><tbody>${weekdayRows}</tbody></table>`
      : `<div class="msg warn">${emptyWindowMessage}</div>`}

    <h4 class="spacer-top">Recent ${meta.label} Records (Last 14)</h4>
    <table aria-label="Recent ${meta.label} records">
      <thead><tr><th>Date</th><th>${meta.label}</th></tr></thead>
      <tbody>${recentRows}</tbody>
    </table>
  `;
}

/**
 * Renders quest acceptance controls and progress in a dedicated quest log.
 */
export function renderQuestLog(state) {
  const progression = computeProgression(state.entries, state.acceptedQuests, state.profile);

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
 * Builds a short review summary from structured prompt fields.
 * Falls back to legacy `text` records so existing saved data still renders correctly.
 */
function summarizeReview(review) {
  const legacyText = typeof review?.text === "string" ? review.text.trim() : "";
  if (legacyText) return escapeHtml(legacyText);

  const fieldLabels = [
    ["wins", "W"],
    ["blockers", "B"],
    ["nextAction", "N"],
    ["confidence", "C"],
  ];

  // Render only populated fields to keep summaries compact and readable.
  const parts = fieldLabels
    .map(([key, shortLabel]) => {
      const value = typeof review?.[key] === "string" ? review[key].trim() : "";
      return value ? `<span><strong>${shortLabel}:</strong> ${escapeHtml(value)}</span>` : "";
    })
    .filter(Boolean);

  return parts.join(" • ") || "No details provided.";
}

/**
 * Renders recent weekly/monthly review notes.
 */
export function renderReviewsList(state) {
  const pageSize = 5;
  const weeklyEntries = Object.entries(state.reviews.weekly).sort(([a], [b]) => b.localeCompare(a));
  const monthlyEntries = Object.entries(state.reviews.monthly).sort(([a], [b]) => b.localeCompare(a));

  // Keep limits bounded to available data so pagination controls reflect real list size after edits/deletes.
  reviewsUiState.weeklyLimit = Math.max(pageSize, Math.min(reviewsUiState.weeklyLimit, weeklyEntries.length || pageSize));
  reviewsUiState.monthlyLimit = Math.max(pageSize, Math.min(reviewsUiState.monthlyLimit, monthlyEntries.length || pageSize));

  // Pagination is intentionally in-memory only: limits reset on refresh to keep first paint compact and predictable.
  const visibleWeeklyEntries = weeklyEntries.slice(0, reviewsUiState.weeklyLimit);
  const visibleMonthlyEntries = monthlyEntries.slice(0, reviewsUiState.monthlyLimit);

  /**
   * Renders one review item with consistent metadata and action hooks.
   * Data attributes are consumed by delegated event handlers in main.js.
   */
  const renderReviewItem = (type, period, review) => `
    <li class="review-item">
      <div class="review-item-head">
        <strong>${period}</strong>
        <span class="muted">${type} review</span>
      </div>
      <p>${summarizeReview(review)}</p>
      <div class="review-actions">
        <button
          type="button"
          class="ghost review-edit-btn"
          data-review-action="edit"
          data-review-type="${type}"
          data-review-period="${period}"
        >Edit</button>
        <button
          type="button"
          class="ghost review-delete-btn"
          data-review-action="delete"
          data-review-type="${type}"
          data-review-period="${period}"
        >Delete</button>
      </div>
    </li>
  `;

  const weekly = visibleWeeklyEntries
    .map(([period, review]) => renderReviewItem("weekly", period, review))
    .join("") || "<li>No weekly reviews yet.</li>";

  const monthly = visibleMonthlyEntries
    .map(([period, review]) => renderReviewItem("monthly", period, review))
    .join("") || "<li>No monthly reviews yet.</li>";

  const weeklyShowMoreVisible = weeklyEntries.length > reviewsUiState.weeklyLimit;
  const weeklyShowLessVisible = weeklyEntries.length > pageSize && reviewsUiState.weeklyLimit > pageSize;
  const monthlyShowMoreVisible = monthlyEntries.length > reviewsUiState.monthlyLimit;
  const monthlyShowLessVisible = monthlyEntries.length > pageSize && reviewsUiState.monthlyLimit > pageSize;

  document.getElementById("reviews-list").innerHTML = `
    <div class="row">
      <div class="card">
        <h3>Weekly Reviews</h3>
        <ul>${weekly}</ul>
        <div class="row">
          ${weeklyShowMoreVisible ? '<button type="button" class="ghost review-pagination-btn" data-review-action="weekly-more">Show more</button>' : ""}
          ${weeklyShowLessVisible ? '<button type="button" class="ghost review-pagination-btn" data-review-action="weekly-less">Show less</button>' : ""}
        </div>
      </div>
      <div class="card">
        <h3>Monthly Reviews</h3>
        <ul>${monthly}</ul>
        <div class="row">
          ${monthlyShowMoreVisible ? '<button type="button" class="ghost review-pagination-btn" data-review-action="monthly-more">Show more</button>' : ""}
          ${monthlyShowLessVisible ? '<button type="button" class="ghost review-pagination-btn" data-review-action="monthly-less">Show less</button>' : ""}
        </div>
      </div>
    </div>
  `;

  // Rebind pagination controls after each render because list content is replaced.
  document.querySelectorAll(".review-pagination-btn").forEach((button) => {
    button.addEventListener("click", () => {
      switch (button.dataset.reviewAction) {
        case "weekly-more":
          reviewsUiState.weeklyLimit = Math.min(reviewsUiState.weeklyLimit + pageSize, weeklyEntries.length);
          break;
        case "weekly-less":
          reviewsUiState.weeklyLimit = pageSize;
          break;
        case "monthly-more":
          reviewsUiState.monthlyLimit = Math.min(reviewsUiState.monthlyLimit + pageSize, monthlyEntries.length);
          break;
        case "monthly-less":
          reviewsUiState.monthlyLimit = pageSize;
          break;
        default:
          return;
      }
      renderReviewsList(state);
    });
  });
}

/**
 * Applies settings state values into UI controls and body class toggles.
 */
export function hydrateSettings(state) {
  document.getElementById("setting-compact").checked = state.settings.compactCards;
  document.getElementById("setting-animations").checked = state.settings.enableAnimations;
  document.getElementById("setting-showtips").checked = state.settings.showTips;
  document.getElementById("setting-height-unit").value = state.settings.units?.height || "cm";
  document.getElementById("setting-weight-unit").value = state.settings.units?.weight || "kg";
}

function formatValue(value) {
  return value === null ? "—" : value;
}
