/**
 * Central key used to persist the entire MVP state in LocalStorage.
 * A single persisted object reduces migration complexity later.
 */
export const STORAGE_KEY = "liferpg.m1.vslice";

/**
 * MVP quest templates using simple counter-based progression.
 */
export const QUESTS = {
  dailyLog30: { label: "Complete 30 daily logs", type: "long", target: 30 },
  exercise10: { label: "Complete 10 exercise sessions", type: "long", target: 10 },
  weekly7: { label: "Log all 7 days this week", type: "weekly", target: 7 },
};

/**
 * Attribute -> skill mapping used to aggregate attribute XP.
 */
export const ATTRIBUTE_SKILLS = {
  Body: ["Strength", "Flexibility", "Energy"],
  Mind: ["Learning", "Organisation", "Creativity"],
  Soul: ["Mindfulness", "Emotional Balance", "Connection"],
};

/**
 * Field names for MVP daily form inputs.
 */
export const DAILY_FIELDS = [
  "calories",
  "sleepHours",
  "mood",
  "steps",
  "exerciseMinutes",
  "exerciseEffort",
];

/**
 * First-pass behavior mechanics tuning constants.
 *
 * These values are intentionally conservative for MVP Plus so we can encourage
 * consistency without harsh punishment while collecting usage feedback.
 */
export const BEHAVIOR_CONFIG = {
  // Missing-day friction stays intentionally mild (2% per day) so users can recover quickly.
  REST_DAY_MIN_STREAK: 3,
  REST_DAY_WINDOW_DAYS: 7,
  REST_DAY_MAX_USES_PER_WINDOW: 1,
  SOFT_PENALTY_PER_MISSED_DAY: 0.02,
  // Cap protects players from feeling "XP locked" after rough weeks.
  SOFT_PENALTY_MAX_RATE: 0.25,
  // Combined cap ensures stacked penalties (missed days + calorie adherence) never exceed 30%.
  TOTAL_PENALTY_MAX_RATE: 0.3,

  // Personalized calorie adherence checks recent consistency over a one-week rolling window.
  CALORIE_LOOKBACK_DAYS: 7,
  // 1.5% penalty per off-range day keeps this signal lighter than missed-day gaps.
  CALORIE_PENALTY_PER_DEVIATION_DAY: 0.015,
  // Calorie-driven penalty is independently capped to avoid overpowering core streak mechanics.
  CALORIE_PENALTY_MAX_RATE: 0.12,

  RECOVERY_TRIGGER_STREAK: 3,
  RECOVERY_STEP_RATE: 0.01,
  RECOVERY_MAX_RATE: 0.08,
  // Adherence recovery starts after 3 in-range calorie days and grows gradually.
  CALORIE_RECOVERY_TRIGGER_STREAK: 3,
  CALORIE_RECOVERY_STEP_RATE: 0.005,
  CALORIE_RECOVERY_MAX_RATE: 0.03,
};

/**
 * Activity multipliers used in TDEE estimation.
 *
 * Values follow common coaching ranges and are rounded to stable constants so
 * profile-based calorie feedback remains deterministic across sessions.
 */
export const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

/**
 * Personalized calorie guidance strategies.
 *
 * Ratios are intentionally conservative for wellness contexts:
 * - "maintain" reflects a broad healthy maintenance zone around TDEE.
 * - "cut" and "gain" shift the target window by ~10–15% to avoid extremes.
 */
export const CALORIE_STRATEGY_BANDS = {
  maintain: { minRatio: 0.9, maxRatio: 1.1 },
  cut: { minRatio: 0.8, maxRatio: 0.95 },
  gain: { minRatio: 1.05, maxRatio: 1.2 },
};

/**
 * Static anomaly fallback for calorie soft warnings when profile inputs are incomplete.
 */
export const CALORIE_STATIC_OUTLIER = {
  min: 800,
  max: 8000,
};

/**
 * Friendly labels for daily metrics used in onboarding and settings summaries.
 */
export const DAILY_FIELD_LABELS = {
  calories: "Calories In",
  sleepHours: "Sleep Hours",
  mood: "Mood",
  steps: "Steps",
  exerciseMinutes: "Exercise Minutes",
  exerciseEffort: "Exercise Effort",
};

/**
 * Supported profile unit preferences per account.
 */
export const UNIT_OPTIONS = {
  height: ["cm", "ft_in"],
  weight: ["kg", "lb", "st_lb"],
};
