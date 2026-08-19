# Mistweave of Fates（灰雾织命）：V0.1 TypeScript 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** 构建一个可在浏览器本地运行的 V0.1 垂直切片：玩家能完成三个持续关联的任务，所有判定、状态变更和存档由确定性 TypeScript 规则核心管理。

**Architecture:** React 只负责呈现权威状态和提交输入；src/core 负责状态、随机数、判定、事件和归约；src/content 提供经 Zod 校验的瓦伦港内容包；src/storage 将不可变事件日志和快照存入 IndexedDB。AI 层只定义 ActionInterpreter 接口并提供确定性开发实现，不调用任何外部模型。

**Tech Stack:** Node.js 20.19+、TypeScript、React、Vite、Zod、Vitest、React Testing Library、fake-indexeddb、idb、vite-plugin-pwa。

**Spec:** [MVP 系统设计基线](./AI原生持续世界RPG-MVP系统设计-v0.1.md)、[V0.1 规则与内容数据合同](./AI原生持续世界RPG-V0.1规则与内容数据合同.md)、[V0.1 最小内容样例](./AI原生持续世界RPG-V0.1最小内容样例.md)。

## 全局约束

- V0.1 运行形态为 TypeScript + React + Vite 本地 Web/PWA；浏览器是唯一客户端。
- 权威事实只能由 reducer 接收 CommittedEvent 后改变；React、AI 适配器和叙事文本无权直接写状态。
- 所有随机结果由可重放的 SeededRng 生成，并写入事件证据。
- 正常回合不得依赖在线模型；ActionInterpreter 的默认实现只解析已知建议动作和固定样例。
- 存档使用 IndexedDB；每次提交先写事件，再写快照；快照带 schemaVersion、eventCursor 和 stateHash。
- 初版仅加载原创瓦伦港测试内容；不创建或分发受保护作品的名称、角色、组织、文本或美术。
- 第一版不做用户 API 密钥、真实 LLM、多人、网络同步、跨城旅行、动态市场或高序列力量。
- 代码、文案和测试全部使用 UTF-8；标识符使用稳定英文 id，展示文案集中在内容对象中。
- 任务完成前运行 npm test、npm run build 和 npm run lint。
- 当前工作区尚未初始化 Git；任务 1 创建本地仓库后，每个任务完成时提交一次。

---

## 前置环境检查（已完成）

- 复用 Codex 随附的 Node `v24.19.0` 与 pnpm `v11.19.0`，不额外安装全局运行时；项目命令需显式使用这一套运行时或临时注入它们的路径。
- Git 已初始化为本地仓库并设为 `main`；因沙箱创建的 `.git` 与 Windows 登录账户不同，已仅对这个工作区配置 Git 的 `safe.directory`，后续以可写的 Windows 账户执行 Git 检查点。
- 验收：`node --version`、`pnpm --version`、`git status --short` 均可成功执行；工作区仅包含设计文档，没有半成品脚手架。

当前成本为一次本地环境复核；预期收益是避免重复安装 Node、避免 Git 失败在实现后才暴露；验证方式为每次依赖安装与提交前重跑以上三项检查。

## 文件结构

| 路径 | 责任 |
|---|---|
| package.json | 脚本、依赖与 Node 版本约束 |
| vite.config.ts | Vite、Vitest、PWA 配置 |
| src/core/schema.ts | Zod 运行时 Schema 与导出 TypeScript 类型 |
| src/core/rng.ts | 可重放随机数与随机证据 |
| src/core/checks.ts | D100 判定、难度和成功等级 |
| src/core/reducer.ts | 事件归约、不可变量验证和状态哈希 |
| src/core/actions.ts | 建议动作到行动计划、结算和提交 |
| src/core/game.ts | 创建世界、执行回合、生成展示投影 |
| src/content/valenport.ts | 瓦伦港地点、NPC、三例事件模板与显示文案 |
| src/ai/interpreter.ts | ActionInterpreter 接口和开发用确定性实现 |
| src/storage/save-store.ts | IndexedDB 事件与快照读写 |
| src/ui/*.tsx | 游戏壳、HUD、场景、任务、操作、日志 |
| src/styles/app.css | 原创哥特工业风基础布局与状态样式 |
| src/**/*.test.ts | 规则、内容、持久化和 UI 的单元/集成测试 |
| src/test/setup.ts | jsdom、fake-indexeddb 和 Testing Library 初始化 |

---

### Task 1: 初始化 TypeScript PWA 工程与测试基线

**Files:**

- Create: package.json
- Create: vite.config.ts
- Create: tsconfig.json
- Create: index.html
- Create: src/main.tsx
- Create: src/test/setup.ts
- Create: src/app-smoke.test.tsx
- Create: src/App.tsx
- Create: src/styles/app.css
- Create: .gitignore

**Interfaces:**

- Produces: npm run dev、npm test、npm run build、npm run lint 均可执行。
- Produces: App 组件可被 React Testing Library 渲染。

- [ ] **Step 1: 初始化本地 Git 仓库和 Vite React TypeScript 项目**

Run:

```bash
git init
npm create vite@latest . -- --template react-ts
npm install
```

Expected: package.json、src/main.tsx、src/App.tsx 和 vite.config.ts 存在。

- [ ] **Step 2: 安装运行时与测试依赖**

Run:

```bash
npm install zod idb
npm install -D vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event fake-indexeddb eslint @eslint/js typescript-eslint vite-plugin-pwa
```

Expected: package.json 的 dependencies 包含 zod、idb；devDependencies 包含 vitest、jsdom、Testing Library、fake-indexeddb 和 vite-plugin-pwa。

- [ ] **Step 3: 写失败的渲染测试**

Create src/app-smoke.test.tsx:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("App", () => {
  it("renders the V0.1 game shell", () => {
    render(<App />);
    expect(screen.getByRole("main", { name: "瓦伦港游戏界面" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: 配置 Vitest、PWA 和最小 App 实现**

Set vite.config.ts to export defineConfig with React plugin, VitePWA configured with registerType autoUpdate, manifest name 瓦伦港：持续世界 RPG, display standalone, and test.environment jsdom with setupFiles src/test/setup.ts.

Create src/test/setup.ts:

```ts
import "@testing-library/jest-dom/vitest";
import "fake-indexeddb/auto";
```

Create src/App.tsx:

```tsx
export default function App() {
  return <main aria-label="瓦伦港游戏界面">正在载入瓦伦港……</main>;
}
```

Set package.json scripts:

```json
{
  "dev": "vite",
  "build": "tsc -b && vite build",
  "test": "vitest run",
  "test:watch": "vitest",
  "lint": "eslint ."
}
```

- [ ] **Step 5: 验证工程基线**

Run:

```bash
npm test
npm run build
npm run lint
```

Expected: 三条命令退出码为 0。

- [ ] **Step 6: 提交任务**

Run:

```bash
git add package.json package-lock.json vite.config.ts tsconfig.json index.html src .gitignore
git commit -m "chore: initialize V0.1 web client"
```

---

### Task 2: 建立权威状态 Schema 与原创内容包

**Files:**

- Create: src/core/schema.ts
- Create: src/content/valenport.ts
- Create: src/core/schema.test.ts
- Create: src/content/valenport.test.ts

**Interfaces:**

- Produces: parseWorldState(value: unknown): WorldState。
- Produces: valenportContent: ContentPack。
- Produces: createInitialWorld(content: ContentPack, seed: string): WorldState。

- [ ] **Step 1: 写失败的 Schema 与内容校验测试**

Create src/core/schema.test.ts:

```ts
import { describe, expect, it } from "vitest";
import { parseWorldState } from "./schema";

describe("parseWorldState", () => {
  it("rejects an event cursor without a schema version", () => {
    expect(() => parseWorldState({ eventCursor: 0 })).toThrow();
  });
});
```

Create src/content/valenport.test.ts:

```ts
import { describe, expect, it } from "vitest";
import { createInitialWorld, valenportContent } from "./valenport";

describe("valenportContent", () => {
  it("creates a world containing all three V0.1 events", () => {
    const world = createInitialWorld(valenportContent, "seed-test");
    expect(Object.keys(world.eventInstances)).toEqual(
      expect.arrayContaining([
        "event_misdelivered_medical_case",
        "event_sealed_warehouse_ledger",
        "event_night_whistle",
      ]),
    );
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
npm test -- src/core/schema.test.ts src/content/valenport.test.ts
```

Expected: FAIL because the exported functions do not exist.

- [ ] **Step 3: 实现最小 Schema**

Create src/core/schema.ts with Zod schemas for WorldTime, CharacterState, NpcState, Clue, EventInstance, CommittedEvent and WorldState. Export only these public types and functions:

```ts
export type WorldState = z.infer<typeof WorldStateSchema>;
export type CommittedEvent = z.infer<typeof CommittedEventSchema>;
export type ContentPack = z.infer<typeof ContentPackSchema>;
export function parseWorldState(value: unknown): WorldState {
  return WorldStateSchema.parse(value);
}
```

WorldStateSchema must require schemaVersion 0.1.0, worldId, worldSeed, eventCursor, worldTime, characters, npcStates, eventInstances, clues, lawStates and stateHash. Event cursor must be a nonnegative integer. The initial characters record must include char_player with HP, sanity, spirituality, pollution and pathwayState set to null.

- [ ] **Step 4: 实现瓦伦港内容包**

Create src/content/valenport.ts. Export valenportContent and createInitialWorld. Include the four locations, six NPCs, and the three event IDs from the minimum content samples. Each event instance starts as active and has its documented clocks. Use only original V0.1 display text.

```ts
export function createInitialWorld(content: ContentPack, seed: string): WorldState {
  return {
    schemaVersion: "0.1.0",
    worldId: "world_valenport_demo",
    worldSeed: seed,
    eventCursor: 0,
    worldTime: { worldDay: 1, hour: 8, minute: 0 },
    characters: {
      char_player: {
        id: "char_player",
        name: "试玩角色",
        hp: { current: 9, max: 9 },
        sanity: { current: 51, max: 51 },
        spirituality: { current: 5, max: 5 },
        pollution: 0,
        pathwayState: null,
      },
    },
    npcStates: content.initialNpcs,
    eventInstances: content.initialEvents,
    clues: {},
    lawStates: {},
    stateHash: "uncomputed",
  };
}
```

- [ ] **Step 5: 验证 Schema 与内容包**

Run:

```bash
npm test -- src/core/schema.test.ts src/content/valenport.test.ts
```

Expected: PASS.

- [ ] **Step 6: 提交任务**

Run:

```bash
git add src/core/schema.ts src/core/schema.test.ts src/content/valenport.ts src/content/valenport.test.ts
git commit -m "feat: add validated Valenport content pack"
```

---

### Task 3: 实现可重放随机数、D100 判定和事件归约

**Files:**

- Create: src/core/rng.ts
- Create: src/core/checks.ts
- Create: src/core/reducer.ts
- Create: src/core/rng.test.ts
- Create: src/core/checks.test.ts
- Create: src/core/reducer.test.ts

**Interfaces:**

- Produces: SeededRng.nextD100(): { roll: number; evidence: string }。
- Produces: resolveD100(input: CheckInput, rng: SeededRng): CheckResult。
- Produces: reduceWorld(state: WorldState, events: CommittedEvent[]): WorldState。

- [ ] **Step 1: 写失败的随机数与判定测试**

Create src/core/rng.test.ts:

```ts
import { describe, expect, it } from "vitest";
import { SeededRng } from "./rng";

describe("SeededRng", () => {
  it("replays identical d100 rolls for an identical seed", () => {
    const first = new SeededRng("harbor-seed").nextD100();
    const second = new SeededRng("harbor-seed").nextD100();
    expect(first).toEqual(second);
  });
});
```

Create src/core/checks.test.ts:

```ts
import { describe, expect, it } from "vitest";
import { classifyRoll } from "./checks";

describe("classifyRoll", () => {
  it("classifies 10 against skill 60 as a hard success", () => {
    expect(classifyRoll(10, 60)).toBe("hard_success");
  });
});
```

Create src/core/reducer.test.ts:

```ts
import { describe, expect, it } from "vitest";
import { createInitialWorld, valenportContent } from "../content/valenport";
import { reduceWorld } from "./reducer";

describe("reduceWorld", () => {
  it("advances time only through a committed event", () => {
    const state = createInitialWorld(valenportContent, "seed");
    const next = reduceWorld(state, [{
      eventId: "evt_1",
      eventCursor: 1,
      eventType: "time_advanced",
      minutes: 15,
    }]);
    expect(next.worldTime.minute).toBe(15);
    expect(next.eventCursor).toBe(1);
  });
});
```

- [ ] **Step 2: 运行失败测试**

Run:

```bash
npm test -- src/core/rng.test.ts src/core/checks.test.ts src/core/reducer.test.ts
```

Expected: FAIL because the modules do not exist.

- [ ] **Step 3: 实现随机数与 D100**

Create SeededRng using a deterministic 32-bit hash plus mulberry32 generator. nextD100 must return an integer in [1, 100] and an evidence string of seed plus draw index. Create:

```ts
export type SuccessTier = "extreme_success" | "hard_success" | "success" | "failure" | "fumble";
export function classifyRoll(roll: number, skill: number): SuccessTier {
  if (roll <= Math.floor(skill / 5)) return "extreme_success";
  if (roll <= Math.floor(skill / 2)) return "hard_success";
  if (roll <= skill) return "success";
  if (roll >= 96 && skill < 50) return "fumble";
  if (roll === 100) return "fumble";
  return "failure";
}
```

Validate roll and skill are integers in [1, 100] and [0, 100].

- [ ] **Step 4: 实现 reducer 与不变量**

reduceWorld must reject non-contiguous event cursors, apply time_advanced, clue_created, npc_status_changed, law_incident_created and event_clock_advanced, recompute stateHash from stable JSON, and reject an event whose cursor is not state.eventCursor + 1.

```ts
export function reduceWorld(state: WorldState, events: CommittedEvent[]): WorldState {
  return events.reduce((current, event) => applyEvent(current, event), state);
}
```

- [ ] **Step 5: 运行规则测试**

Run:

```bash
npm test -- src/core/rng.test.ts src/core/checks.test.ts src/core/reducer.test.ts
```

Expected: PASS.

- [ ] **Step 6: 提交任务**

Run:

```bash
git add src/core/rng.ts src/core/checks.ts src/core/reducer.ts src/core/*.test.ts
git commit -m "feat: add deterministic rules and event reducer"
```

---

### Task 4: 将三例内容接入行动计划与结算器

**Files:**

- Create: src/core/actions.ts
- Create: src/core/game.ts
- Create: src/core/game.test.ts
- Modify: src/content/valenport.ts

**Interfaces:**

- Consumes: ContentPack、WorldState、SeededRng、reduceWorld。
- Produces: GameEngine.execute(actionId: SuggestedActionId): TurnResult。
- Produces: TurnResult 包含 committedEvents、state 和 suggestedActionIds。

- [ ] **Step 1: 写失败的日常任务、法律任务和异常任务测试**

Create src/core/game.test.ts:

```ts
import { describe, expect, it } from "vitest";
import { GameEngine } from "./game";
import { valenportContent } from "../content/valenport";

describe("GameEngine", () => {
  it("resolves the medicine task without adding pollution", () => {
    const engine = new GameEngine(valenportContent, "medicine-seed");
    const result = engine.execute("medicine_trace_carriage");
    expect(result.state.eventCursor).toBeGreaterThan(0);
    expect(result.state.characters.char_player.pollution).toBe(0);
  });

  it("creates discoverable evidence after illegal warehouse entry", () => {
    const engine = new GameEngine(valenportContent, "law-seed");
    const result = engine.execute("warehouse_break_in");
    expect(result.committedEvents.some((event) => event.eventType === "law_incident_created")).toBe(true);
  });

  it("never grants a pathway from the night whistle investigation", () => {
    const engine = new GameEngine(valenportContent, "whistle-seed");
    const result = engine.execute("whistle_safe_observation");
    expect(result.state.characters.char_player.pathwayState).toBeNull();
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
npm test -- src/core/game.test.ts
```

Expected: FAIL because GameEngine does not exist.

- [ ] **Step 3: 定义行动与结算接口**

Create src/core/actions.ts:

```ts
export type SuggestedActionId =
  | "medicine_trace_carriage"
  | "medicine_talk_to_ben"
  | "warehouse_request_records"
  | "warehouse_break_in"
  | "whistle_compare_times"
  | "whistle_safe_observation";

export type TurnResult = {
  committedEvents: CommittedEvent[];
  state: WorldState;
  suggestedActionIds: SuggestedActionId[];
  outcome: "success" | "partial_success" | "failure";
};

export type ResolvedAction = {
  outcome: TurnResult["outcome"];
  minutes: number;
  randomEvidence: string[];
  stateChanges: Array<Record<string, unknown>>;
};

export function getActionDefinition(id: SuggestedActionId): ActionDefinition;
export function resolveAction(
  action: ActionDefinition,
  state: WorldState,
  rng: SeededRng,
): ResolvedAction;
export function createCommittedEvents(
  state: WorldState,
  resolved: ResolvedAction,
): CommittedEvent[];
export function getAvailableActions(state: WorldState): SuggestedActionId[];
```

Each action definition must declare: required event id, minutes cost, required tags, one or more D100 checks, and outcome-specific event factories. No action may mutate WorldState directly.

- [ ] **Step 4: 实现 GameEngine**

Create src/core/game.ts:

```ts
export class GameEngine {
  state: WorldState;
  private readonly rng: SeededRng;

  constructor(private readonly content: ContentPack, seed: string) {
    this.state = createInitialWorld(content, seed);
    this.rng = new SeededRng(seed);
  }

  execute(actionId: SuggestedActionId): TurnResult {
    const action = getActionDefinition(actionId);
    const resolved = resolveAction(action, this.state, this.rng);
    const committedEvents = createCommittedEvents(this.state, resolved);
    this.state = reduceWorld(this.state, committedEvents);
    return {
      committedEvents,
      state: this.state,
      suggestedActionIds: getAvailableActions(this.state),
      outcome: resolved.outcome,
    };
  }
}
```

Implement event factories so that:

- medicine_trace_carriage advances 15 minutes and creates a route clue, never pollution;
- warehouse_break_in advances 20 minutes, creates a discoverable boot-print evidence entry and a law incident with weak identity linkage;
- whistle_safe_observation requires the night event, advances 30 minutes, may change sanity and pollution within the documented range, creates clue_resonance_pattern, and leaves pathwayState null.

- [ ] **Step 5: 运行三例规则测试**

Run:

```bash
npm test -- src/core/game.test.ts
```

Expected: PASS.

- [ ] **Step 6: 提交任务**

Run:

```bash
git add src/core/actions.ts src/core/game.ts src/core/game.test.ts src/content/valenport.ts
git commit -m "feat: make V0.1 sample events playable"
```

---

### Task 5: 实现 IndexedDB 事件日志和快照恢复

**Files:**

- Create: src/storage/save-store.ts
- Create: src/storage/save-store.test.ts
- Modify: src/core/game.ts

**Interfaces:**

- Produces: SaveStore.save(turn: TurnResult): Promise<void>。
- Produces: SaveStore.load(worldId: string): Promise<WorldState | null>。
- Produces: SaveStore.clear(worldId: string): Promise<void>。

- [ ] **Step 1: 写失败的持久化测试**

Create src/storage/save-store.test.ts:

```ts
import { describe, expect, it } from "vitest";
import { GameEngine } from "../core/game";
import { valenportContent } from "../content/valenport";
import { SaveStore } from "./save-store";

describe("SaveStore", () => {
  it("restores the same event cursor after a saved turn", async () => {
    const engine = new GameEngine(valenportContent, "save-seed");
    const turn = engine.execute("medicine_trace_carriage");
    const store = new SaveStore("test-db");
    await store.save(turn);
    await expect(store.load(turn.state.worldId)).resolves.toMatchObject({
      eventCursor: turn.state.eventCursor,
      stateHash: turn.state.stateHash,
    });
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
npm test -- src/storage/save-store.test.ts
```

Expected: FAIL because SaveStore does not exist.

- [ ] **Step 3: 实现存档存储**

Create src/storage/save-store.ts using idb. Create object stores snapshots keyed by worldId and events keyed by [worldId, eventCursor]. save must write events first and snapshot second in one readwrite transaction. load must parse the stored snapshot with parseWorldState and return null for absent world id. On parse failure, throw Error with code E_SAVE_INTEGRITY and leave the stored record unchanged.

```ts
export class SaveStore {
  constructor(private readonly databaseName = "valenport-rpg") {}
  async save(turn: TurnResult): Promise<void> {
    const db = await openSaveDatabase(this.databaseName);
    const transaction = db.transaction(["events", "snapshots"], "readwrite");
    for (const event of turn.committedEvents) {
      await transaction.objectStore("events").put({ worldId: turn.state.worldId, ...event });
    }
    await transaction.objectStore("snapshots").put(turn.state);
    await transaction.done;
  }

  async load(worldId: string): Promise<WorldState | null> {
    const db = await openSaveDatabase(this.databaseName);
    const snapshot = await db.get("snapshots", worldId);
    return snapshot === undefined ? null : parseWorldState(snapshot);
  }

  async clear(worldId: string): Promise<void> {
    const db = await openSaveDatabase(this.databaseName);
    const transaction = db.transaction(["events", "snapshots"], "readwrite");
    const eventKeys = await transaction.objectStore("events").index("by-world").getAllKeys(worldId);
    await Promise.all(eventKeys.map((key) => transaction.objectStore("events").delete(key)));
    await transaction.objectStore("snapshots").delete(worldId);
    await transaction.done;
  }
}
```

- [ ] **Step 4: 在 GameEngine 增加恢复构造器**

Add:

```ts
static fromSavedRun(content: ContentPack, state: WorldState, events: CommittedEvent[]): GameEngine
```

It must initialize the random stream from state.worldSeed, call rng.advance once for every randomEvidence item in the supplied events, then assign the parsed state. Add SeededRng.advance(drawCount: number): void, which calls nextD100 drawCount times and discards the returned values.

- [ ] **Step 5: 运行持久化与规则回归**

Run:

```bash
npm test -- src/storage/save-store.test.ts src/core
```

Expected: PASS.

- [ ] **Step 6: 提交任务**

Run:

```bash
git add src/storage/save-store.ts src/storage/save-store.test.ts src/core/game.ts
git commit -m "feat: persist event log and world snapshots"
```

---

### Task 6: 建立 AI 行动解析接口与无模型开发实现

**Files:**

- Create: src/ai/interpreter.ts
- Create: src/ai/interpreter.test.ts
- Modify: src/core/actions.ts

**Interfaces:**

- Produces: ActionInterpreter.interpret(input: PlayerInput, state: WorldState): Promise<InterpretationResult>。
- Produces: FixtureActionInterpreter，支持建议动作和六条已声明的自由输入样例。

- [ ] **Step 1: 写失败的解释器测试**

Create src/ai/interpreter.test.ts:

```ts
import { describe, expect, it } from "vitest";
import { FixtureActionInterpreter } from "./interpreter";
import { createInitialWorld, valenportContent } from "../content/valenport";

describe("FixtureActionInterpreter", () => {
  it("maps a medicine free-text intent to a suggested action", async () => {
    const interpreter = new FixtureActionInterpreter();
    const result = await interpreter.interpret(
      { mode: "free_text", text: "查看马车的送货路线" },
      createInitialWorld(valenportContent, "intent-seed"),
    );
    expect(result).toEqual({ kind: "action", actionId: "medicine_trace_carriage" });
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
npm test -- src/ai/interpreter.test.ts
```

Expected: FAIL because FixtureActionInterpreter does not exist.

- [ ] **Step 3: 实现接口和确定性解释器**

Create src/ai/interpreter.ts:

```ts
export type PlayerInput = { mode: "suggested"; actionId?: SuggestedActionId; text?: string };
export type InterpretationResult =
  | { kind: "action"; actionId: SuggestedActionId }
  | { kind: "clarification"; question: string; options: SuggestedActionId[] }
  | { kind: "rejected"; reason: string };

export interface ActionInterpreter {
  interpret(input: PlayerInput, state: WorldState): Promise<InterpretationResult>;
}
```

FixtureActionInterpreter must normalize whitespace and map these exact Chinese input phrases to actions:

- 查看马车的送货路线 → medicine_trace_carriage
- 和本谈谈药箱 → medicine_talk_to_ben
- 申请查看仓库账册 → warehouse_request_records
- 翻进封锁仓库 → warehouse_break_in
- 比对哨声和潮汐时间 → whistle_compare_times
- 在河岸安全观察哨片 → whistle_safe_observation

Unknown text returns clarification with the actions currently available from state; it never invents an action id.

- [ ] **Step 4: 运行解释器测试**

Run:

```bash
npm test -- src/ai/interpreter.test.ts
```

Expected: PASS.

- [ ] **Step 5: 提交任务**

Run:

```bash
git add src/ai/interpreter.ts src/ai/interpreter.test.ts src/core/actions.ts
git commit -m "feat: add deterministic action interpreter interface"
```

---

### Task 7: 实现可视化游戏界面与完整本地回合

**Files:**

- Create: src/ui/GameShell.tsx
- Create: src/ui/HudPanel.tsx
- Create: src/ui/ScenePanel.tsx
- Create: src/ui/QuestPanel.tsx
- Create: src/ui/ActionPanel.tsx
- Create: src/ui/EventLogPanel.tsx
- Create: src/ui/GameShell.test.tsx
- Modify: src/App.tsx
- Modify: src/styles/app.css

**Interfaces:**

- Consumes: GameEngine、SaveStore、FixtureActionInterpreter、TurnResult。
- Produces: 用户可点击建议动作或输入六条已支持的自由行动，并看到已提交后更新的 HUD、任务、日志与叙事摘要。

- [ ] **Step 1: 写失败的界面交互测试**

Create src/ui/GameShell.test.tsx:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { GameShell } from "./GameShell";

describe("GameShell", () => {
  it("updates the event log after a suggested action", async () => {
    const user = userEvent.setup();
    render(<GameShell />);
    await user.click(screen.getByRole("button", { name: "追查马车路线" }));
    expect(await screen.findByText("已消耗 15 分钟")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
npm test -- src/ui/GameShell.test.tsx
```

Expected: FAIL because GameShell does not exist.

- [ ] **Step 3: 实现游戏壳与状态连接**

GameShell loads createInitialWorld on first run, then attempts SaveStore.load before rendering. It owns React state for WorldState, TurnResult[] and narration summaries. On action:

1. await FixtureActionInterpreter.interpret;
2. if kind is action, call engine.execute;
3. await SaveStore.save;
4. update React state from returned TurnResult;
5. render a deterministic summary generated from committedEvents.

ScenePanel displays location title and state variant. HudPanel displays HP、理智、灵性、污染。QuestPanel lists three event states and clocks. EventLogPanel renders event cursor and summary. ActionPanel displays available suggested action buttons, a text input and a submit button.

- [ ] **Step 4: 实现原创视觉样式**

Update src/styles/app.css with CSS grid:

```css
.game-shell {
  display: grid;
  grid-template-columns: minmax(12rem, 0.28fr) minmax(24rem, 1fr) minmax(14rem, 0.32fr);
  min-height: 100vh;
  background: #17120f;
  color: #eadcc2;
}
```

Use original coal-black, oxidized-copper and candle-ivory palette. Do not copy game-specific icons, typefaces, layouts, character art or branded UI from any reference work. Add responsive breakpoint at 900px that stacks panels in scene, HUD, quest order.

- [ ] **Step 5: 运行 UI 与完整回归测试**

Run:

```bash
npm test
npm run build
npm run lint
```

Expected: all commands PASS; production build includes a manifest and service worker output.

- [ ] **Step 6: 手动验收**

Run:

```bash
npm run dev
```

Open the displayed localhost URL. Complete medicine_trace_carriage, warehouse_break_in and whistle_safe_observation in order. Reload the page after each action and verify event cursor, HUD and log persist. Verify whistle_safe_observation does not display an ability, potion, pathway name or level-up screen.

- [ ] **Step 7: 提交任务**

Run:

```bash
git add src/App.tsx src/ui src/styles/app.css
git commit -m "feat: add playable V0.1 game interface"
```

---

### Task 8: 加入回归验收、演示文档与发布前检查

**Files:**

- Create: README.md
- Create: src/core/acceptance.test.ts
- Modify: package.json

**Interfaces:**

- Produces: 一条可重复的 50 回合测试路径。
- Produces: 本地运行、测试、构建和隐私边界说明。

- [ ] **Step 1: 写失败的 V0.1 验收测试**

Create src/core/acceptance.test.ts:

```ts
import { describe, expect, it } from "vitest";
import { GameEngine } from "./game";
import { valenportContent } from "../content/valenport";

describe("V0.1 acceptance", () => {
  it("replays fifty turns without inconsistent event cursors", () => {
    const engine = new GameEngine(valenportContent, "acceptance-seed");
    const actions = [
      "medicine_trace_carriage",
      "medicine_talk_to_ben",
      "warehouse_request_records",
      "warehouse_break_in",
      "whistle_compare_times",
      "whistle_safe_observation",
    ] as const;
    for (let index = 0; index < 50; index += 1) engine.execute(actions[index % actions.length]);
    expect(engine.state.eventCursor).toBeGreaterThanOrEqual(50);
    expect(engine.state.characters.char_player.pathwayState).toBeNull();
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
npm test -- src/core/acceptance.test.ts
```

Expected: FAIL until GameEngine exposes state and safely handles actions whose event prerequisites have changed.

- [ ] **Step 3: 实现重复回合的确定性处理**

Add readonly state getter to GameEngine. For an action whose required event is resolved, return a committed time_advanced plus event_clock_advanced consequence, not an exception and not a duplicated clue. This preserves replayability without inventing new facts.

- [ ] **Step 4: 编写 README**

Create README.md with exactly these sections:

1. 项目说明：原创 V0.1 单人本地持续世界 RPG 原型。
2. 前置条件：Node.js 20.19+。
3. 本地运行：npm install、npm run dev。
4. 验证：npm test、npm run build、npm run lint。
5. 存档：浏览器 IndexedDB；说明清除浏览器站点数据会删除本地存档。
6. AI 边界：当前版本不发送玩家数据到任何模型服务；自由输入仅由确定性开发解释器处理。
7. 内容边界：仅含原创瓦伦港演示内容；不含受保护作品内容包。
8. 已知范围：无多人、无真实模型、无公开 API 密钥管理。

- [ ] **Step 5: 运行最终验证**

Run:

```bash
npm test
npm run build
npm run lint
```

Expected: all commands PASS. Capture the Vite production output path and verify it contains index.html, manifest.webmanifest and a service worker asset.

- [ ] **Step 6: 提交任务**

Run:

```bash
git add README.md src/core/acceptance.test.ts src/core/game.ts package.json
git commit -m "test: add V0.1 acceptance coverage"
```

---

## 实现计划自检

### 规格覆盖

| 规格要求 | 实现任务 |
|---|---|
| 权威事件、状态与随机数边界 | 任务 2、3、4 |
| 三个最小内容样例 | 任务 2、4、7 |
| D100、伤势/污染边界 | 任务 3、4 |
| 法律证据而非系统全知 | 任务 4 |
| 存档、恢复与事件重放 | 任务 5、8 |
| AI 只输出候选、不改状态 | 任务 6 |
| 可视化 HUD、行动和日志 | 任务 7 |
| 成本控制与离线规则测试 | 任务 1、3、6、8 |
| 原创内容/IP 隔离 | 全局约束、任务 2、8 |

### 延后项目

真实 LLM/BYOK、图像生成、语义自由输入、死亡后继承、完整职业创建、完整伤势治疗、完整经济周期和全部低序列内容将在 V0.1 垂直切片通过后单独规划。它们不会作为本计划的隐含交付物。

### 可执行结论

完成任务 1–8 后，玩家可以从 GitHub 仓库克隆或下载项目，在浏览器运行一座本地持续世界中的三个相关任务；规则结果可复盘，刷新页面后存档保留，AI 供应商不可用时游戏仍可完成这三个验证样例。
