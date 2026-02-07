# LifeRPG Roadmap

This roadmap is milestone-based and optimized for solo development with Codex support.

## Delivery Principles
- Prioritize working end-to-end flows before depth.
- Control scope creep aggressively.
- Keep mechanics understandable and adjustable.
- Prefer stable routines over feature volume.

## Milestone 0 — Product Foundation (Current)
**Goal:** Lock core direction, define MVP boundaries, and document open decisions.

Deliverables:
- Core docs created (`README`, `SPEC`, `FEATURES`, `DECISIONS`, `CONTRIBUTING`, `ROADMAP`).
- MVP feature shortlist and exclusions documented.
- Open decision log created and prioritized.

Exit criteria:
- Documentation is consistent.
- MVP/non-MVP boundaries are clear enough to begin implementation.

## Milestone 1 — MVP Vertical Slice
**Goal:** Deliver a usable local-first daily tracking loop.

Target capabilities:
- Daily entry form (manual inputs only).
- One-entry-per-day model.
- 24-hour edit window after day completion.
- End-of-day recap with XP/stat progression signals.
- Basic dashboard with trend summaries.
- LocalStorage persistence.

Exit criteria:
- Daily completion loop works reliably.
- Data persists across sessions in-browser.
- User can view progress and make next-day adjustments.

## Milestone 2 — MVP Plus (Stability + Reviews)
**Goal:** Improve retention through structured reflection and anti-burnout support.

Target capabilities:
- Weekly guided review.
- Monthly guided review.
- Rest-day mechanic with anti-abuse logic.
- Soft-penalty behavior for missed days.
- Improved analytics views for self-awareness.

Exit criteria:
- Weekly/monthly ritual flow is functional.
- Penalty/recovery systems are fair and understandable.

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
