import { ACTIVITY_MULTIPLIERS, CALORIE_STRATEGY_BANDS } from "./constants.js";

const DYNAMIC_TDEE_WINDOW_DAYS = 14;
const DYNAMIC_TDEE_MAX_DELTA_RATIO = 0.12;
const DYNAMIC_TDEE_SMOOTHING_ALPHA = 0.6;

/**
 * Determines whether all required profile fields exist for BMR/TDEE math.
 */
export function isProfileComplete(profile = {}) {
  return Number.isFinite(profile.age)
    && Number.isFinite(profile.heightCm)
    && Number.isFinite(profile.weightKg)
    && typeof profile.gender === "string"
    && typeof profile.activityLevel === "string";
}

/**
 * Computes BMR using the Mifflin-St Jeor equation.
 *
 * Formula rationale:
 * - Widely adopted in nutrition coaching tools.
 * - Practical accuracy for general populations.
 * - Requires only age, height, weight, and sex-marker constant.
 */
export function computeBmr(profile = {}) {
  if (!isProfileComplete(profile)) return null;

  const { age, heightCm, weightKg, gender } = profile;
  const genderConstant = gender === "female" ? -161 : 5;
  return (10 * weightKg) + (6.25 * heightCm) - (5 * age) + genderConstant;
}

/**
 * Computes estimated TDEE from BMR and activity multiplier.
 */
export function computeTdee(profile = {}) {
  const bmr = computeBmr(profile);
  if (bmr === null) return null;

  const multiplier = ACTIVITY_MULTIPLIERS[profile.activityLevel];
  if (!Number.isFinite(multiplier)) return null;

  return Math.round(bmr * multiplier);
}

/**
 * Computes a strategy calorie range from a caller-provided TDEE anchor.
 *
 * This helper avoids mutating profile shape when callers want to evaluate
 * alternative TDEE anchors (for example adaptive behavior mechanics).
 *
 * @param {number | null} tdee - TDEE anchor to convert into strategy ranges.
 * @param {"maintain"|"cut"|"gain"} [strategy="maintain"] - Goal profile.
 * @returns {{ min: number, max: number } | null}
 */
export function computeHealthyCalorieRangeFromTdee(tdee, strategy = "maintain") {
  if (!Number.isFinite(tdee)) return null;

  const band = CALORIE_STRATEGY_BANDS[strategy] || CALORIE_STRATEGY_BANDS.maintain;
  return {
    min: Math.round(tdee * band.minRatio),
    max: Math.round(tdee * band.maxRatio),
  };
}

/**
 * Computes an adaptive TDEE estimate from baseline profile TDEE + recent signals.
 *
 * Formula overview (guardrailed by design):
 * 1) Start from baseline profile TDEE (Mifflin + activity multiplier).
 * 2) Derive a recent-load adjustment from exercise volume/intensity + steps.
 * 3) Derive an intake-trend adjustment from average calorie drift vs baseline.
 * 4) Penalize noisy intake variance so unstable logs do not over-shift targets.
 * 5) Clamp total delta to ±12%, then smooth with a 60/40 weighted blend where
 *    baseline remains dominant to avoid day-to-day whiplash.
 *
 * @param {object} profile - User profile used for baseline TDEE.
 * @param {Array<object>} entries - Ordered or unordered daily entries.
 * @returns {{ baselineTdee: number | null, dynamicTdee: number | null, delta: number, deltaRatio: number, interpretation: string }}
 */
export function computeDynamicTdee(profile = {}, entries = []) {
  const baselineTdee = computeTdee(profile);
  if (!Number.isFinite(baselineTdee)) {
    return {
      baselineTdee: null,
      dynamicTdee: null,
      delta: 0,
      deltaRatio: 0,
      interpretation: "Complete all profile fields to calculate baseline and adaptive TDEE.",
    };
  }

  const orderedEntries = Array.isArray(entries)
    ? [...entries]
      .filter((entry) => entry && typeof entry.date === "string")
      .sort((a, b) => a.date.localeCompare(b.date))
    : [];
  const windowEntries = orderedEntries.slice(-DYNAMIC_TDEE_WINDOW_DAYS);

  const avgExerciseMinutes = safeAverage(windowEntries.map((entry) => entry.exerciseMinutes));
  const avgExerciseEffort = safeAverage(windowEntries.map((entry) => entry.exerciseEffort));
  const avgSteps = safeAverage(windowEntries.map((entry) => entry.steps));

  const calorieValues = windowEntries
    .map((entry) => entry.calories)
    .filter((value) => Number.isFinite(value));
  const calorieRatios = calorieValues.map((value) => (value - baselineTdee) / baselineTdee);

  const activityLoadRatio = averageFinite([
    avgExerciseMinutes / 45,
    avgExerciseEffort / 6,
    avgSteps / 8000,
  ], 1);
  const activityDeltaRatio = clamp((activityLoadRatio - 1) * 0.08, -0.06, 0.1);
  const intakeDeltaRatio = clamp(safeAverage(calorieRatios) * 0.35, -0.08, 0.08);

  const intakeVarianceRatio = Math.min(0.05, computeStandardDeviation(calorieRatios) * 0.25);
  const rawDeltaRatio = activityDeltaRatio + intakeDeltaRatio;
  const varianceDampenedDeltaRatio = Math.sign(rawDeltaRatio)
    * Math.max(0, Math.abs(rawDeltaRatio) - intakeVarianceRatio);
  const cappedDeltaRatio = clamp(
    varianceDampenedDeltaRatio,
    -DYNAMIC_TDEE_MAX_DELTA_RATIO,
    DYNAMIC_TDEE_MAX_DELTA_RATIO,
  );
  const smoothDeltaRatio = cappedDeltaRatio * DYNAMIC_TDEE_SMOOTHING_ALPHA;
  const dynamicTdee = Math.round(baselineTdee * (1 + smoothDeltaRatio));
  const delta = dynamicTdee - baselineTdee;

  return {
    baselineTdee,
    dynamicTdee,
    delta,
    deltaRatio: smoothDeltaRatio,
    interpretation: describeTdeeDelta(smoothDeltaRatio),
  };
}

/**
 * Computes an individualized healthy calorie guidance range for a strategy.
 *
 * @param {object} profile - User profile used for TDEE estimation.
 * @param {"maintain"|"cut"|"gain"} [strategy="maintain"] - Goal profile.
 * @returns {{ min: number, max: number } | null}
 */
export function computeHealthyCalorieRange(profile = {}, strategy = "maintain") {
  return computeHealthyCalorieRangeFromTdee(computeTdee(profile), strategy);
}

function safeAverage(values = []) {
  const finite = values.filter((value) => Number.isFinite(value));
  if (!finite.length) return 0;
  return finite.reduce((sum, value) => sum + value, 0) / finite.length;
}

function averageFinite(values = [], fallback = 0) {
  const finite = values.filter((value) => Number.isFinite(value));
  if (!finite.length) return fallback;
  return finite.reduce((sum, value) => sum + value, 0) / finite.length;
}

function computeStandardDeviation(values = []) {
  if (values.length < 2) return 0;
  const mean = safeAverage(values);
  const variance = safeAverage(values.map((value) => (value - mean) ** 2));
  return Math.sqrt(variance);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function describeTdeeDelta(deltaRatio) {
  if (Math.abs(deltaRatio) < 0.01) return "Dynamic TDEE is stable and aligned with your baseline profile estimate.";
  if (deltaRatio > 0) return "Dynamic TDEE is slightly elevated from recent activity and intake trends.";
  return "Dynamic TDEE is slightly reduced based on recent recovery and intake trends.";
}
