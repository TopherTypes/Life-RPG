/**
 * Metric analytics helpers used by drill-down views.
 *
 * These utilities are intentionally pure so metric insights stay deterministic
 * and easy to test regardless of UI rendering concerns.
 */

const WEEKDAY_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/**
 * Parses an ISO date string (YYYY-MM-DD) at local noon to avoid DST edge cases.
 * @param {string} isoDate
 * @returns {Date}
 */
function parseIsoDay(isoDate) {
  return new Date(`${isoDate}T12:00:00`);
}

/**
 * Formats a Date into an ISO day key (YYYY-MM-DD) in local time.
 * @param {Date} date
 * @returns {string}
 */
function toIsoDay(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Creates a rolling metric window ending at the latest logged date (or today when empty).
 * Missing dates and missing metric values are represented as null placeholders.
 *
 * @param {Array<Object>} entries
 * @param {string} metricKey
 * @param {number} days
 * @returns {Array<{date: string, value: number|null}>}
 */
export function getMetricWindow(entries, metricKey, days = 30) {
  const safeDays = Number.isFinite(days) && days > 0 ? Math.floor(days) : 30;
  const sortedEntries = [...(Array.isArray(entries) ? entries : [])]
    .filter((entry) => entry && typeof entry.date === "string")
    .sort((a, b) => a.date.localeCompare(b.date));

  const entryByDate = new Map(sortedEntries.map((entry) => [entry.date, entry]));
  const latestDate = sortedEntries.length ? parseIsoDay(sortedEntries[sortedEntries.length - 1].date) : new Date();

  return Array.from({ length: safeDays }, (_, offset) => {
    const dayCursor = new Date(latestDate);
    dayCursor.setDate(latestDate.getDate() - (safeDays - offset - 1));
    const dateKey = toIsoDay(dayCursor);
    const entry = entryByDate.get(dateKey);
    const rawValue = entry ? entry[metricKey] : null;

    return {
      date: dateKey,
      value: rawValue === null || rawValue === undefined ? null : Number(rawValue),
    };
  });
}

/**
 * Computes the arithmetic mean for non-null values inside a metric window.
 * @param {Array<{value: number|null}>} window
 * @returns {number|null}
 */
export function computeMetricAverage(window) {
  const values = (window || [])
    .map((point) => point?.value)
    .filter((value) => Number.isFinite(value));

  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/**
 * Computes weekday means (Monday through Sunday) from a metric window.
 * @param {Array<{date: string, value: number|null}>} window
 * @returns {Record<string, number|null>}
 */
export function computeWeekdayAverages(window) {
  const buckets = Object.fromEntries(WEEKDAY_ORDER.map((weekday) => [weekday, []]));

  (window || []).forEach((point) => {
    if (!point || !Number.isFinite(point.value) || typeof point.date !== "string") return;
    const jsDay = parseIsoDay(point.date).getDay();
    const weekday = WEEKDAY_ORDER[(jsDay + 6) % 7];
    buckets[weekday].push(point.value);
  });

  return Object.fromEntries(
    WEEKDAY_ORDER.map((weekday) => {
      const values = buckets[weekday];
      if (!values.length) return [weekday, null];
      const average = values.reduce((sum, value) => sum + value, 0) / values.length;
      return [weekday, average];
    })
  );
}

/**
 * Finds the highest and lowest weekdays from weekday average values.
 * Null weekdays are ignored.
 * @param {Record<string, number|null>} weekdayAverages
 * @returns {{ highest: {day: string, value: number}|null, lowest: {day: string, value: number}|null }}
 */
export function findHighestLowestWeekday(weekdayAverages) {
  const ranked = WEEKDAY_ORDER
    .map((day) => ({ day, value: weekdayAverages?.[day] }))
    .filter((entry) => Number.isFinite(entry.value));

  if (!ranked.length) {
    return {
      highest: null,
      lowest: null,
    };
  }

  const highest = ranked.reduce((best, current) => (current.value > best.value ? current : best), ranked[0]);
  const lowest = ranked.reduce((best, current) => (current.value < best.value ? current : best), ranked[0]);

  return { highest, lowest };
}

export { WEEKDAY_ORDER };
