import { ACTIVITY_MULTIPLIERS, CALORIE_STRATEGY_BANDS } from "./constants.js";

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
 * Computes an individualized healthy calorie guidance range for a strategy.
 *
 * @param {object} profile - User profile used for TDEE estimation.
 * @param {"maintain"|"cut"|"gain"} [strategy="maintain"] - Goal profile.
 * @returns {{ min: number, max: number } | null}
 */
export function computeHealthyCalorieRange(profile = {}, strategy = "maintain") {
  const tdee = computeTdee(profile);
  if (!Number.isFinite(tdee)) return null;

  const band = CALORIE_STRATEGY_BANDS[strategy] || CALORIE_STRATEGY_BANDS.maintain;
  return {
    min: Math.round(tdee * band.minRatio),
    max: Math.round(tdee * band.maxRatio),
  };
}
