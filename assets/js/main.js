import { loadState, persistState, getDefaultState } from "./storage.js";
import { todayISO } from "./utils.js";
import { isEditable, validateEntry } from "./validation.js";
import {
  setupTabs,
  hydrateFormForDate,
  readEntryFromForm,
  renderDashboard,
  renderRecap,
  renderReviewsList,
  showMessages,
  renderQuestLog,
  hydrateSettings,
  setupRecapModalControls,
  clearEntryFieldErrors,
  showEntryFieldErrors,
} from "./ui.js";

const state = loadState();

/**
 * Initializes app startup defaults and wires all UI handlers.
 */
function init() {
  setupTabs();
  setupRecapModalControls();
  initializeFormDefaults();
  bindEvents();
  hydrateSettings(state);
  refreshAllViews();
}

/**
 * Adds listeners for all interactive elements.
 */
function bindEvents() {
  document.getElementById("entry-date").addEventListener("change", () => {
    clearEntryFieldErrors();
    hydrateFormForDate(state);
  });

  // Clear individual field errors as soon as the user edits corresponding values.
  document.querySelectorAll("#entry-form input").forEach((input) => {
    input.addEventListener("input", () => {
      const errorSlot = document.getElementById(`${input.id}-error`);
      input.classList.remove("input-invalid");
      input.removeAttribute("aria-invalid");
      if (errorSlot) errorSlot.textContent = "";
    });
  });
  document.getElementById("entry-form").addEventListener("submit", onEntrySubmit);
  document.getElementById("save-weekly").addEventListener("click", saveWeeklyReview);
  document.getElementById("save-monthly").addEventListener("click", saveMonthlyReview);

  document.getElementById("quest-log-content").addEventListener("click", (event) => {
    const button = event.target.closest(".quest-accept-btn");
    if (!button) return;
    const questId = button.dataset.questId;
    state.acceptedQuests[questId] = true;
    persistState(state);
    refreshAllViews();
    showMessages("entry-messages", ["Quest accepted and now tracking progress."], "good");
  });

  document.getElementById("setting-compact").addEventListener("change", onSettingsChange);
  document.getElementById("setting-animations").addEventListener("change", onSettingsChange);
  document.getElementById("setting-showtips").addEventListener("change", onSettingsChange);
  document.getElementById("reset-account").addEventListener("click", resetAccount);
}

/**
 * Sets initial date defaults for all date controls.
 */
function initializeFormDefaults() {
  const today = todayISO();
  document.getElementById("entry-date").value = today;
  document.getElementById("weekly-period").value = today;
  document.getElementById("monthly-period").value = `${today.slice(0, 8)}01`;
  hydrateFormForDate(state);
}

/**
 * Handles daily entry submit flow, validation, persistence, and UI refreshes.
 */
function onEntrySubmit(event) {
  event.preventDefault();
  const entry = readEntryFromForm();

  // Always reset stale inline errors before evaluating a new submit attempt.
  clearEntryFieldErrors();

  if (!entry.date) {
    showEntryFieldErrors({ "entry-date": ["Date is required."] });
    showMessages("entry-messages", ["Date is required."], "bad");
    return;
  }

  const existing = state.entries[entry.date];
  if (existing && !isEditable(entry.date)) {
    showEntryFieldErrors({ "entry-date": ["This entry is read-only for edits."] });
    showMessages("entry-messages", ["This entry is read-only. Edit window (24h after day end) has expired."], "bad");
    return;
  }

  const validation = validateEntry(entry);
  if (validation.hardErrors.length) {
    showEntryFieldErrors(validation.fieldErrors);
    showMessages("entry-messages", validation.hardErrors, "bad");
    return;
  }

  const now = new Date().toISOString();
  state.entries[entry.date] = {
    ...entry,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    isAnomalous: validation.anomalies.length > 0,
    anomalyNotes: validation.anomalies,
  };

  persistState(state);

  const messages = [existing ? "Entry updated." : "Entry saved."];
  if (validation.softWarnings.length) messages.push(...validation.softWarnings);
  showMessages("entry-messages", messages, validation.softWarnings.length ? "warn" : "good");

  renderRecap(state.entries[entry.date], state);
  refreshAllViews();
}

/**
 * Persists structured weekly review prompts for better summaries and planning.
 */
function saveWeeklyReview() {
  const period = document.getElementById("weekly-period").value;

  // Capture each prompt independently so the review can be rendered as a compact summary later.
  const prompts = {
    wins: document.getElementById("weekly-wins").value.trim(),
    blockers: document.getElementById("weekly-blockers").value.trim(),
    nextAction: document.getElementById("weekly-next-action").value.trim(),
    confidence: document.getElementById("weekly-confidence").value.trim(),
  };

  // Require a valid period and at least one filled prompt to avoid saving empty records.
  if (!period || !Object.values(prompts).some(Boolean)) {
    showMessages(
      "reviews-message",
      ["Weekly review requires a week start date and at least one prompt field."],
      "bad"
    );
    return;
  }

  state.reviews.weekly[period] = { ...prompts, updatedAt: new Date().toISOString() };
  persistState(state);
  showMessages("reviews-message", ["Weekly review saved."], "good");
  renderReviewsList(state);
}

/**
 * Persists structured monthly review prompts for high-signal trend snapshots.
 */
function saveMonthlyReview() {
  const period = document.getElementById("monthly-period").value;

  // Keep prompt schema aligned with weekly review for predictable rendering logic.
  const prompts = {
    wins: document.getElementById("monthly-wins").value.trim(),
    blockers: document.getElementById("monthly-blockers").value.trim(),
    nextAction: document.getElementById("monthly-next-action").value.trim(),
    confidence: document.getElementById("monthly-confidence").value.trim(),
  };

  if (!period || !Object.values(prompts).some(Boolean)) {
    showMessages(
      "reviews-message",
      ["Monthly review requires a month date and at least one prompt field."],
      "bad"
    );
    return;
  }

  state.reviews.monthly[period] = { ...prompts, updatedAt: new Date().toISOString() };
  persistState(state);
  showMessages("reviews-message", ["Monthly review saved."], "good");
  renderReviewsList(state);
}

/**
 * Applies setting toggles and refreshes affected UI views.
 */
function onSettingsChange() {
  state.settings.compactCards = document.getElementById("setting-compact").checked;
  state.settings.enableAnimations = document.getElementById("setting-animations").checked;
  state.settings.showTips = document.getElementById("setting-showtips").checked;
  persistState(state);
  refreshAllViews();
  showMessages("settings-message", ["Settings updated."], "good");
}

/**
 * Hard reset to a new account profile while preserving date defaults.
 */
function resetAccount() {
  const fresh = getDefaultState();
  state.entries = fresh.entries;
  state.reviews = fresh.reviews;
  state.acceptedQuests = fresh.acceptedQuests;
  state.settings = fresh.settings;
  persistState(state);

  document.getElementById("entry-form").reset();
  // Clear all review prompt fields to ensure a clean slate after account reset.
  [
    "weekly-wins",
    "weekly-blockers",
    "weekly-next-action",
    "weekly-confidence",
    "monthly-wins",
    "monthly-blockers",
    "monthly-next-action",
    "monthly-confidence",
  ].forEach((id) => {
    document.getElementById(id).value = "";
  });
  initializeFormDefaults();
  hydrateSettings(state);
  refreshAllViews();
  showMessages("settings-message", ["Account reset complete. You are back at a fresh start."], "warn");
}

/**
 * Re-renders all views that depend on persisted state.
 */
function refreshAllViews() {
  renderDashboard(state);
  renderQuestLog(state);
  renderReviewsList(state);
}

init();
