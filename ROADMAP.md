# LifeRPG Roadmap

This roadmap is milestone-based and optimized for solo development with Codex support.

## Delivery Principles
- Prioritize working end-to-end flows before depth.
- Control scope creep aggressively.
- Keep mechanics understandable and adjustable.
- Prefer stable routines over feature volume.

## Current state snapshot
- **App shell and persistence are active:** tabbed interface, LocalStorage state model, and account reset/settings are implemented in `index.html`, `assets/js/main.js`, and `assets/js/storage.js`.
- **Daily MVP loop is active:** date-based entry capture, validation + anomaly warnings, 24-hour edit window checks, recap modal, and progression recompute are implemented in `assets/js/main.js`, `assets/js/validation.js`, `assets/js/ui.js`, and `assets/js/progression.js`.
- **Quest and dashboard views are active:** accept-to-track quest flow, XP/attribute progress cards, streaks, and recent trend summaries are implemented in `assets/js/ui.js` + `assets/js/progression.js`.
- **Review capture exists (Milestone 2 partial):** weekly/monthly prompt forms and local persistence/listing are present in `index.html` + `assets/js/main.js` + `assets/js/ui.js`.
- **Not yet implemented:** deeper analytics instrumentation remains pending; first-pass behavior mechanics are now shipped.

## Milestone 0 — Product Foundation ✅ Complete
**Goal:** Lock core direction, define MVP boundaries, and document open decisions.

Deliverables:
- Core docs created (`README`, `SPEC`, `FEATURES`, `DECISIONS`, `CONTRIBUTING`, `ROADMAP`).
- MVP feature shortlist and exclusions documented.
- Open decision log created and prioritized.

Exit criteria:
- Documentation is consistent.
- MVP/non-MVP boundaries are clear enough to begin implementation.

Status:
- Completed. Core planning/docs baseline is established and implementation proceeded into the MVP vertical slice.

## Milestone 1 — MVP Vertical Slice ✅ Implemented / Active
**Goal:** Deliver a usable local-first daily tracking loop.

MVP priorities for this milestone:
- Daily data entry.
- Pattern/trend review.
- Visible progress in skills/attributes.

Delivered capabilities:
- Daily entry form (manual inputs only) is implemented.
- One-entry-per-day storage model is implemented via date-keyed entries.
- 24-hour edit window enforcement is implemented.
- End-of-day recap flow is implemented (XP/stat/quest progression pages).
- Simple counter-based quests are implemented, including accept-to-track behavior.
- Dashboard with progression and recent trend summaries is implemented.
- LocalStorage persistence is implemented for entries, reviews, quests, and settings.

Exit criteria:
- Daily completion loop works reliably.
- Data persists across sessions in-browser.
- User can view progress and make next-day adjustments.

Status:
- Active and implemented as the current baseline experience.

## Milestone 2 — MVP Plus (Stability + Reviews)
**Goal:** Improve retention through structured reflection and anti-burnout support.

### Partially implemented
- Weekly guided review capture exists (structured prompts + local save/list).
- Monthly guided review capture exists (structured prompts + local save/list).

### Pending
- Improved/deeper analytics views for self-awareness and planning quality.

Exit criteria:
- Weekly/monthly ritual flow is functional.
- Penalty/recovery systems are fair and understandable.

Status:
- In progress: review capture and first-pass behavior mechanics are present; deeper analytics remain pending.

## Milestone 3 — First Full Version (V1)
**Goal:** Introduce adaptive progression and deeper planning while staying solo/private.

Target capabilities:
- Adaptive target suggestions based on historical behavior.
- Template-driven quest creation with deadlines and optional milestones.
- Optional clarity mode to explain progression calculations.
- Stronger planning support from review insights.

Exit criteria:
- App supports a complete self-improvement loop: logging, feedback, planning, adaptation.

## Deferred Beyond V1
- Social/community features.
- AI coaching.
- External integrations.
- Loot/item systems and random reward events.
- Archetypes/classes and respec systems.

## Schedule Notes
- Desired MVP window: “next few weeks” (exact target date TBD).
- Review cadence and analytics instrumentation plan are still undecided.

## Risks & Mitigations
### Risk: Design complexity
Mitigation:
- Start with constrained mechanics.
- Make formulas configurable in one place.

### Risk: Scope creep
Mitigation:
- Enforce strict MVP gate.
- Track all new ideas in deferred backlog first.

### Risk: Behavior mechanics (penalty/recovery) becoming discouraging
Mitigation:
- Apply “gentle but fair” tuning.
- Validate with real usage before adding stronger penalties.
