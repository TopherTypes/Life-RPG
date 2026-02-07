# Contributing to LifeRPG

This project is currently a solo-built project with Codex-assisted development.

## Core Rules
1. **Follow the product docs first** (`SPEC.md`, `FEATURES.md`, `DECISIONS.md`, `ROADMAP.md`).
2. **Do not silently expand scope**. Any new idea must be added as deferred/TBD unless explicitly approved.
3. **Favor simplicity and maintainability** over novelty.
4. **Preserve privacy-first architecture** (no social assumptions, no external telemetry by default).

## Rules for Codex Contributions
1. Read relevant docs before editing.
2. If requirements are ambiguous, implement the smallest safe increment and mark assumptions clearly.
3. For every unresolved requirement, add/update a clear TBD entry in `DECISIONS.md`.
4. Keep commits focused and logically scoped.
5. Do not introduce AI/integrations/auth unless explicitly requested.
6. Respect MVP boundaries and deferred feature list.
7. Keep LocalStorage-first constraints in mind for MVP.

## Documentation Standards
1. Update documentation when behavior changes.
2. Record decision rationale, not just outcomes.
3. Keep sections concise, skimmable, and versionable.
4. Use consistent terminology:
   - “daily entry” for logging flow
   - “recap” for post-entry summary
   - “review” for weekly/monthly reflection

## Code Standards (for future implementation)
1. Comment non-obvious logic with concise, industry-standard comments.
2. Prefer self-explanatory naming and pure helper functions for formulas.
3. Keep progression formulas centralized and configurable.
4. Add tests for business logic (XP, penalties, rest-day rules, quest progress).

## Pull Request Expectations
- Explain what changed and why.
- Identify risks and follow-up tasks.
- Note any new TBD decisions introduced.

## Out of Scope Without Explicit Approval
- Social features
- AI coaching
- External integrations
- Monetization systems
