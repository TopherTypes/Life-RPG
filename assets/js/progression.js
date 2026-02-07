import { ATTRIBUTE_SKILLS, QUESTS } from "./constants.js";

/**
 * Exponential level curve baseline from product decisions.
 */
export function xpToNextLevel(level) {
  return Math.round(100 * Math.pow(1.25, level - 1));
}

/**
 * Converts cumulative XP into level and progress toward next level.
 */
export function levelFromXp(xp) {
  let level = 1;
  let remaining = xp;
  while (remaining >= xpToNextLevel(level)) {
    remaining -= xpToNextLevel(level);
    level += 1;
  }
  return { level, inLevelXp: remaining, next: xpToNextLevel(level) };
}

/**
 * Computes skill gains for one daily entry using MVP defaults.
 */
export function computeSkillGains(entry) {
  const gains = {
    Energy: 5,
    Organisation: 5,
    "Emotional Balance": 5,
    Strength: 15,
  };

  if (entry.sleepHours >= 7 && entry.sleepHours <= 9) gains.Energy += 5;
  if (entry.exerciseMinutes >= 30 && entry.exerciseEffort >= 6) gains.Strength += 10;
  if (entry.mood >= 7) gains["Emotional Balance"] += 5;

  return gains;
}

/**
 * Builds full progression from raw entries, ensuring deterministic recompute after edits.
 */
export function computeProgression(entriesMap, acceptedQuests = {}) {
  const orderedEntries = Object.keys(entriesMap)
    .sort((a, b) => a.localeCompare(b))
    .map((dateKey) => entriesMap[dateKey]);
  const skillXp = {};
  let overallXp = 0;

  orderedEntries.forEach((entry) => {
    overallXp += 20;
    const gains = computeSkillGains(entry);
    Object.entries(gains).forEach(([skill, xp]) => {
      skillXp[skill] = (skillXp[skill] || 0) + xp;
    });
  });

  const attributeXp = Object.fromEntries(
    Object.entries(ATTRIBUTE_SKILLS).map(([attribute, skills]) => {
      const total = skills.reduce((sum, skill) => sum + (skillXp[skill] || 0), 0);
      return [attribute, total];
    })
  );

  const quests = computeQuestProgress(orderedEntries, acceptedQuests);
  return { overallXp, skillXp, attributeXp, quests, orderedEntries };
}

/**
 * Computes streak metrics directly from ISO date keys in the entries map.
 *
 * The object keys are already in YYYY-MM-DD format, so lexicographic sorting is
 * deterministic and aligns with chronological ordering.
 */
export function computeStreakMetrics(entriesMap) {
  const orderedDateKeys = Object.keys(entriesMap).sort((a, b) => a.localeCompare(b));

  if (!orderedDateKeys.length) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      currentWeekCompletion: 0,
    };
  }

  let currentRun = 1;
  let longestRun = 1;

  for (let index = 1; index < orderedDateKeys.length; index += 1) {
    const previous = parseIsoDay(orderedDateKeys[index - 1]);
    const current = parseIsoDay(orderedDateKeys[index]);
    const dayGap = Math.round((current - previous) / DAY_MS);

    if (dayGap === 1) {
      currentRun += 1;
      longestRun = Math.max(longestRun, currentRun);
      continue;
    }

    currentRun = 1;
  }

  const today = startOfIsoDay(new Date());
  const latestLogged = parseIsoDay(orderedDateKeys[orderedDateKeys.length - 1]);
  const daysSinceLatest = Math.round((today - latestLogged) / DAY_MS);
  const currentStreak = daysSinceLatest <= 1 ? currentRun : 0;

  const currentWeekStart = startOfCurrentWeek(today);
  const currentWeekCompletion = orderedDateKeys.filter((dateKey) => parseIsoDay(dateKey) >= currentWeekStart).length;

  return {
    currentStreak,
    longestStreak: longestRun,
    currentWeekCompletion,
  };
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Parses YYYY-MM-DD into a stable local noon timestamp to avoid DST edge cases.
 */
function parseIsoDay(isoDateString) {
  return new Date(`${isoDateString}T12:00:00`);
}

/**
 * Normalizes any timestamp to local day-start for safe day-difference math.
 */
function startOfIsoDay(date) {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

/**
 * Derives local Monday 00:00:00 for the supplied date.
 */
function startOfCurrentWeek(date) {
  const weekStart = new Date(date);
  const day = (weekStart.getDay() + 6) % 7;
  weekStart.setDate(weekStart.getDate() - day);
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
}

/**
 * Computes current quest counters for long and weekly quest types.
 */
export function computeQuestProgress(entries, acceptedQuests = {}) {
  const logs = entries.length;
  const exerciseSessions = entries.filter((e) => e.exerciseMinutes > 0).length;

  const now = new Date();
  const weekStart = new Date(now);
  const day = (now.getDay() + 6) % 7;
  weekStart.setDate(now.getDate() - day);
  weekStart.setHours(0, 0, 0, 0);

  const weeklyCount = entries.filter((entry) => {
    const date = new Date(`${entry.date}T12:00:00`);
    return date >= weekStart;
  }).length;

  // Tracking is blocked until each quest is explicitly accepted.
  const withAcceptance = (key, current) => ({
    current: acceptedQuests[key] ? current : 0,
    target: QUESTS[key].target,
    accepted: Boolean(acceptedQuests[key]),
  });

  return {
    dailyLog30: withAcceptance("dailyLog30", logs),
    exercise10: withAcceptance("exercise10", exerciseSessions),
    weekly7: withAcceptance("weekly7", weeklyCount),
  };
}
