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

- [x] Write failing tests for four legal occupations, a 3-slot limit, initial spirituality 5/5, and rejection after all slots are used.
- [x] Run `pnpm test -- src/core/profile.test.ts`; expect missing profile exports.
- [x] Implement Zod schemas and immutable creation action.
- [x] Run targeted and full tests.

**执行状态（2026-08-19）：** 已完成。`Game` 持有 `Profile`，`activeCharacter(game)` 从 `activeCharacterId` 解析活动角色；`profileSchema` 校验三槽档案。新增 Game 集成、运行时非法职业和四职业创建覆盖；全量测试与生产构建均已复核。

### Task 2: Hidden dual-path clue state

**Files:** Modify `src/core/game.ts`; modify `src/core/game.test.ts`.

**Interfaces:** Produce `recordMeaningfulEvent(game)`, `getPathwayTracks(game)` and tracks `observer`, `hound` with `hidden | hinted | trusted | prepared | ascended`.

- [x] Write failing tests proving tracks appear after three resolved cases, both remain investigable, and only behaviour weights choose their order.
- [x] Run targeted test; expect missing track state.
- [x] Implement deterministic weighting from occupation, intent, risk choices, and existing case results.
- [x] Run targeted and full tests.

**执行状态（2026-08-19）：** 已完成并经复审。三次有意义事件后，观察者与猎犬同时从 `hidden` 转为 `hinted`；职业、初始意愿、安全/冒险行为和已提交的调查结果只确定 `hintOrder`，两条线索继续并行可调查。计数只接受新的已提交事件，事件日志使用活动角色 ID；权重和转换仅在确定性 `Game` 内结算。技能使用信号将在 Task 4 的真实能力调用中接入。

### Task 3: Materials, ritual, and ascension resolution

**Files:** Create `src/core/ascension.ts`; create `src/core/ascension.test.ts`; modify `src/core/game.ts`.

**Interfaces:** Produce `advanceTrack(game, pathway)`, `prepareRitual(game, pathway, approach)`, `attemptAscension(game, pathway, seed)`.

- [x] Write failing tests for missing prerequisites, safe/risky material outcomes, successful 5→8 spirituality transition, costly success, nonlethal failure, and catastrophic permanent death.
- [x] Run `pnpm test src/core/ascension.test.ts`; expect missing module.
- [x] Implement four-result D100 ascension resolution with recorded preparation, pollution, legal attention, and immutable death state.
- [x] Run targeted and full tests.

**执行状态（2026-08-19）：** 已完成并经本地独立复审。每条轨道依次执行 `hinted → trusted → prepared → ascended`；安全/冒险准备分别记录材料与质量，冒险准备增加法律关注和污染。首次晋升使用种子化 D100 产生成功、带代价成功、普通失败和灾难失败，并把骰点、准备质量和结果写入事件证据；成功将灵性提升到 8/8 并锁定所选路径，另一条保持未完成，普通失败可重试，灾难失败永久失效当前角色卡。定向 7 项、全量 41 项测试及生产构建均通过。

### Task 4: First abilities and declared overcharge

**Files:** Create `src/core/abilities.ts`; create `src/core/abilities.test.ts`; modify `src/core/game.ts`.

**Interfaces:** Produce `useAbility(game, pathway, charge: 1 | 2 | 3, seed)` returning a committed result; observer and hound cannot generate clues directly.

- [x] Write failing tests for 1–3 point predeclared spend, insufficient spirituality rejection, observer pollution pressure, hound injury/sanity pressure, and replay determinism.
- [x] Run `pnpm test src/core/abilities.test.ts`; expect missing module.
- [x] Implement ability checks and state consequences.
- [x] Run targeted and full tests.

**执行状态（2026-08-19）：** 已完成并经本地独立复审。观察者“痕迹感知”和猎犬“危险追迹”在调用前声明 1–3 点总灵性消耗，以种子化双 D100 分别结算能力与加注压力；额外加注同时提高成功率和污染/伤势/理智风险。所有消耗、骰点和后果进入权威事件与 `abilityUses`，同一输入可重放，能力不写入线索或推进轨道；普通能力伤势最低保留 1 HP，不越过既定死亡边界。定向 9 项、全量 50 项测试及生产构建均通过。

### Task 5: Persistent V0.2 UI

**Files:** Modify `src/App.tsx`, `src/App.test.tsx`, `src/styles.css`, `src/storage/save.test.ts`.

**Interfaces:** UI invokes only profile, track, ritual, ascension, and ability actions; save/load keeps cards, tracks, materials, rituals, and death.

- [x] Write failing UI tests for initial character creation, two hidden tracks after three events, ritual risk preview, ascension confirmation, and disabled deceased card.
- [x] Run `pnpm test src/App.test.tsx`; expect missing controls.
- [x] Implement focused creation, profile, track, ritual, ascension, ability, and death panels plus automatic save/restore.
- [x] Run full tests and build.

**执行状态（2026-08-19）：** 已完成并经隔离复审。React 仅维护表单、选择和确认框等瞬时状态，角色创建、调查、轨道、准备、服药与能力均调用确定性核心动作；成功晋升后另一轨道保留只读未完成记录。IndexedDB 加载使用 Zod 验证和跨字段一致性门禁，保存/恢复角色、双轨、材料、仪式、能力与永久死亡，并为真实 V0.1 缺失字段和已完成三案状态提供确定性迁移。定向 3 个文件、21 项测试，全量 10 个文件、56 项测试及生产构建均通过。

### Task 6: Release acceptance

**Files:** Modify `README.md`, `Mistweave-of-Fates-V0.1开发执行日志.md`.

- [x] Add bilingual V0.2 gameplay and feedback instructions.
- [x] Run `pnpm test` and `pnpm build`; record actual totals.
- [x] Push only after local tests, production build, and Pages workflow are verified.

**执行状态（2026-08-19）：** 已完成并正式发布。`pnpm test` 为 11 个测试文件、57 项通过；普通生产构建与 Actions 子路径构建均通过，manifest 的 `start_url`/`scope` 为 `/mistweave-of-fates/`。提交 `fd6adab` 已推送至 `main`，GitHub Pages 工作流 `32260082986` 成功；公开站点使用空白浏览器档案完成建角、三案、双线、风险预览、观察者准备、首次服药及刷新恢复，确定性结果为成功（D100 41），390px 无横向溢出且运行时/4xx/5xx 网络错误为零。Task 6 发布门关闭。

## 下一版本反馈池（不阻断 V0.2 发布）

2026-08-19 试玩反馈确认以下问题进入下一版本设计，不在 V0.2 发布前扩张实现：任务结算需要更明确的结果反馈；能力应绑定具体任务或事件；多途径服药需要冲突与严重后果；首次晋升失败后不得重复服药；需要返回主界面并消除理智归零等卡关路径；角色创建至少补充姓名与性别，复杂背景继续延期。下一版本必须重新执行全栈预审、确定数据迁移和验收边界后再开发。

UI 规则：V1.0 公测前沿用当前简洁、简便的工业神秘风格，只投入保障信息、交互和响应式可用所需的资源；V1.0 公测发布后再根据公开反馈专项寻找美术资源并评估系统性 UI 升级。V2.0 暂定为正式上线版。

版本边界：V0.2 的完成只代表首次晋升规则系统验证范围关闭，当前未达到 MVP。下一版本仍属于 V0.x pre-MVP 收敛阶段，必须按[版本定义与发布门](../../版本定义与发布门.md)优先关闭真实调查、材料获取、事件内能力价值和失败/恢复路径，不能直接以 V1.0 名义扩大内容。
