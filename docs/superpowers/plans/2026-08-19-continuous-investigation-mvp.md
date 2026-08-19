# Continuous Investigation MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the current one-click case prototype into a persistent, multi-step local investigation loop.

**Architecture:** `game.ts` owns case state and authoritative event results. `parser.ts` maps local text to an existing action only. `save.ts` persists the complete game, while `App.tsx` renders and dispatches actions without inventing rules.

**Tech Stack:** TypeScript, React, Vitest, Zod, idb, fake-indexeddb, Vite PWA.

**Spec:** `docs/superpowers/specs/2026-08-19-continuous-investigation-mvp-design.md`

## Global Constraints

- No model API, network dependency, copied IP, or new runtime dependency.
- Only committed game actions change state; free text maps to an existing action or is rejected.
- Each production change follows a red-green test cycle.
- Persist state and log after every UI action; load failure creates a new game.

---

### Task 1: Case state machine and consequences

**Files:** Modify `src/core/game.ts`; modify `src/core/game.test.ts`.

**Interfaces:** Produce `startCase(game, caseId)`, `chooseApproach(game, caseId, approachId)`, `CaseState`, and `Game.caseStates`.

- [ ] Write tests proving a case starts at `contact`, a safe approach costs 15 minutes, a risky approach costs 30 minutes and raises legal attention, and an approach resolves its case.
- [ ] Run `pnpm test -- src/core/game.test.ts`; expect missing exports.
- [ ] Implement immutable case states, deterministic D100 outcomes, clue quality, `legalAttention`, and committed log entries.
- [ ] Run the targeted test and full test suite; expect all green.

### Task 2: Local free-action parser

**Files:** Create `src/core/parser.ts`; create `src/core/parser.test.ts`.

**Interfaces:** Produce `parseLocalAction(input: string, game: Game): { action: ActionId | null; message: string }`.

- [ ] Write tests mapping `检查药箱` to the medical case, `仓库` to ledger, and unknown text to `null` without state mutation.
- [ ] Run targeted test; expect missing module.
- [ ] Implement normalized keyword mapping restricted to currently available cases.
- [ ] Run targeted and full tests; expect all green.

### Task 3: Persist and restore the complete run

**Files:** Modify `src/storage/save.ts`; modify `src/storage/save.test.ts`.

**Interfaces:** `saveGame(game)` and `loadGame(): Promise<Game | undefined>` retain case states and event log.

- [ ] Extend save test with a started case and chosen approach.
- [ ] Run targeted test; expect failure before state-machine persistence exists.
- [ ] Keep one IndexedDB record keyed `current`; return undefined for absent save.
- [ ] Run targeted and full tests; expect all green.

### Task 4: Playable React loop

**Files:** Modify `src/App.tsx`, `src/App.test.tsx`, `src/styles.css`.

**Interfaces:** UI calls only `startCase`, `chooseApproach`, parser and save/load functions.

- [ ] Write tests for starting a case, choosing safe/risky actions, visible consequences, free-input rejection, and restore indicator.
- [ ] Run targeted test; expect missing buttons/text.
- [ ] Implement case panel, event log, risk meters, local free-action input, async save/load with safe fallback, and responsive styles.
- [ ] Run full tests and production build; expect all green.

### Task 5: End-to-end acceptance

**Files:** Modify `README.md`; modify `AI原生持续世界RPG-V0.1开发执行日志.md`.

- [ ] Add commands for dev, test, build, reset storage, and a manual three-case acceptance script.
- [ ] Run `pnpm test` and `pnpm build`; record actual results.
- [ ] Review the spec acceptance list against tests and manual flow; list only remaining known limits.
