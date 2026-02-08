import { DAILY_FIELDS, DAILY_ANALYTICS_META, ANALYTICS_AREA_META, QUESTS } from "./constants.js";
import { computeProgression, computeStreakMetrics } from "./progression.js";
import { computeMetricAverage, computeWeekdayAverages, findHighestLowestWeekday, getMetricWindow } from "./metric-analytics.js";

const DEFAULT_WINDOW_DAYS = 30;

/**
 * Produces chronologically sorted entries with strict schema-safe metric fields.
 * Legacy payloads can contain missing/null/empty-string values; this helper
 * normalizes them so analyzers can stay deterministic.
 */
function getNormalizedOrderedEntries(state) {
  const rawEntries = state?.entries || {};
  return Object.keys(rawEntries)
    .sort((a, b) => a.localeCompare(b))
    .map((dateKey) => {
      const entry = rawEntries[dateKey] || {};
      const normalized = { date: typeof entry.date === "string" ? entry.date : dateKey };

      DAILY_FIELDS.forEach((field) => {
        const rawValue = entry[field];
        if (rawValue === null || rawValue === undefined || rawValue === "") {
          normalized[field] = null;
          return;
        }
        const parsed = Number(rawValue);
        normalized[field] = Number.isFinite(parsed) ? parsed : null;
      });

      return normalized;
    });
}

/**
 * Standardized empty-state metadata used by all domain analyzers.
 */
function buildEmptyState(actualPoints, minPoints, label, windowDays) {
  return {
    isEmpty: actualPoints < minPoints,
    reason: actualPoints
      ? `Not enough ${label.toLowerCase()} data in the last ${windowDays} days.`
      : `No ${label.toLowerCase()} data available yet.`,
    minPoints,
    actualPoints,
    suggestion: `Log at least ${minPoints} data points over ${windowDays} days to unlock deeper insights.`,
  };
}

/**
 * Creates a canonical analysis envelope so UI components can be area-agnostic.
 */
function buildAnalysisEnvelope(areaKey, windowDays, label, minPoints, pointsCount) {
  const areaMeta = ANALYTICS_AREA_META[areaKey] || { label: areaKey, unitLabel: "" };
  return {
    areaKey,
    areaLabel: areaMeta.label,
    windowDays,
    metadata: {
      label,
      unitLabel: areaMeta.unitLabel,
    },
    series: [],
    aggregates: {},
    distributions: {},
    emptyState: buildEmptyState(pointsCount, minPoints, label, windowDays),
  };
}

/**
 * Daily metric analyzer used by overview cards and metric drill-down views.
 */
export function analyzeDailyMetric(state, metricKey, windowDays = DEFAULT_WINDOW_DAYS) {
  const safeWindowDays = Number.isFinite(windowDays) && windowDays > 0 ? Math.floor(windowDays) : DEFAULT_WINDOW_DAYS;
  const metricMeta = DAILY_ANALYTICS_META[metricKey] || {
    label: metricKey,
    unitLabel: "",
    averageDecimals: 1,
    valueDecimals: 1,
  };

  if (!DAILY_FIELDS.includes(metricKey)) {
    const fallback = buildAnalysisEnvelope("daily", safeWindowDays, metricMeta.label, 1, 0);
    fallback.emptyState = {
      isEmpty: true,
      reason: "Unsupported metric requested.",
      minPoints: 1,
      actualPoints: 0,
      suggestion: "Select a supported daily metric.",
    };
    return fallback;
  }

  const orderedEntries = getNormalizedOrderedEntries(state);
  const metricWindow = getMetricWindow(orderedEntries, metricKey, safeWindowDays);
  const windowValues = metricWindow.map((point) => point.value).filter((value) => Number.isFinite(value));
  const entriesWithMetric = orderedEntries.filter((entry) => Number.isFinite(entry[metricKey]));
  const weekdayAverages = computeWeekdayAverages(metricWindow);
  const weekdayExtremes = findHighestLowestWeekday(weekdayAverages);

  const analysis = buildAnalysisEnvelope("daily", safeWindowDays, metricMeta.label, 5, windowValues.length);
  analysis.metadata = {
    ...analysis.metadata,
    ...metricMeta,
    metricKey,
  };
  analysis.series = metricWindow.map((point) => ({ date: point.date, value: point.value }));
  analysis.aggregates = {
    latest: entriesWithMetric.length ? entriesWithMetric[entriesWithMetric.length - 1][metricKey] : null,
    average: computeMetricAverage(metricWindow),
    min: entriesWithMetric.length ? Math.min(...entriesWithMetric.map((entry) => entry[metricKey])) : null,
    max: entriesWithMetric.length ? Math.max(...entriesWithMetric.map((entry) => entry[metricKey])) : null,
    sampleSize: windowValues.length,
    totalLogs: entriesWithMetric.length,
  };
  analysis.distributions = {
    weekdayAverages,
    weekdayExtremes,
  };

  return analysis;
}

/**
 * Behavior analyzer centralizing streak and penalty insight payloads.
 */
export function analyzeBehavior(state, windowDays = DEFAULT_WINDOW_DAYS) {
  const safeWindowDays = Number.isFinite(windowDays) && windowDays > 0 ? Math.floor(windowDays) : DEFAULT_WINDOW_DAYS;
  const progression = computeProgression(state?.entries || {}, state?.acceptedQuests || {}, state?.profile || {});
  const orderedEntries = getNormalizedOrderedEntries(state);
  const recentEntries = orderedEntries.slice(-safeWindowDays);

  const analysis = buildAnalysisEnvelope("behavior", safeWindowDays, "Behavior Mechanics", 1, recentEntries.length);
  analysis.series = recentEntries.map((entry) => ({
    date: entry.date,
    value: entry.calories,
    flags: {
      hasCalories: Number.isFinite(entry.calories),
      hasExercise: Number.isFinite(entry.exerciseMinutes) && entry.exerciseMinutes > 0,
    },
  }));
  analysis.aggregates = {
    currentStreak: computeStreakMetrics(state?.entries || {}).currentStreak,
    longestStreak: computeStreakMetrics(state?.entries || {}).longestStreak,
    missedDayPenaltyRate: progression.behavior?.missedDayPenaltyRate ?? 0,
    caloriePenaltyRate: progression.behavior?.caloriePenaltyRate ?? 0,
    recoveryRate: progression.behavior?.recoveryRate ?? 0,
    calorieRecoveryRate: progression.behavior?.calorieRecoveryRate ?? 0,
    penaltyRate: progression.behavior?.penaltyRate ?? 0,
    restDayEligible: progression.behavior?.restDay?.eligible === true,
    restDayMessage: progression.behavior?.restDay?.message || "No rest-day state available.",
  };
  analysis.distributions = {
    logging: {
      loggedDays: recentEntries.length,
      missingDays: Math.max(0, safeWindowDays - recentEntries.length),
    },
  };

  return analysis;
}

/**
 * Quest analyzer normalizing accepted/progress/completion insights.
 */
export function analyzeQuests(state, windowDays = DEFAULT_WINDOW_DAYS) {
  const safeWindowDays = Number.isFinite(windowDays) && windowDays > 0 ? Math.floor(windowDays) : DEFAULT_WINDOW_DAYS;
  const progression = computeProgression(state?.entries || {}, state?.acceptedQuests || {}, state?.profile || {});
  const questEntries = Object.entries(QUESTS);
  const progressEntries = questEntries.map(([questId, questDef]) => {
    const progress = progression.quests?.[questId] || { current: 0, target: questDef.target, accepted: false };
    const completionRate = progress.target > 0 ? Math.min(1, progress.current / progress.target) : 0;
    return {
      questId,
      label: questDef.label,
      type: questDef.type,
      accepted: progress.accepted,
      current: progress.current,
      target: progress.target,
      completionRate,
    };
  });

  const acceptedCount = progressEntries.filter((quest) => quest.accepted).length;
  const completedCount = progressEntries.filter((quest) => quest.completionRate >= 1).length;

  const analysis = buildAnalysisEnvelope("quests", safeWindowDays, "Quest Progress", 1, questEntries.length);
  analysis.series = progressEntries.map((quest) => ({ label: quest.label, value: quest.current, meta: quest }));
  analysis.aggregates = {
    totalQuests: questEntries.length,
    acceptedCount,
    completedCount,
    acceptanceRate: questEntries.length ? acceptedCount / questEntries.length : 0,
    completionRate: questEntries.length ? completedCount / questEntries.length : 0,
  };
  analysis.distributions = {
    byType: progressEntries.reduce((acc, quest) => {
      acc[quest.type] = acc[quest.type] || { total: 0, accepted: 0, completed: 0 };
      acc[quest.type].total += 1;
      if (quest.accepted) acc[quest.type].accepted += 1;
      if (quest.completionRate >= 1) acc[quest.type].completed += 1;
      return acc;
    }, {}),
  };

  return analysis;
}

/**
 * Reviews analyzer supporting legacy free-text and newer structured review schema.
 */
export function analyzeReviews(state, windowDays = DEFAULT_WINDOW_DAYS) {
  const safeWindowDays = Number.isFinite(windowDays) && windowDays > 0 ? Math.floor(windowDays) : DEFAULT_WINDOW_DAYS;
  const reviews = state?.reviews || {};
  const weeklyEntries = Object.entries(reviews.weekly || {}).sort(([a], [b]) => b.localeCompare(a));
  const monthlyEntries = Object.entries(reviews.monthly || {}).sort(([a], [b]) => b.localeCompare(a));
  const allEntries = [
    ...weeklyEntries.map(([period, payload]) => ({ type: "weekly", period, payload })),
    ...monthlyEntries.map(([period, payload]) => ({ type: "monthly", period, payload })),
  ].sort((a, b) => b.period.localeCompare(a.period));

  const analysis = buildAnalysisEnvelope("reviews", safeWindowDays, "Review Reflections", 1, allEntries.length);
  analysis.series = allEntries.slice(0, safeWindowDays).map((entry) => ({
    label: `${entry.type}:${entry.period}`,
    value: 1,
    meta: {
      type: entry.type,
      period: entry.period,
      hasStructuredFields: ["wins", "blockers", "nextAction", "confidence"].some((key) => typeof entry.payload?.[key] === "string" && entry.payload[key].trim().length > 0),
      hasLegacyText: typeof entry.payload?.text === "string" && entry.payload.text.trim().length > 0,
    },
  }));
  analysis.aggregates = {
    weeklyCount: weeklyEntries.length,
    monthlyCount: monthlyEntries.length,
    totalCount: allEntries.length,
    structuredCount: allEntries.filter((entry) => ["wins", "blockers", "nextAction", "confidence"].some((key) => typeof entry.payload?.[key] === "string" && entry.payload[key].trim().length > 0)).length,
    legacyTextCount: allEntries.filter((entry) => typeof entry.payload?.text === "string" && entry.payload.text.trim().length > 0).length,
  };
  analysis.distributions = {
    byType: {
      weekly: weeklyEntries.length,
      monthly: monthlyEntries.length,
    },
  };

  return analysis;
}
