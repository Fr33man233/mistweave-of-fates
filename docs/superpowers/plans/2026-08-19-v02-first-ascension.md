# V0.2 First Ascension Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add character cards, two hidden pathway investigations, ritual preparation, and one complete first ascension to Mistweave of Fates.

**Architecture:** Extend `Game` with a player profile and one active character card. Keep creation, clue progression, materials, and ascension as deterministic committed actions; React only projects state and submits action IDs. IndexedDB persists the entire extended game object.

**Tech Stack:** TypeScript, React, Vitest, Zod, idb, fake-indexeddb, Vite PWA.

**Spec:** `docs/superpowers/specs/2026-08-19-v02-first-ascension-design.md`

**Baseline evidence:** `Mistweave-of-Fates-V0.1验收与发布记录.md`

## Global Constraints

- No external model, network dependency, copyrighted pathway content, or new runtime dependency.
- Profile has exactly three non-refundable card slots; death is permanent.
- Ordinary investigation cannot kill a character; only explicit high-risk and ascension actions may do so.
- Ordinary spirituality is 5/5; first ascension makes it 8/8.
- Abilities spend 1–3 spirituality declared before D100 resolution.

---

### Task 1: Character cards and profile

**Files:** Modify `src/core/schema.ts`, `src/core/game.ts`; modify `src/core/schema.test.ts`; create `src/core/profile.test.ts`.

**Interfaces:** Produce `createProfile()`, `createCharacter(profile, occupationId, intent)`, `activeCharacter(game)`; `Profile` holds `slotLimit`, `characters`, `deceasedIds`, and `activeCharacterId`.

- [ ] Write failing tests for four legal occupations, a 3-slot limit, initial spirituality 5/5, and rejection after all slots are used.
- [ ] Run `pnpm test -- src/core/profile.test.ts`; expect missing profile exports.
- [ ] Implement Zod schemas and immutable creation action.
- [ ] Run targeted and full tests.

**执行状态（2026-08-19）：** 角色档案与创建的第一轮 TDD 已完成定向绿灯；尚未接入 `Game` 的活动角色读取与完整回归，故 Task 1 保持进行中。

### Task 2: Hidden dual-path clue state

**Files:** Modify `src/core/game.ts`; modify `src/core/game.test.ts`.

**Interfaces:** Produce `recordMeaningfulEvent(game)`, `getPathwayTracks(game)` and tracks `observer`, `hound` with `hidden | hinted | trusted | prepared | ascended`.

- [ ] Write failing tests proving tracks appear after three resolved cases, both remain investigable, and only behaviour weights choose their order.
- [ ] Run targeted test; expect missing track state.
- [ ] Implement deterministic weighting from occupation, intent, risk choices, and existing case results.
- [ ] Run targeted and full tests.

### Task 3: Materials, ritual, and ascension resolution

**Files:** Create `src/core/ascension.ts`; create `src/core/ascension.test.ts`; modify `src/core/game.ts`.

**Interfaces:** Produce `advanceTrack(game, pathway)`, `prepareRitual(game, pathway, approach)`, `attemptAscension(game, pathway, seed)`.

- [ ] Write failing tests for missing prerequisites, safe/risky material outcomes, successful 5→8 spirituality transition, costly success, nonlethal failure, and catastrophic permanent death.
- [ ] Run `pnpm test -- src/core/ascension.test.ts`; expect missing module.
- [ ] Implement four-result D100 ascension resolution with recorded preparation, pollution, legal attention, and immutable death state.
- [ ] Run targeted and full tests.

### Task 4: First abilities and declared overcharge

**Files:** Create `src/core/abilities.ts`; create `src/core/abilities.test.ts`; modify `src/core/game.ts`.

**Interfaces:** Produce `useAbility(game, pathway, charge: 1 | 2 | 3, seed)` returning a committed result; observer and hound cannot generate clues directly.

- [ ] Write failing tests for 1–3 point predeclared spend, insufficient spirituality rejection, observer pollution pressure, hound injury/sanity pressure, and replay determinism.
- [ ] Run targeted test; expect missing module.
- [ ] Implement ability checks and state consequences.
- [ ] Run targeted and full tests.

### Task 5: Persistent V0.2 UI

**Files:** Modify `src/App.tsx`, `src/App.test.tsx`, `src/styles.css`, `src/storage/save.test.ts`.

**Interfaces:** UI invokes only profile, track, ritual, ascension, and ability actions; save/load keeps cards, tracks, materials, rituals, and death.

- [ ] Write failing UI tests for initial character creation, two hidden tracks after three events, ritual risk preview, ascension confirmation, and disabled deceased card.
- [ ] Run `pnpm test -- src/App.test.tsx`; expect missing controls.
- [ ] Implement focused creation, profile, track, ritual, ascension, ability, and death panels plus automatic save/restore.
- [ ] Run full tests and build.

### Task 6: Release acceptance

**Files:** Modify `README.md`, `Mistweave-of-Fates-V0.1开发执行日志.md`.

- [ ] Add bilingual V0.2 gameplay and feedback instructions.
- [ ] Run `pnpm test` and `pnpm build`; record actual totals.
- [ ] Push only after local tests, production build, and Pages workflow are verified.
