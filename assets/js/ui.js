import { QUESTS, DAILY_FIELDS } from "./constants.js";
import { avg, escapeHtml } from "./utils.js";
import { computeSkillGains, computeProgression, levelFromXp } from "./progression.js";

/**
 * Renders contextual status messages into the target container.
 */
export function showMessages(containerId, messages, style) {
  const box = document.getElementById(containerId);
  box.innerHTML = messages.map((m) => `<div class="msg ${style}">${m}</div>`).join("");
}

/**
 * Activates tab button interactions for section switching.
 */
export function setupTabs() {
  const tabs = document.querySelectorAll(".tab-btn");
  tabs.forEach((tabBtn) => {
    tabBtn.addEventListener("click", () => {
      tabs.forEach((btn) => btn.classList.remove("active"));
      tabBtn.classList.add("active");
      document.querySelectorAll(".tab").forEach((tab) => tab.classList.add("hidden"));
      document.getElementById(tabBtn.dataset.tab).classList.remove("hidden");
    });
  });
}

/**
 * Hydrates daily form fields for a selected date from existing stored entry.
 */
export function hydrateFormForDate(state) {
  const date = document.getElementById("entry-date").value;
  const entry = state.entries[date];

  DAILY_FIELDS.forEach((field) => {
    const input = document.getElementById(field);
    input.value = entry ? entry[field] : "";
  });
}

/**
 * Reads and normalizes daily form input into the entry schema.
 */
export function readEntryFromForm() {
  return {
    date: document.getElementById("entry-date").value,
    calories: Number(document.getElementById("calories").value),
    sleepHours: Number(document.getElementById("sleepHours").value),
    mood: Number(document.getElementById("mood").value),
    steps: Number(document.getElementById("steps").value),
    exerciseMinutes: Number(document.getElementById("exerciseMinutes").value),
    exerciseEffort: Number(document.getElementById("exerciseEffort").value),
  };
}

/**
 * Renders the recap view in required hierarchy order.
 */
export function renderRecap(entry, state) {
  const gains = computeSkillGains(entry);
  const progression = computeProgression(state.entries);

  const skillRows = Object.entries(gains)
    .map(([skill, xp]) => `<tr><td>${skill}</td><td>+${xp} XP</td></tr>`)
    .join("");

  const attributeCards = Object.entries(progression.attributeXp)
    .map(([attribute, xp]) => {
      const levelInfo = levelFromXp(xp);
      return `<div class="card"><strong>${attribute}</strong><div class="metric">L${levelInfo.level}</div><div>${levelInfo.inLevelXp}/${levelInfo.next} XP</div></div>`;
    })
    .join("");

  const questRows = Object.entries(QUESTS)
    .map(([key, q]) => {
      const current = progression.quests[key].current;
      return `<tr><td>${q.label} <span class="pill">${q.type}</span></td><td>${current}/${q.target}</td></tr>`;
    })
    .join("");

  const anomalyLine = entry.isAnomalous
    ? `<div class="msg warn">Included but flagged: ${entry.anomalyNotes.join(", ")}.</div>`
    : "";

  document.getElementById("recap-content").innerHTML = `
    ${anomalyLine}
    <div class="cards">
      <div class="card">
        <strong>Daily Completion</strong>
        <div class="metric">+20 XP</div>
        <div class="muted">Overall progression bonus</div>
      </div>
      <div class="card">
        <strong>Total Entries</strong>
        <div class="metric">${progression.orderedEntries.length}</div>
        <div class="muted">Local runs logged</div>
      </div>
    </div>
    <h4>1) Skill XP Gains</h4>
    <table><thead><tr><th>Skill</th><th>Gain</th></tr></thead><tbody>${skillRows}</tbody></table>
    <h4 class="spacer-top">2) Attribute Progress</h4>
    <div class="cards">${attributeCards}</div>
    <h4 class="spacer-top">3) Quest Progress</h4>
    <table><thead><tr><th>Quest</th><th>Progress</th></tr></thead><tbody>${questRows}</tbody></table>
  `;

  document.getElementById("recap").classList.remove("hidden");
}

/**
 * Renders the dashboard aggregate and 7-day trend summary views.
 */
export function renderDashboard(state) {
  const progression = computeProgression(state.entries);
  const entries = progression.orderedEntries;
  const latest7 = entries.slice(-7);

  const averages = {
    calories: avg(latest7.map((e) => e.calories)),
    sleepHours: avg(latest7.map((e) => e.sleepHours)),
    mood: avg(latest7.map((e) => e.mood)),
    steps: avg(latest7.map((e) => e.steps)),
    exerciseMinutes: avg(latest7.map((e) => e.exerciseMinutes)),
  };

  const skillLines = Object.entries(progression.skillXp)
    .map(([skill, xp]) => `<li>${skill}: ${xp} XP</li>`)
    .join("") || "<li>No data yet.</li>";

  const tableRows = latest7.map((entry) => `
    <tr>
      <td>${entry.date}</td><td>${entry.calories}</td><td>${entry.sleepHours}</td><td>${entry.mood}</td><td>${entry.steps}</td><td>${entry.exerciseMinutes}</td>
    </tr>
  `).join("") || `<tr><td colspan="6">No entries yet.</td></tr>`;

  const attributeCards = Object.entries(progression.attributeXp).map(([attribute, xp]) => {
    const levelInfo = levelFromXp(xp);
    return `<div class="card"><strong>${attribute}</strong><div class="metric">L${levelInfo.level}</div><div>${levelInfo.inLevelXp}/${levelInfo.next} XP to next level</div></div>`;
  }).join("");

  const questRows = Object.entries(QUESTS).map(([key, q]) => {
    const progress = progression.quests[key];
    return `<tr><td>${q.label}</td><td>${progress.current}/${progress.target}</td></tr>`;
  }).join("");

  document.getElementById("dashboard-content").innerHTML = `
    <div class="cards">
      <div class="card"><strong>Overall XP</strong><div class="metric">${progression.overallXp}</div></div>
      <div class="card"><strong>Total Logged Days</strong><div class="metric">${entries.length}</div></div>
      <div class="card"><strong>7-Day Avg Mood</strong><div class="metric">${averages.mood.toFixed(1)}</div></div>
    </div>

    <h3 class="spacer-top">7-Day Trend Summary (MVP Metrics)</h3>
    <div class="cards">
      <div class="card"><strong>Calories</strong><div class="metric">${averages.calories.toFixed(0)}</div></div>
      <div class="card"><strong>Sleep</strong><div class="metric">${averages.sleepHours.toFixed(1)}h</div></div>
      <div class="card"><strong>Mood</strong><div class="metric">${averages.mood.toFixed(1)}</div></div>
      <div class="card"><strong>Steps</strong><div class="metric">${averages.steps.toFixed(0)}</div></div>
      <div class="card"><strong>Exercise</strong><div class="metric">${averages.exerciseMinutes.toFixed(0)}m</div></div>
    </div>

    <h3 class="spacer-top">Recent Entries (Last 7)</h3>
    <table>
      <thead><tr><th>Date</th><th>Calories</th><th>Sleep</th><th>Mood</th><th>Steps</th><th>Exercise Min</th></tr></thead>
      <tbody>${tableRows}</tbody>
    </table>

    <h3 class="spacer-top">Skill XP</h3>
    <ul>${skillLines}</ul>

    <h3>Attribute Levels</h3>
    <div class="cards">${attributeCards}</div>

    <h3 class="spacer-top">Quest Progress</h3>
    <table><thead><tr><th>Quest</th><th>Progress</th></tr></thead><tbody>${questRows}</tbody></table>
  `;
}

/**
 * Renders recent weekly/monthly review notes.
 */
export function renderReviewsList(state) {
  const weekly = Object.entries(state.reviews.weekly)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 5)
    .map(([period, review]) => `<li><strong>${period}</strong>: ${escapeHtml(review.text)}</li>`)
    .join("") || "<li>No weekly reviews yet.</li>";

  const monthly = Object.entries(state.reviews.monthly)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 5)
    .map(([period, review]) => `<li><strong>${period}</strong>: ${escapeHtml(review.text)}</li>`)
    .join("") || "<li>No monthly reviews yet.</li>";

  document.getElementById("reviews-list").innerHTML = `
    <div class="row">
      <div class="card"><h3>Recent Weekly Reviews</h3><ul>${weekly}</ul></div>
      <div class="card"><h3>Recent Monthly Reviews</h3><ul>${monthly}</ul></div>
    </div>
  `;
}
