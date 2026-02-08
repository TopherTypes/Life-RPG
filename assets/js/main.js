import { loadState, persistState, getDefaultState } from "./storage.js";
import { QUESTS } from "./constants.js";
import {
  ANALYTICS_EVENTS,
  clearTrackedEvents,
  exportTrackedEventsJson,
  registerAnalyticsDebugApi,
  track,
} from "./analytics.js";
import { todayISO } from "./utils.js";
import { isEditable, validateEntry } from "./validation.js";
import { computeTdee } from "./profile-metrics.js";
import {
  setupTabs,
  hydrateFormForDate,
  readEntryFromForm,
  readProfileFromForm,
  renderDashboard,
  renderRecap,
  renderReviewsList,
  showMessages,
  renderQuestLog,
  hydrateSettings,
  hydrateProfile,
  setupRecapModalControls,
  clearEntryFieldErrors,
  showEntryFieldErrors,
  clearProfileFieldErrors,
  showProfileFieldErrors,
} from "./ui.js";

const state = loadState();

/**
 * Formats a Date object to YYYY-MM-DD using local calendar components.
 */
function formatLocalDateISO(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Initializes app startup defaults and wires all UI handlers.
 */
function init() {
  setupTabs(onTabSwitched);
  setupRecapModalControls();
  initializeFormDefaults();
  bindEvents();
  hydrateSettings(state);
  hydrateProfile(state);
  registerAnalyticsDebugApi();
  refreshAnalyticsDiagnostics();
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
  document.getElementById("reviews-list").addEventListener("click", onReviewsListClick);

  document.getElementById("quest-log-content").addEventListener("click", (event) => {
    const button = event.target.closest(".quest-accept-btn");
    if (!button) return;
    const questId = button.dataset.questId;
    state.acceptedQuests[questId] = true;
    persistState(state);


    // Event intent: funnel step showing quest opt-in engagement.
    track(ANALYTICS_EVENTS.QUEST_ACCEPTED, {
      questId,
      questLabel: QUESTS[questId]?.label || "unknown",
    });

    refreshAllViews();
    showMessages("entry-messages", ["Quest accepted and now tracking progress."], "good");
  });

  document.getElementById("setting-compact").addEventListener("change", onSettingsChange);
  document.getElementById("setting-animations").addEventListener("change", onSettingsChange);
  document.getElementById("setting-showtips").addEventListener("change", onSettingsChange);
  document.getElementById("reset-account").addEventListener("click", resetAccount);

  // Profile listeners persist personalization inputs used for calorie guidance and TDEE estimation.
  document.getElementById("save-profile").addEventListener("click", saveProfile);
  ["profile-age", "profile-gender", "profile-height", "profile-weight", "profile-activity"].forEach((fieldId) => {
    const input = document.getElementById(fieldId);
    input.addEventListener("change", saveProfile);
    input.addEventListener("input", () => {
      const errorSlot = document.getElementById(`${fieldId}-error`);
      input.classList.remove("input-invalid");
      input.removeAttribute("aria-invalid");
      if (errorSlot) errorSlot.textContent = "";
    });
  });

  // Diagnostics controls support manual QA of local-only analytics signals.
  document.getElementById("analytics-refresh").addEventListener("click", refreshAnalyticsDiagnostics);
  document.getElementById("analytics-copy").addEventListener("click", copyAnalyticsDiagnostics);
  document.getElementById("analytics-clear").addEventListener("click", clearAnalyticsDiagnostics);
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

    // Event intent: detect drop-off caused by missing required date context.
    track(ANALYTICS_EVENTS.DAILY_SUBMIT_FAIL, {
      date: null,
      category: "missing_date",
      hardErrorCount: 1,
      fieldIds: ["entry-date"],
    });
    return;
  }

  const existing = state.entries[entry.date];
  if (existing && !isEditable(entry.date)) {
    showEntryFieldErrors({ "entry-date": ["This entry is read-only for edits."] });
    showMessages("entry-messages", ["This entry is read-only. Edit window (24h after day end) has expired."], "bad");

    // Event intent: monitor policy-related submit failures.
    track(ANALYTICS_EVENTS.DAILY_SUBMIT_FAIL, {
      date: entry.date,
      category: "read_only",
      hardErrorCount: 1,
      fieldIds: ["entry-date"],
    });
    return;
  }

  const validation = validateEntry(entry, state.profile);
  if (validation.hardErrors.length) {
    showEntryFieldErrors(validation.fieldErrors);
    showMessages("entry-messages", validation.hardErrors, "bad");

    // Event intent: categorize and count validation friction points.
    track(ANALYTICS_EVENTS.DAILY_SUBMIT_FAIL, {
      date: entry.date,
      category: "hard_validation",
      hardErrorCount: validation.hardErrors.length,
      fieldIds: Object.keys(validation.fieldErrors || {}),
    });
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

  // Event intent: successful daily completion funnel checkpoint.
  track(ANALYTICS_EVENTS.DAILY_SUBMIT_SUCCESS, {
    date: entry.date,
    isEdit: Boolean(existing),
    hardErrorCount: 0,
    anomalyCount: validation.anomalies.length,
  });

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

  // Use a single normalized key to avoid accidental duplicate records caused by timezone/browser parsing differences.
  const normalizedPeriod = formatLocalDateISO(new Date(period));
  state.reviews.weekly[normalizedPeriod] = { ...prompts, updatedAt: new Date().toISOString() };
  persistState(state);
  showMessages("reviews-message", [`Weekly review saved for ${normalizedPeriod}.`], "good");
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

  // Normalize persisted key format so monthly review lookups are consistent across all browsers.
  const normalizedPeriod = formatLocalDateISO(new Date(period));
  state.reviews.monthly[normalizedPeriod] = { ...prompts, updatedAt: new Date().toISOString() };
  persistState(state);
  showMessages("reviews-message", [`Monthly review saved for ${normalizedPeriod}.`], "good");
  renderReviewsList(state);
}

/**
 * Handles delegated review action clicks (edit/delete) for both weekly and monthly items.
 */
function onReviewsListClick(event) {
  const actionButton = event.target.closest("[data-review-action]");
  if (!actionButton) return;

  const { reviewAction, reviewType, reviewPeriod } = actionButton.dataset;
  if (!reviewAction || !reviewType || !reviewPeriod) return;

  if (reviewAction === "edit") {
    preloadReviewForEdit(reviewType, reviewPeriod);
    return;
  }

  if (reviewAction === "delete") {
    deleteReview(reviewType, reviewPeriod);
  }
}

/**
 * Loads an existing review into the relevant form inputs to support in-place editing.
 */
function preloadReviewForEdit(type, period) {
  const review = state.reviews[type]?.[period];
  if (!review) {
    showMessages("reviews-message", ["Selected review no longer exists."], "bad");
    return;
  }

  // Normalize persisted review data so edit prefill works across both schemas:
  // 1) New structured prompt fields (`wins`, `blockers`, `nextAction`, `confidence`).
  // 2) Legacy records that only stored a single `text` blob.
  const legacyText = typeof review.text === "string" ? review.text.trim() : "";
  const structuredFields = {
    wins: typeof review.wins === "string" ? review.wins.trim() : "",
    blockers: typeof review.blockers === "string" ? review.blockers.trim() : "",
    nextAction: typeof review.nextAction === "string" ? review.nextAction.trim() : "",
    confidence: typeof review.confidence === "string" ? review.confidence.trim() : "",
  };

  // Legacy migration fallback: if structured fields are empty but `text` exists,
  // seed it into `wins` so users can split it into prompt fields before saving.
  const hasStructuredValue = Object.values(structuredFields).some(Boolean);
  if (!hasStructuredValue && legacyText) {
    structuredFields.wins = legacyText;
  }

  if (type === "weekly") {
    document.getElementById("weekly-period").value = period;
    document.getElementById("weekly-wins").value = structuredFields.wins;
    document.getElementById("weekly-blockers").value = structuredFields.blockers;
    document.getElementById("weekly-next-action").value = structuredFields.nextAction;
    document.getElementById("weekly-confidence").value = structuredFields.confidence;
  } else {
    document.getElementById("monthly-period").value = period;
    document.getElementById("monthly-wins").value = structuredFields.wins;
    document.getElementById("monthly-blockers").value = structuredFields.blockers;
    document.getElementById("monthly-next-action").value = structuredFields.nextAction;
    document.getElementById("monthly-confidence").value = structuredFields.confidence;
  }

  // Event intent: measure edit intent rate before save.
  track(ANALYTICS_EVENTS.REVIEW_EDITED, {
    reviewType: type,
    period,
  });

  renderReviewsList(state);
  const migrationHint =
    !hasStructuredValue && legacyText
      ? " Legacy note detected: it was placed in Wins—split it across Blockers, Next Action, and Confidence before saving."
      : "";

  showMessages(
    "reviews-message",
    [
      `Loaded ${type} review for ${period}. Update the structured prompts (Wins, Blockers, Next Action, Confidence) and click Save.${migrationHint}`,
    ],
    "good"
  );
}

/**
 * Deletes a review entry, persists state, and refreshes the list and feedback message.
 */
function deleteReview(type, period) {
  if (!state.reviews[type]?.[period]) {
    showMessages("reviews-message", ["Selected review no longer exists."], "bad");
    return;
  }

  delete state.reviews[type][period];
  persistState(state);

  // Event intent: detect churn/cleanup behavior in review history.
  track(ANALYTICS_EVENTS.REVIEW_DELETED, {
    reviewType: type,
    period,
  });
  renderReviewsList(state);
  showMessages("reviews-message", [`${type[0].toUpperCase() + type.slice(1)} review deleted for ${period}.`], "warn");
}

/**
 * Validates profile data and calculates TDEE when enough fields are provided.
 *
 * This profile payload powers personalized calorie evaluation so recap/dashboard
 * messaging can compare intake trends against an individualized energy baseline.
 */
function saveProfile() {
  const profile = readProfileFromForm();
  const fieldErrors = {};

  const allowedGenders = new Set(["male", "female", "nonbinary", "prefer_not_to_say"]);
  const allowedActivityLevels = new Set(["sedentary", "light", "moderate", "active", "very_active"]);

  const addError = (fieldId, message) => {
    if (!fieldErrors[fieldId]) fieldErrors[fieldId] = [];
    fieldErrors[fieldId].push(message);
  };

  if (profile.age !== null && (profile.age < 10 || profile.age > 120)) {
    addError("profile-age", "Age must be between 10 and 120.");
  }
  if (profile.gender !== null && !allowedGenders.has(profile.gender)) {
    addError("profile-gender", "Select a supported gender option.");
  }
  if (profile.heightCm !== null && (profile.heightCm < 80 || profile.heightCm > 260)) {
    addError("profile-height", "Height must be between 80 and 260 cm.");
  }
  if (profile.weightKg !== null && (profile.weightKg < 20 || profile.weightKg > 400)) {
    addError("profile-weight", "Weight must be between 20 and 400 kg.");
  }
  if (profile.activityLevel !== null && !allowedActivityLevels.has(profile.activityLevel)) {
    addError("profile-activity", "Select a supported activity level.");
  }

  const hasBaseFields = profile.age !== null && profile.heightCm !== null && profile.weightKg !== null;
  const hasTdeeInputs = hasBaseFields && profile.gender !== null && profile.activityLevel !== null;

  if (Object.keys(fieldErrors).length) {
    showProfileFieldErrors(fieldErrors);
    showMessages("settings-message", ["Profile update failed. Fix the highlighted fields and try again."], "bad");
    return;
  }

  clearProfileFieldErrors();

  // Centralized metric utility keeps TDEE calculations deterministic across modules.
  const tdee = hasTdeeInputs ? computeTdee(profile) : null;

  state.profile = {
    ...state.profile,
    ...profile,
    tdee,
    updatedAt: new Date().toISOString(),
  };

  document.getElementById("profile-tdee").value = tdee ?? "";
  persistState(state);
  refreshAllViews();

  const incompleteMessage = hasBaseFields && !hasTdeeInputs
    ? " Add gender and activity level to calculate TDEE."
    : "";
  showMessages(
    "settings-message",
    [
      tdee !== null
        ? `Profile saved. Estimated TDEE: ${tdee} kcal/day.`
        : `Profile saved.${incompleteMessage}`,
    ],
    "good"
  );
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
  // Keep reset behavior aligned with schema evolution by resetting profile too.
  state.profile = fresh.profile;
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
  hydrateProfile(state);
  registerAnalyticsDebugApi();
  refreshAnalyticsDiagnostics();
  refreshAllViews();
  showMessages("settings-message", ["Account reset complete. You are back at a fresh start."], "warn");
}



/**
 * Refreshes diagnostics textarea with current analytics JSON snapshot.
 */
function refreshAnalyticsDiagnostics() {
  const output = document.getElementById("analytics-output");
  if (!output) return;
  output.value = exportTrackedEventsJson();
}

/**
 * Copies analytics JSON to clipboard for easy manual QA sharing.
 */
async function copyAnalyticsDiagnostics() {
  const payload = exportTrackedEventsJson();

  // Clipboard API can fail in some contexts; keep graceful UI feedback.
  try {
    await navigator.clipboard.writeText(payload);
    showMessages("settings-message", ["Analytics JSON copied to clipboard."], "good");
  } catch {
    showMessages("settings-message", ["Clipboard copy failed. Select and copy from the text area manually."], "warn");
  }

  refreshAnalyticsDiagnostics();
}

/**
 * Clears local analytics history to restart QA sessions from a clean baseline.
 */
function clearAnalyticsDiagnostics() {
  clearTrackedEvents();
  refreshAnalyticsDiagnostics();
  showMessages("settings-message", ["Local analytics log cleared."], "warn");
}

/**
 * Captures navigation events used for engagement funnel analysis.
 */
function onTabSwitched({ tabId, triggerType }) {
  track(ANALYTICS_EVENTS.TAB_SWITCHED, {
    tabId,
    triggerType,
  });
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
