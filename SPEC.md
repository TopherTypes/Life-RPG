# LifeRPG Product Specification (Working Draft)

## 1. Purpose
LifeRPG is a personal, solo web application that gamifies daily self-tracking into progression systems that improve consistency, motivation, and self-awareness.

## 2. Product Goals
### Primary goal
- Build long-term consistency in daily habit tracking.

### Secondary goals
- Provide motivating progression feedback.
- Improve user self-awareness via analytics and reviews.

### MVP success metric
- Daily completion rate.

## 3. Target User
- Primary user profile for MVP: solo personal user (project owner).

## 4. Product Principles
1. Fast daily input, deeper reflective analysis.
2. Progress feedback should be engaging but not manipulative.
3. Gentle but fair behavior design.
4. Anti-burnout by default.
5. Scope discipline over feature sprawl.

## 5. Functional Requirements (MVP)

### 5.1 Daily Entry
- System must allow one daily entry per date.
- System must collect required metrics:
  - calories in
  - hours of sleep
  - mood
  - steps
  - exercise
- Data input is manual only.

### 5.2 Daily Entry Timing
- UX should optimize for 3–5 minute completion.

### 5.3 Edit Policy
- User may edit a day within 24 hours after the day itself.
- After window expiry, entry becomes read-only.

### 5.4 Progression Feedback
- After submit, system shows recap with progression outcomes.
- Recap should include XP/stat/quest change indicators.
- Formula details for MVP are TBD.

### 5.5 Quests
- System supports daily, weekly, and long-term quests.
- Quest creation is template-driven.
- Quests support deadlines.
- Milestones are optional/TBD.
- Quest dependency chains are out of scope.

### 5.6 Reviews
- Weekly guided review required (final structure TBD).
- Monthly guided review required (final structure TBD).

### 5.7 Data Persistence
- LocalStorage is the only data store in MVP.

### 5.8 Platform
- Web-only deployment via GitHub Pages.

## 6. Non-Functional Requirements
- App should feel lightweight and fast on modern browsers.
- Data model should be designed for future migration beyond LocalStorage.
- Logic should be modular so progression formulas can be tuned safely.

## 7. Explicit Exclusions (MVP)
- AI features.
- Social features.
- External integrations.
- Authentication.
- Monetization.

## 8. Open Specification Questions (TBD)
1. Attribute/stat taxonomy.
2. Skill definitions and count.
3. XP formula and exact level curve.
4. Soft-penalty model for missed days.
5. Rest-day anti-abuse mechanism.
6. Recovery/comeback mechanics.
7. Quest failure and partial credit rules.
8. Data validation and anomaly handling rules.
9. Mood input scale design.
10. Analytics event instrumentation strategy.

## 9. Acceptance Criteria for MVP (Draft)
- User can complete daily entry with required metrics.
- Entry data persists across page reloads/browser restarts (same device/browser profile).
- User receives a recap after submission.
- User can review trend/progress summaries.
- User can perform weekly and monthly review workflows.
- Core loop is usable daily without external tools.

> Note: acceptance criteria are draft and will be finalized once open mechanics decisions are resolved.
