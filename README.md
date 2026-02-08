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


## Local-First Instrumentation (MVP)
A lightweight analytics layer is implemented in `assets/js/analytics.js` with a single `track(eventName, payload)` entrypoint and a typed event catalog.

### Event taxonomy
- `daily_submit_success`
- `daily_submit_fail` (categories: `missing_date`, `read_only`, `hard_validation`)
- `review_saved`
- `review_edited`
- `review_deleted`
- `quest_accepted`
- `tab_switched`

### Storage and diagnostics
- Analytics are persisted locally in LocalStorage (`liferpg.analytics.v1`) with:
  - `schemaVersion`
  - `eventName`
  - `timestamp` (ISO UTC)
  - typed `payload`
- In-app diagnostics are available under **Settings → Analytics Diagnostics (Local)** for:
  - refresh snapshot,
  - copy JSON,
  - clear event log.
- Console diagnostics are also available through:
  - `window.lifeRpgAnalytics.export()`
  - `window.lifeRpgAnalytics.exportJson()`
  - `window.lifeRpgAnalytics.exportToConsole()`
  - `window.lifeRpgAnalytics.clear()`

### Privacy expectations
- No analytics network transport is implemented.
- Events remain on-device unless the user manually copies/exports JSON.
- Payloads should avoid free-form sensitive content; use categories/counts/ids.
