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
