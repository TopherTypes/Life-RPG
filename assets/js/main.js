import { loadState, persistState } from "./storage.js";
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
} from "./ui.js";

const state = loadState();

/**
 * Initializes app startup defaults and wires all UI handlers.
 */
function init() {
  setupTabs();
  initializeFormDefaults();
  renderDashboard(state);
  renderReviewsList(state);

  document.getElementById("entry-date").addEventListener("change", () => hydrateFormForDate(state));
  document.getElementById("entry-form").addEventListener("submit", onEntrySubmit);
  document.getElementById("save-weekly").addEventListener("click", saveWeeklyReview);
  document.getElementById("save-monthly").addEventListener("click", saveMonthlyReview);
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

  if (!entry.date) {
    showMessages("entry-messages", ["Date is required."], "bad");
    return;
  }

  const existing = state.entries[entry.date];
  if (existing && !isEditable(entry.date)) {
    showMessages("entry-messages", ["This entry is read-only. Edit window (24h after day end) has expired."], "bad");
    return;
  }

  const validation = validateEntry(entry);
  if (validation.hardErrors.length) {
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
  renderDashboard(state);
}

/**
 * Persists weekly review text.
 */
function saveWeeklyReview() {
  const period = document.getElementById("weekly-period").value;
  const text = document.getElementById("weekly-review").value.trim();

  if (!period || !text) {
    showMessages("reviews-message", ["Weekly review requires a week start date and text."], "bad");
    return;
  }

  state.reviews.weekly[period] = { text, updatedAt: new Date().toISOString() };
  persistState(state);
  showMessages("reviews-message", ["Weekly review saved."], "good");
  renderReviewsList(state);
}

/**
 * Persists monthly review text.
 */
function saveMonthlyReview() {
  const period = document.getElementById("monthly-period").value;
  const text = document.getElementById("monthly-review").value.trim();

  if (!period || !text) {
    showMessages("reviews-message", ["Monthly review requires a month date and text."], "bad");
    return;
  }

  state.reviews.monthly[period] = { text, updatedAt: new Date().toISOString() };
  persistState(state);
  showMessages("reviews-message", ["Monthly review saved."], "good");
  renderReviewsList(state);
}

init();
