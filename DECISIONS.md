# LifeRPG Decisions

This document records resolved decisions and unresolved decisions.

---

## 1) Confirmed Decisions

### Product intent
- Primary outcome: consistency and habit building.
- Initial audience: personal use (solo builder/user).
- Priority order: consistency > motivation > self-awareness.

### Product stance
- Simple data entry + rich analytics.
- Solo/private app only (no social features).
- Web-only deployment.

### Core loop
- Daily flow: open app → input data → rewards/recap → progress → planning adjustments.
- Daily data-entry target: 3–5 minutes.
- Review time expectation: 10–20 minutes for analysis/planning.
- Monthly review expectation: up to ~30 minutes.

### Data capture (MVP)
- Mandatory metrics: calories in, sleep hours, mood, steps, exercise.
- Manual entry only.
- Positive metrics only in MVP (no negative behavior tracking yet).
- Exercise detail intent includes type, effort, duration, plus optional activity-specific fields.
- Mood input scale: numeric 1–10.
- Required exercise fields for MVP: type, duration, effort (1–10).

### Progression mechanics
- Leveling preference: exponential progression curve.
- No classes/archetypes in MVP.
- No stat respec initially.
- Rewards should feel meaningful.

### Quest framework
- Structure: daily → weekly → long-term quests.
- Quest creation: template-driven.
- Deadlines: yes.
- Milestones: maybe.
- Dependencies: no (for now).
- MVP quest complexity: simple counter-based quests only (for example: complete 10 exercise sessions, complete 30 daily logs).

### UX philosophy
- Coaching style: gentle but fair.
- Anti-burnout behavior: important.
- Weekly and monthly guided reviews: required.

### Technical constraints
- Storage in MVP: LocalStorage only.
- Integrations: none in MVP.
- Authentication: none in MVP.
- Hosting: GitHub Pages.
- Compliance constraints: none currently specified.

### Business scope
- Personal project.
- No monetization planned.

### MVP scope priorities (provisional)
- The 3 non-negotiable MVP capabilities are:
  1) daily data entry,
  2) pattern/trend review,
  3) visible progress in skills/attributes.

### Explicitly deferred
- AI features.
- Social features.
- Loot/items and randomized rewards (post-MVP).
- External integrations (post-MVP).

---

## 2) Unresolved / TBD Decisions Log

> Use this as the active queue for future planning sessions.

### Product and scope
- [ ] Define explicit launch blockers vs “ship now” criteria.
- [ ] Define what “thin but lovable MVP” means in concrete terms.
- [ ] Set a concrete MVP date.

### Mechanics and balancing
- [ ] Define soft-penalty system for missed days.
- [ ] Define rest-day anti-abuse model (diminishing returns vs explicit penalties).
- [ ] Define recovery/comeback mechanics.

### UX and transparency
- [ ] Define “mystique mode” vs “verbose/clear mode” behavior in settings.
- [ ] Decide whether journaling/reflection prompts are included in MVP or V1.
- [ ] Define mental health boundaries/disclaimers.

### Reviews and planning
- [ ] Define adaptive logic for target suggestions (V1).

### Delivery operations
- [ ] Define analytics events to instrument from day 1.
- [ ] Define roadmap review cadence.

---

## 3) Confirmed MVP Mechanics Baseline (v0.1)

> These defaults translate current direction into implementable formulas. They are intentionally simple and can be tuned after real usage.

### Attribute model (mind/body/soul)
- Body
  - Strength
  - Flexibility
  - Energy
- Mind
  - Learning
  - Organisation
  - Creativity
- Soul
  - Mindfulness
  - Emotional Balance
  - Connection

### Initial skill catalog (1–3 simple skills per attribute)
- **Strength**: strength training, active movement.
- **Flexibility**: stretching, mobility.
- **Energy**: sleep routine, daily activity.
- **Learning**: focused study, reading.
- **Organisation**: daily planning, task follow-through.
- **Creativity**: idea capture, creative practice.
- **Mindfulness**: breathing practice, mindful pause.
- **Emotional Balance**: mood check-in, stress reset.
- **Connection**: meaningful conversation, social check-in.

### MVP XP mapping (confirmed starting default)
- Daily completion bonus: `+20 XP` to overall progression.
- Per-metric XP (awarded when valid data is entered):
  - calories logged: `+5 XP`
  - sleep logged: `+5 XP`
  - mood logged: `+5 XP`
  - steps logged: `+5 XP`
  - exercise logged: `+10 XP`
- Quality bonus examples:
  - sleep between 7–9h: `+5 XP` to Energy.
  - exercise duration >= 30 min and effort >= 6/10: `+10 XP` to Strength.
  - mood >= 7/10: `+5 XP` to Emotional Balance.
- Attribute XP is the sum of linked skill XP for that day.

### Level curve (confirmed starting exponential)
- XP required for next level at level `L`:
  - `xp_to_next(L) = round(100 * 1.25^(L-1))`
- Example scale:
  - L1→L2: 100
  - L2→L3: 125
  - L3→L4: 156
  - L4→L5: 195
  - L5→L6: 244
  - L10→L11: 745

### Quest completion behavior (MVP)
- Quest types are simple counters only.
- No hard fail state in MVP.
- On missed timeframe, weekly quests roll into a reset with a “streak broken” note.
- Partial progress is always visible and retained for long-term quests.

### Recap hierarchy (confirmed)
1. Skill XP gains.
2. Attribute progress summary.
3. Quest progress update.

### Weekly/monthly review templates (confirmed + implemented)
- Weekly and monthly review forms are implemented in MVP.
- Both use the same structured prompt schema for consistency:
  - `wins`
  - `blockers`
  - `nextAction`
  - `confidence`
- At least one prompt field plus a valid period is required before saving.

### Data validation & anomaly handling (confirmed starting policy)
- **Hard validation (block submit):**
  - required fields missing,
  - mood outside 1–10,
  - effort outside 1–10,
  - negative duration/steps/calories/sleep.
- **Soft validation (warn, allow submit):**
  - sleep > 14h,
  - steps > 60,000,
  - calories > 8,000,
  - exercise duration > 240 min.
- **Anomaly handling:**
  - store flagged value with `isAnomalous=true`,
  - show “included but flagged” note in recap,
  - allow edit within the existing 24-hour window.

### Milestone 1 acceptance criteria (confirmed starting draft)
- At least 95% of manual smoke-test runs complete full daily entry in <= 5 minutes.
- One-entry-per-day rule enforced for 100% of tested duplicate-submit attempts.
- 24-hour edit window works for boundary cases (before and after cutoff).
- Data survives browser reload and restart in the same profile for all tested entries.
- Recap always renders skill XP, attribute progress, and quest progress after successful submit.
- Dashboard shows at minimum 7-day trends for all required MVP metrics.

---

## 4) Change Log Convention
- 2026-02-08: Moved weekly/monthly review template decisions from TBD to confirmed after implementation landed in code. Documented the implemented structured prompt schema (`wins`, `blockers`, `nextAction`, `confidence`) and reduced TBD to items not yet represented in code.
- Add new entries with date and rationale.
- Move items from TBD to Confirmed when decided.
- If reversing a decision, preserve prior decision in history with reason.
