# LifeRPG Feature Inventory

This document separates MVP, V1, and deferred features.

## MVP Features

### 1. Daily Entry System
- Single daily entry flow.
- Manual input for required metrics:
  - calories in
  - sleep hours
  - mood
  - steps
  - exercise
- Entry completion target: 3–5 minutes.

### 2. Edit Window
- Daily entries can be edited for up to 24 hours after the day itself.

### 3. Progression Recap
- Post-entry “end of encounter” style recap including:
  - XP gains
  - skill/stat progress
  - quest progress
- Recap hierarchy: skill XP gains → attribute progress → quest progress.
- Controlled by **Enable recap animations** in Settings.

### 4. Progress Tracking
- Core analytics/trends to support self-awareness and planning.
- Review-oriented experience (10–20 minute planning sessions).
- Optional dashboard guidance via **Show guidance tips on dashboard** setting.
- Optional condensed layout via **Compact dashboard cards** setting.

### 5. Quest Framework (Foundational)
- Daily, weekly, and long-term quest hierarchy.
- Template-driven quest setup.
- Deadlines supported.
- MVP quests are simple counter-based templates (e.g., complete 10 exercise sessions, complete 30 daily logs).
- Quest progress is gated by acceptance: users must click **Accept Quest** in Quest Log before counters increment (internally tracked with `acceptedQuests`).
- Milestones are optional and deferred for post-MVP tuning.

### 6. Structured Reviews (Weekly + Monthly)
- Guided forms for **Weekly Review** and **Monthly Review** with structured prompts: Wins, Blockers, Next Action, Confidence.
- Persistence for both review types with local save flows: **Save Weekly Review** and **Save Monthly Review**.
- Review history supports lifecycle operations: list, **Edit**, and **Delete**.

### 7. Validation Model
- Two-tier validation on daily entries:
  - Hard errors block saving and surface field-level + summary feedback.
  - Soft anomaly warnings allow save but flag outlier values for review.
- Anomaly detection includes high-threshold checks (sleep, steps, calories, exercise minutes) and stores flags with the entry.

### 8. Storage, Profile, and Platform
- Web-only app.
- LocalStorage-only persistence.
- No authentication.
- No integrations.
- Local profile reset via **Reset to New Account**, which clears entries/reviews/settings and returns to a fresh local profile state.

## V1 Candidate Features

### 1. Adaptive Recommendations
- Dynamic target suggestions based on user history.

### 2. Transparency Controls
- Optional setting for clear/verbose explanation mode.
- Default remains “mystique” mode.

### 3. Enhanced Planning Support
- Better trend-to-plan guidance and action prompts.

## Deferred (Post-V1 or Later)
- AI coaching
- Social/community features
- External integrations
- Loot/items/randomized reward systems
- Classes/archetypes
- Respec systems
- Negative behavior tracking
- Custom metrics

## Feature Notes Requiring Decision
- Soft-penalty and rest-day mechanics (MVP Plus).
- Mental health boundary/disclaimer language.
