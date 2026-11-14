# AGENTS.md

Follow this on every change.

## Karpathy principles (coding)

Derived from Andrej Karpathy’s notes on LLM coding failure modes.

### 1. Think before coding

Do not assume. Do not hide confusion. Surface tradeoffs.

- State assumptions. If uncertain, ask.
- If the request has more than one reading, list them. Do not pick silently.
- If a simpler approach exists, say so and push back.
- If something is unclear, stop, name the gap, and ask.

### 2. Simplicity first

Write the minimum code that solves the problem. Nothing speculative.

- No features beyond the request.
- No abstractions for single-use code.
- No unused configurability.
- No error handling for impossible cases.
- If 200 lines could be 50, rewrite it.

### 3. Surgical changes

Touch only what you must. Clean up only your own mess.

- Do not “improve” adjacent code, comments, or formatting.
- Do not refactor unrelated working code.
- Match existing style.
- Remove imports/locals/functions that *your* change made unused.
- Mention pre-existing dead code; do not delete it unless asked.

Every changed line should trace to the user’s request.

### 4. Goal-driven execution

Define success criteria. Loop until verified.

- “Add validation” → tests for invalid input, then make them pass.
- “Fix the bug” → reproducing test, then make it pass.
- “Refactor X” → tests pass before and after.

For multi-step work, plan as `step → verify`. Weak goals like “make it work” are not enough.

## Frontend Architecture & Standards

### Vue 3 & TypeScript

- Composition API + `<script setup>` + TypeScript.
- Components: `PascalCase` files (e.g. `TransitMap.vue`, `MetricCard.vue`).
- Stores: Pinia stores named `useXxxStore` (e.g. `useTransitStore.ts`).
- Service Layer: Centralized API / data service (e.g. `transitApi.ts`) is the single source for data fetching. Views and components must not call `fetch` directly.
- Scoped Styling: Component styles must be scoped and responsive.
- Types: Centralized type definitions in `src/types/`.

### Git and secrets

- Commit `AGENTS.md`, source code, public data artifacts, and documentation.
- Never commit `.env`, API keys, or raw scraping scripts (`scrapers/` is gitignored).
- Always verify build passing (`npm run build`) before pushing.

## Redundancy

- One way to do each thing.
- Share TypeScript interfaces; do not duplicate data models.
- Prefer deleting dead code over commenting it out.
- Do not add external packages unless standard browser APIs or existing libraries cannot fulfill the requirement.
