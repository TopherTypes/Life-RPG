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

### Explicitly deferred
- AI features.
- Social features.
- Loot/items and randomized rewards (post-MVP).
- External integrations (post-MVP).

---

## 2) Unresolved / TBD Decisions Log

> Use this as the active queue for future planning sessions.

### Product and scope
- [ ] Define the 3 non-negotiable MVP features.
- [ ] Define explicit launch blockers vs “ship now” criteria.
- [ ] Define what “thin but lovable MVP” means in concrete terms.
- [ ] Set a concrete MVP date.

### Mechanics and balancing
- [ ] Finalize attribute set for RPG system.
- [ ] Define initial skill catalog.
- [ ] Finalize metric-to-XP mapping formulas.
- [ ] Choose exact exponential leveling formula and tuning ranges.
- [ ] Define failure behavior for quests (fail/retry/partial credit logic).
- [ ] Define soft-penalty system for missed days.
- [ ] Define rest-day anti-abuse model (diminishing returns vs explicit penalties).
- [ ] Define recovery/comeback mechanics.

### Data and validation
- [ ] Define validation rules for missing/incomplete/unrealistic values.
- [ ] Decide if mood scale is numeric, categorical, or hybrid.
- [ ] Define the minimum required exercise fields for each day.

### UX and transparency
- [ ] Define exact end-of-entry recap content and hierarchy.
- [ ] Define “mystique mode” vs “verbose/clear mode” behavior in settings.
- [ ] Decide whether journaling/reflection prompts are included in MVP or V1.
- [ ] Define mental health boundaries/disclaimers.

### Reviews and planning
- [ ] Define weekly review template/questions.
- [ ] Define monthly review template/questions.
- [ ] Define adaptation logic for target suggestions (V1).

### Delivery operations
- [ ] Define milestone-level acceptance criteria in measurable terms.
- [ ] Define analytics events to instrument from day 1.
- [ ] Define roadmap review cadence.

---

## 3) Change Log Convention
- Add new entries with date and rationale.
- Move items from TBD to Confirmed when decided.
- If reversing a decision, preserve prior decision in history with reason.
