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

  // Date plus one other metric is required. Empty numeric fields are currently ignored.
  const providedMetricCount = DAILY_FIELDS.filter((field) => entry[field] !== null).length;
  if (providedMetricCount < 1) {
    hardErrors.push("Please provide at least one metric in addition to date.");
  }

  if (entry.mood !== null && (entry.mood < 1 || entry.mood > 10)) {
    hardErrors.push("Mood must be between 1 and 10.");
  }
  if (entry.exerciseEffort !== null && (entry.exerciseEffort < 1 || entry.exerciseEffort > 10)) {
    hardErrors.push("Exercise effort must be between 1 and 10.");
  }

  // Exercise duration and effort must be logged together to avoid incomplete workout data.
  if (entry.exerciseMinutes !== null && entry.exerciseMinutes > 0 && entry.exerciseEffort === null) {
    hardErrors.push("Exercise effort is required when exercise minutes are greater than 0.");
  }

  // Effort without a positive duration is contradictory and should block save.
  if (entry.exerciseEffort !== null && (entry.exerciseMinutes === null || entry.exerciseMinutes <= 0)) {
    hardErrors.push("Exercise minutes must be greater than 0 when exercise effort is provided.");
  }

  const nonNegativeFields = [entry.calories, entry.sleepHours, entry.steps, entry.exerciseMinutes];
  if (nonNegativeFields.some((n) => n !== null && n < 0)) {
    hardErrors.push("Calories, sleep, steps, and exercise minutes cannot be negative.");
  }

  if (entry.sleepHours !== null && entry.sleepHours > 14) anomalies.push("Sleep > 14h");
  if (entry.steps !== null && entry.steps > 60000) anomalies.push("Steps > 60,000");
  if (entry.calories !== null && entry.calories > 8000) anomalies.push("Calories > 8,000");
  if (entry.exerciseMinutes !== null && entry.exerciseMinutes > 240) anomalies.push("Exercise > 240 minutes");

  if (anomalies.length) {
    softWarnings.push(`Anomalies detected: ${anomalies.join(", ")}. Value included but flagged.`);
  }

  return { hardErrors, softWarnings, anomalies };
}
