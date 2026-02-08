# LifeRPG

LifeRPG is a personal web app that turns daily self-tracking into an RPG-like progression system.

## Vision
LifeRPG exists to improve **consistency and habit building** through a simple daily input flow and rich progress analytics.

Core outcomes:
- Daily self-tracking becomes part of normal routine.
- Users gain motivation from visible progression.
- Users build self-awareness from trend analysis.

## Product Positioning
LifeRPG is designed to be:
- **Simple to log** (3–5 minutes daily).
- **Deep to review** (10–20 minutes for planning and reflection).
- **Solo-first and private-first** (no social layer in MVP/V1).

## Current Scope (MVP)
- Web-only app.
- Manual data entry only.
- LocalStorage as sole persistence.
- No integrations.
- No AI.
- No authentication.

## Primary MVP Metrics
Mandatory daily metrics:
- Calories in
- Hours of sleep
- Mood
- Steps
- Exercise

## High-Level Loop
1. Open app
2. Enter daily data
3. Receive rewards/recap
4. View progress
5. Plan adjustments

## Key Documentation
- Product specification: [`SPEC.md`](./SPEC.md)
- Feature inventory: [`FEATURES.md`](./FEATURES.md)
- Delivery plan: [`ROADMAP.md`](./ROADMAP.md)
- Decision history and open decisions: [`DECISIONS.md`](./DECISIONS.md)
- Contribution rules: [`CONTRIBUTING.md`](./CONTRIBUTING.md)

## Status
Active MVP vertical slice: core daily tracking, progression, and review workflows are implemented and running locally.

## Current Implemented State
- Daily entry form with edit-window checks.
- Post-submit recap modal.
- Dashboard trends/averages and streaks.
- Quest acceptance plus progress tracking.
- Weekly/monthly review capture.
- Local settings and account reset.
- LocalStorage persistence model via `liferpg.m1.vslice`.

## Planned Next
The roadmap still includes future expansion work beyond the current vertical slice, including deeper progression systems, broader analytics, and post-MVP platform capabilities. See [`ROADMAP.md`](./ROADMAP.md) for sequencing and [`DECISIONS.md`](./DECISIONS.md) for open planning items.
