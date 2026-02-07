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
export function computeProgression(entriesMap) {
  const orderedEntries = Object.values(entriesMap).sort((a, b) => a.date.localeCompare(b.date));
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

  const quests = computeQuestProgress(orderedEntries);
  return { overallXp, skillXp, attributeXp, quests, orderedEntries };
}

/**
 * Computes current quest counters for long and weekly quest types.
 */
export function computeQuestProgress(entries) {
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

  return {
    dailyLog30: { current: logs, target: QUESTS.dailyLog30.target },
    exercise10: { current: exerciseSessions, target: QUESTS.exercise10.target },
    weekly7: { current: weeklyCount, target: QUESTS.weekly7.target },
  };
}
