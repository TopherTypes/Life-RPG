/**
 * Local-first analytics module.
 *
 * Goals:
 * - Keep event collection fully client-side (no network transport).
 * - Provide a single typed event entrypoint for consistency.
 * - Keep payloads privacy-safe by design (category/metadata only).
 */

const ANALYTICS_SCHEMA_VERSION = 1;
const ANALYTICS_STORAGE_KEY = "liferpg.analytics.v1";

/**
 * Event catalog used as a runtime source-of-truth for payload contracts.
 *
 * NOTE: This is a JSDoc-typed catalog (runtime object + typedefs) so plain JS
 * still gets strong editor hints and contract enforcement in one place.
 */
export const ANALYTICS_EVENTS = {
  DAILY_SUBMIT_SUCCESS: "daily_submit_success",
  DAILY_SUBMIT_FAIL: "daily_submit_fail",
  REVIEW_SAVED: "review_saved",
  REVIEW_EDITED: "review_edited",
  REVIEW_DELETED: "review_deleted",
  QUEST_ACCEPTED: "quest_accepted",
  TAB_SWITCHED: "tab_switched",
};

/**
 * @typedef {Object} DailySubmitSuccessPayload
 * @property {string} date - Entry date (YYYY-MM-DD).
 * @property {boolean} isEdit - True when updating an existing entry.
 * @property {number} hardErrorCount - Should be 0 on success (guard rail).
 * @property {number} anomalyCount - Number of soft-anomaly flags.
 */

/**
 * @typedef {Object} DailySubmitFailPayload
 * @property {string|null} date - Entry date if available.
 * @property {("missing_date"|"read_only"|"hard_validation")} category - Validation/error class.
 * @property {number} hardErrorCount - Hard error message count.
 * @property {string[]} fieldIds - Field ids with inline errors.
 */

/**
 * @typedef {Object} ReviewSavedPayload
 * @property {("weekly"|"monthly")} reviewType - Review bucket.
 * @property {string} period - Period key (YYYY-MM-DD).
 * @property {boolean} hadExisting - True when replacing an existing record.
 * @property {number} promptCount - Number of non-empty prompt fields.
 */

/**
 * @typedef {Object} ReviewEditedPayload
 * @property {("weekly"|"monthly")} reviewType - Review bucket.
 * @property {string} period - Period key loaded for edit.
 */

/**
 * @typedef {Object} ReviewDeletedPayload
 * @property {("weekly"|"monthly")} reviewType - Review bucket.
 * @property {string} period - Deleted period key.
 */

/**
 * @typedef {Object} QuestAcceptedPayload
 * @property {string} questId - Internal quest key.
 * @property {string} questLabel - User-facing quest title.
 */

/**
 * @typedef {Object} TabSwitchedPayload
 * @property {string} tabId - Activated tab id.
 * @property {("hero-cta"|"nav-tab")} triggerType - Interaction source.
 */

/**
 * @typedef {
 *   DailySubmitSuccessPayload |
 *   DailySubmitFailPayload |
 *   ReviewSavedPayload |
 *   ReviewEditedPayload |
 *   ReviewDeletedPayload |
 *   QuestAcceptedPayload |
 *   TabSwitchedPayload
 * } AnalyticsPayload
 */

/**
 * @typedef {Object} AnalyticsEventRecord
 * @property {number} schemaVersion - Event schema version for migrations.
 * @property {string} eventName - Name from ANALYTICS_EVENTS.
 * @property {string} timestamp - ISO timestamp in UTC.
 * @property {AnalyticsPayload} payload - Event-specific payload contract.
 */

/**
 * Lightweight in-memory mirror to avoid repeated JSON parse cost.
 * Source of truth is still localStorage and this cache is rehydrated lazily.
 * @type {AnalyticsEventRecord[] | null}
 */
let analyticsCache = null;

/**
 * Loads the analytics log from localStorage with defensive fallback.
 * @returns {AnalyticsEventRecord[]}
 */
function loadAnalyticsLog() {
  if (analyticsCache) return analyticsCache;

  try {
    const raw = localStorage.getItem(ANALYTICS_STORAGE_KEY);
    if (!raw) {
      analyticsCache = [];
      return analyticsCache;
    }

    const parsed = JSON.parse(raw);
    analyticsCache = Array.isArray(parsed) ? parsed : [];
    return analyticsCache;
  } catch {
    analyticsCache = [];
    return analyticsCache;
  }
}

/**
 * Persists the full analytics log snapshot.
 * @param {AnalyticsEventRecord[]} records
 */
function persistAnalyticsLog(records) {
  analyticsCache = records;
  localStorage.setItem(ANALYTICS_STORAGE_KEY, JSON.stringify(records));
}

/**
 * Appends a typed analytics event to the local event log.
 *
 * IMPORTANT:
 * - Do not include raw free-form journal text or highly sensitive values.
 * - Prefer categories, counts, booleans, and identifiers.
 *
 * @param {string} eventName
 * @param {AnalyticsPayload} payload
 * @returns {AnalyticsEventRecord}
 */
export function track(eventName, payload) {
  if (!Object.values(ANALYTICS_EVENTS).includes(eventName)) {
    throw new Error(`Unknown analytics event: ${eventName}`);
  }

  const next = {
    schemaVersion: ANALYTICS_SCHEMA_VERSION,
    eventName,
    timestamp: new Date().toISOString(),
    payload,
  };

  const records = loadAnalyticsLog();
  records.push(next);
  persistAnalyticsLog(records);
  return next;
}

/**
 * Returns a copy of all stored events for diagnostics and QA.
 * @returns {AnalyticsEventRecord[]}
 */
export function getTrackedEvents() {
  return [...loadAnalyticsLog()];
}

/**
 * Clears analytics history for clean-slate manual QA sessions.
 */
export function clearTrackedEvents() {
  persistAnalyticsLog([]);
}

/**
 * Exports analytics as prettified JSON text for manual inspection/debugging.
 * @returns {string}
 */
export function exportTrackedEventsJson() {
  return JSON.stringify(loadAnalyticsLog(), null, 2);
}

/**
 * Convenience helper for browser-console QA.
 * Usage: window.lifeRpgAnalytics.exportToConsole()
 */
export function registerAnalyticsDebugApi() {
  if (typeof window === "undefined") return;

  window.lifeRpgAnalytics = {
    export: getTrackedEvents,
    exportJson: exportTrackedEventsJson,
    clear: clearTrackedEvents,
    exportToConsole() {
      // Console table speeds up exploratory QA when scanning many events.
      console.table(getTrackedEvents());
    },
  };
}
