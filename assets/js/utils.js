/**
 * Returns current date in YYYY-MM-DD format for input controls.
 */
export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Computes arithmetic mean or zero for empty arrays.
 */
export function avg(values) {
  if (!values.length) return 0;
  return values.reduce((sum, n) => sum + n, 0) / values.length;
}

/**
 * Escapes user-provided text before HTML rendering.
 */
export function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


/**
 * Converts metric centimeters into the selected display unit payload.
 */
export function convertHeightToDisplay(heightCm, unit) {
  if (!Number.isFinite(heightCm)) return { whole: "", fraction: "", value: "" };
  if (unit === "ft_in") {
    const totalInches = heightCm / 2.54;
    const feet = Math.floor(totalInches / 12);
    const inches = Math.round(totalInches - (feet * 12));
    return { whole: String(feet), fraction: String(inches), value: String(Math.round(heightCm * 10) / 10) };
  }
  return { whole: String(Math.round(heightCm * 10) / 10), fraction: "", value: String(Math.round(heightCm * 10) / 10) };
}

/**
 * Converts display height inputs into canonical centimeters for persistence.
 */
export function convertHeightToCm(whole, fraction, unit) {
  const parsedWhole = Number(whole);
  if (!Number.isFinite(parsedWhole)) return null;
  if (unit === "ft_in") {
    const parsedFraction = Number(fraction);
    if (!Number.isFinite(parsedFraction)) return null;
    return Number((((parsedWhole * 12) + parsedFraction) * 2.54).toFixed(1));
  }
  return Number(parsedWhole.toFixed(1));
}

/**
 * Converts metric kilograms into the selected display unit payload.
 */
export function convertWeightToDisplay(weightKg, unit) {
  if (!Number.isFinite(weightKg)) return { whole: "", fraction: "", value: "" };
  if (unit === "lb") {
    return { whole: String(Math.round(weightKg * 2.20462 * 10) / 10), fraction: "", value: String(weightKg) };
  }
  if (unit === "st_lb") {
    const totalPounds = weightKg * 2.20462;
    const stone = Math.floor(totalPounds / 14);
    const pounds = Math.round(totalPounds - (stone * 14));
    return { whole: String(stone), fraction: String(pounds), value: String(weightKg) };
  }
  return { whole: String(Math.round(weightKg * 10) / 10), fraction: "", value: String(weightKg) };
}

/**
 * Converts display weight inputs into canonical kilograms for persistence.
 */
export function convertWeightToKg(whole, fraction, unit) {
  const parsedWhole = Number(whole);
  if (!Number.isFinite(parsedWhole)) return null;
  if (unit === "lb") return Number((parsedWhole / 2.20462).toFixed(1));
  if (unit === "st_lb") {
    const parsedFraction = Number(fraction);
    if (!Number.isFinite(parsedFraction)) return null;
    return Number((((parsedWhole * 14) + parsedFraction) / 2.20462).toFixed(1));
  }
  return Number(parsedWhole.toFixed(1));
}
