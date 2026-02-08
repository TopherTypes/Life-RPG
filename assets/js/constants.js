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
  REST_DAY_MIN_STREAK: 3,
  REST_DAY_WINDOW_DAYS: 7,
  REST_DAY_MAX_USES_PER_WINDOW: 1,
  SOFT_PENALTY_PER_MISSED_DAY: 0.02,
  SOFT_PENALTY_MAX_RATE: 0.25,
  RECOVERY_TRIGGER_STREAK: 3,
  RECOVERY_STEP_RATE: 0.01,
  RECOVERY_MAX_RATE: 0.08,
};
