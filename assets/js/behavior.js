import { BEHAVIOR_CONFIG } from "./constants.js";
import { computeHealthyCalorieRange, isProfileComplete } from "./profile-metrics.js";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Evaluates first-pass behavior mechanics from stored daily entries.
 *
 * @param {string[]} orderedDateKeys - Sorted YYYY-MM-DD keys from persisted entries.
 * @param {Record<string, object>} entriesMap - Full entries keyed by date.
 * @param {object} profile - Optional profile for personalized calorie adherence.
 * @param {Date} [referenceDate=new Date()] - Clock anchor used for rest-day eligibility messaging.
 * @returns {{
 *   totalMissedDays: number,
 *   missedDayPenaltyRate: number,
 *   caloriePenaltyRate: number,
 *   penaltyRate: number,
 *   recoveryRate: number,
 *   calorieRecoveryRate: number,
 *   currentStreak: number,
 *   comebackStreak: number,
 *   calorieAdherence: {
 *     evaluatedDays: number,
 *     deviationDays: number,
 *     inRangeStreak: number,
 *     rangeMin: number | null,
 *     rangeMax: number | null,
 *     enabled: boolean,
 *   },
 *   restDay: {
 *     eligible: boolean,
 *     remainingThisWindow: number,
 *     message: string
 *   }
 * }}
 */
export function evaluateBehaviorMechanics(orderedDateKeys, entriesMap = {}, profile = {}, referenceDate = new Date()) {
  if (!orderedDateKeys.length) {
    return {
      totalMissedDays: 0,
      missedDayPenaltyRate: 0,
      caloriePenaltyRate: 0,
      penaltyRate: 0,
      recoveryRate: 0,
      calorieRecoveryRate: 0,
      currentStreak: 0,
      comebackStreak: 0,
      calorieAdherence: {
        evaluatedDays: 0,
        deviationDays: 0,
        inRangeStreak: 0,
        rangeMin: null,
        rangeMax: null,
        enabled: false,
      },
      restDay: {
        eligible: false,
        remainingThisWindow: BEHAVIOR_CONFIG.REST_DAY_MAX_USES_PER_WINDOW,
        message: "Log a few days first, then a rest day can be treated as intentional recovery.",
      },
    };
  }

  const totalMissedDays = countImplicitMissedDays(orderedDateKeys);
  const currentStreak = countCurrentStreak(orderedDateKeys);
  const comebackStreak = countComebackStreak(orderedDateKeys);

  const missedDayPenaltyRate = Math.min(
    totalMissedDays * BEHAVIOR_CONFIG.SOFT_PENALTY_PER_MISSED_DAY,
    BEHAVIOR_CONFIG.SOFT_PENALTY_MAX_RATE
  );

  const calorieEffect = evaluateCalorieAdherencePenalty(orderedDateKeys, entriesMap, profile);
  const caloriePenaltyRate = calorieEffect.caloriePenaltyRate;
  const calorieRecoveryRate = calorieEffect.calorieRecoveryRate;

  const penaltyRate = Math.min(
    BEHAVIOR_CONFIG.TOTAL_PENALTY_MAX_RATE,
    missedDayPenaltyRate + caloriePenaltyRate
  );

  const streakRecoveryRate = comebackStreak >= BEHAVIOR_CONFIG.RECOVERY_TRIGGER_STREAK
    ? Math.min(
      (comebackStreak - BEHAVIOR_CONFIG.RECOVERY_TRIGGER_STREAK + 1) * BEHAVIOR_CONFIG.RECOVERY_STEP_RATE,
      BEHAVIOR_CONFIG.RECOVERY_MAX_RATE
    )
    : 0;

  const recoveryRate = Math.min(
    BEHAVIOR_CONFIG.RECOVERY_MAX_RATE + BEHAVIOR_CONFIG.CALORIE_RECOVERY_MAX_RATE,
    streakRecoveryRate + calorieRecoveryRate
  );

  const restDay = evaluateRestDayEligibility(orderedDateKeys, currentStreak, referenceDate);

  return {
    totalMissedDays,
    missedDayPenaltyRate,
    caloriePenaltyRate,
    penaltyRate,
    recoveryRate,
    calorieRecoveryRate,
    currentStreak,
    comebackStreak,
    calorieAdherence: calorieEffect.calorieAdherence,
    restDay,
  };
}

/**
 * Deterministically evaluates calorie adherence from recent entries.
 */
export function evaluateCalorieAdherencePenalty(orderedDateKeys, entriesMap = {}, profile = {}) {
  const healthyRange = isProfileComplete(profile) ? computeHealthyCalorieRange(profile, "maintain") : null;
  if (!healthyRange) {
    return {
      caloriePenaltyRate: 0,
      calorieRecoveryRate: 0,
      calorieAdherence: {
        evaluatedDays: 0,
        deviationDays: 0,
        inRangeStreak: 0,
        rangeMin: null,
        rangeMax: null,
        enabled: false,
      },
    };
  }

  const lookbackDays = BEHAVIOR_CONFIG.CALORIE_LOOKBACK_DAYS;
  const recentDateKeys = orderedDateKeys.slice(-lookbackDays);

  let evaluatedDays = 0;
  let deviationDays = 0;

  recentDateKeys.forEach((dateKey) => {
    const calories = entriesMap[dateKey]?.calories;
    if (!Number.isFinite(calories)) return;

    evaluatedDays += 1;
    if (calories < healthyRange.min || calories > healthyRange.max) {
      deviationDays += 1;
    }
  });

  const inRangeStreak = countTrailingInRangeStreak(recentDateKeys, entriesMap, healthyRange);

  const caloriePenaltyRate = Math.min(
    deviationDays * BEHAVIOR_CONFIG.CALORIE_PENALTY_PER_DEVIATION_DAY,
    BEHAVIOR_CONFIG.CALORIE_PENALTY_MAX_RATE
  );

  const calorieRecoveryRate = inRangeStreak >= BEHAVIOR_CONFIG.CALORIE_RECOVERY_TRIGGER_STREAK
    ? Math.min(
      (inRangeStreak - BEHAVIOR_CONFIG.CALORIE_RECOVERY_TRIGGER_STREAK + 1)
        * BEHAVIOR_CONFIG.CALORIE_RECOVERY_STEP_RATE,
      BEHAVIOR_CONFIG.CALORIE_RECOVERY_MAX_RATE
    )
    : 0;

  return {
    caloriePenaltyRate,
    calorieRecoveryRate,
    calorieAdherence: {
      evaluatedDays,
      deviationDays,
      inRangeStreak,
      rangeMin: healthyRange.min,
      rangeMax: healthyRange.max,
      enabled: true,
    },
  };
}

/**
 * Converts behavior rates into deterministic progression XP adjustments.
 *
 * @param {number} baseOverallXp - Raw XP before behavior modifiers.
 * @param {number} penaltyRate - Soft penalty scalar between 0 and 1.
 * @param {number} recoveryRate - Recovery bonus scalar between 0 and 1.
 * @returns {{penaltyXp: number, recoveryXp: number, adjustedOverallXp: number}}
 */
export function applyBehaviorXpAdjustments(baseOverallXp, penaltyRate, recoveryRate) {
  const penaltyXp = Math.round(baseOverallXp * penaltyRate);
  const recoveryXp = Math.round(baseOverallXp * recoveryRate);
  const adjustedOverallXp = Math.max(0, baseOverallXp - penaltyXp + recoveryXp);
  return { penaltyXp, recoveryXp, adjustedOverallXp };
}

/**
 * Counts non-logged days between first and latest stored entries.
 *
 * Gap handling is calendar-based: if two dates are 3 days apart, that contributes
 * 2 implicit missed days. Same-day duplicates are impossible in date-keyed storage.
 */
function countImplicitMissedDays(orderedDateKeys) {
  let total = 0;
  for (let index = 1; index < orderedDateKeys.length; index += 1) {
    const previous = parseIsoDay(orderedDateKeys[index - 1]);
    const current = parseIsoDay(orderedDateKeys[index]);
    const dayGap = Math.round((current - previous) / DAY_MS);
    if (dayGap > 1) total += dayGap - 1;
  }
  return total;
}

/**
 * Counts latest contiguous logging streak from the newest date backward.
 */
function countCurrentStreak(orderedDateKeys) {
  let streak = 1;
  for (let index = orderedDateKeys.length - 1; index > 0; index -= 1) {
    const current = parseIsoDay(orderedDateKeys[index]);
    const previous = parseIsoDay(orderedDateKeys[index - 1]);
    const dayGap = Math.round((current - previous) / DAY_MS);
    if (dayGap === 1) {
      streak += 1;
      continue;
    }
    break;
  }
  return streak;
}

/**
 * Counts trailing streak after the most recent break to drive comeback bonuses.
 */
function countComebackStreak(orderedDateKeys) {
  let streak = 1;
  for (let index = orderedDateKeys.length - 1; index > 0; index -= 1) {
    const current = parseIsoDay(orderedDateKeys[index]);
    const previous = parseIsoDay(orderedDateKeys[index - 1]);
    const dayGap = Math.round((current - previous) / DAY_MS);

    if (dayGap === 1) {
      streak += 1;
      continue;
    }

    // The first gap >1 marks the break; everything after that gap is the comeback run.
    break;
  }
  return streak;
}

/**
 * Counts trailing streak of in-range calories in recent logs.
 */
function countTrailingInRangeStreak(recentDateKeys, entriesMap, healthyRange) {
  let streak = 0;
  for (let index = recentDateKeys.length - 1; index >= 0; index -= 1) {
    const calories = entriesMap[recentDateKeys[index]]?.calories;

    // Missing calorie data breaks adherence streak; this avoids over-crediting sparse logs.
    if (!Number.isFinite(calories)) break;
    if (calories < healthyRange.min || calories > healthyRange.max) break;

    streak += 1;
  }
  return streak;
}

/**
 * Evaluates whether a user currently qualifies for one non-punitive rest day.
 *
 * The window check discourages serial "rest" abuse while still validating real recovery.
 */
function evaluateRestDayEligibility(orderedDateKeys, currentStreak, referenceDate) {
  const windowDays = BEHAVIOR_CONFIG.REST_DAY_WINDOW_DAYS;
  const maxUses = BEHAVIOR_CONFIG.REST_DAY_MAX_USES_PER_WINDOW;
  const minStreak = BEHAVIOR_CONFIG.REST_DAY_MIN_STREAK;

  const today = startOfIsoDay(referenceDate);
  const latestLogged = parseIsoDay(orderedDateKeys[orderedDateKeys.length - 1]);
  const daysSinceLatest = Math.round((today - latestLogged) / DAY_MS);

  // If the last log is older than yesterday, treat the streak as inactive at UI boundaries.
  const streakIsActive = daysSinceLatest <= 1;

  const recentRestUsage = countRecentSingleDayGaps(orderedDateKeys, windowDays);
  const remainingThisWindow = Math.max(0, maxUses - recentRestUsage);

  if (!streakIsActive) {
    return {
      eligible: false,
      remainingThisWindow,
      message: "No stress—log one day to reactivate momentum before taking a protected rest day.",
    };
  }

  if (currentStreak < minStreak) {
    return {
      eligible: false,
      remainingThisWindow,
      message: `Build to a ${minStreak}-day streak first; then one planned rest day is protected.`,
    };
  }

  if (remainingThisWindow <= 0) {
    return {
      eligible: false,
      remainingThisWindow,
      message: `Rest-day protection was already used in the last ${windowDays} days. It refreshes automatically.`,
    };
  }

  return {
    eligible: true,
    remainingThisWindow,
    message: `You can take ${remainingThisWindow} protected rest day in the current ${windowDays}-day window.`,
  };
}

/**
 * Counts single-day gaps in a rolling window as protected-rest usage.
 */
function countRecentSingleDayGaps(orderedDateKeys, windowDays) {
  if (orderedDateKeys.length < 2) return 0;

  const latestLogged = parseIsoDay(orderedDateKeys[orderedDateKeys.length - 1]);
  const windowStart = new Date(latestLogged);
  windowStart.setDate(windowStart.getDate() - windowDays + 1);

  let total = 0;
  for (let index = 1; index < orderedDateKeys.length; index += 1) {
    const previous = parseIsoDay(orderedDateKeys[index - 1]);
    const current = parseIsoDay(orderedDateKeys[index]);

    if (current < windowStart) continue;

    const dayGap = Math.round((current - previous) / DAY_MS);
    if (dayGap === 2) total += 1;
  }
  return total;
}

function parseIsoDay(isoDateString) {
  return new Date(`${isoDateString}T12:00:00`);
}

function startOfIsoDay(date) {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}
