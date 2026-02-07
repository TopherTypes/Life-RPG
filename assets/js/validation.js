import { DAILY_FIELDS } from "./constants.js";

/**
 * Determines whether a dated entry remains editable.
 * Policy: editable until 24h after the end of the target day.
 */
export function isEditable(dateISO) {
  const endOfDay = new Date(`${dateISO}T23:59:59.999`);
  const editableUntil = new Date(endOfDay.getTime() + 24 * 60 * 60 * 1000);
  return new Date() <= editableUntil;
}

/**
 * Hard validations block submit; soft validations produce warnings and anomaly flags.
 */
export function validateEntry(entry) {
  const hardErrors = [];
  const softWarnings = [];
  const anomalies = [];

  for (const field of DAILY_FIELDS) {
    if (entry[field] === "" || Number.isNaN(entry[field])) {
      hardErrors.push(`${field} is required.`);
    }
  }

  if (entry.mood < 1 || entry.mood > 10) hardErrors.push("Mood must be between 1 and 10.");
  if (entry.exerciseEffort < 1 || entry.exerciseEffort > 10) {
    hardErrors.push("Exercise effort must be between 1 and 10.");
  }
  if ([entry.calories, entry.sleepHours, entry.steps, entry.exerciseMinutes].some((n) => n < 0)) {
    hardErrors.push("Calories, sleep, steps, and exercise minutes cannot be negative.");
  }

  if (entry.sleepHours > 14) anomalies.push("Sleep > 14h");
  if (entry.steps > 60000) anomalies.push("Steps > 60,000");
  if (entry.calories > 8000) anomalies.push("Calories > 8,000");
  if (entry.exerciseMinutes > 240) anomalies.push("Exercise > 240 minutes");

  if (anomalies.length) {
    softWarnings.push(`Anomalies detected: ${anomalies.join(", ")}. Value included but flagged.`);
  }

  return { hardErrors, softWarnings, anomalies };
}
