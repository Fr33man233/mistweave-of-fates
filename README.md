# Mistweave of Fates / 灰雾织命

> **English** | [中文](#中文说明)

## English

**Mistweave of Fates** is a browser-local prototype for a persistent-city supernatural investigation RPG. It runs with deterministic D100 resolution, authoritative event logs, and browser IndexedDB saves—no API key or server required.

### Playable slice

- Three original cases: a misdelivered medicine chest, a sealed warehouse ledger, and a night-voyage whistle.
- Every case has a contact step followed by a cautious or risky investigation choice.
- Risky choices take more time and raise police attention.
- Free-text commands map locally to existing legal actions; unrecognised commands never change world state.
- Progress is saved locally after play and restored on reload when browser storage is available.

### Run locally

Requires Node 20+ and pnpm.

```powershell
pnpm install
pnpm dev
```

Run validation with `pnpm test` and create a production build with `pnpm build`.

### Current limits

This is a gameplay-loop prototype. Character creation, advancement/potions, real LLM narration, multiplayer, combat, and the complete economy are intentionally outside this release.

### Project documents and feedback

- [Documentation index](docs/INDEX.md)
- [Playtest feedback template / 试玩反馈模板](docs/试玩反馈模板.md)

---

## 中文说明

# Mistweave of Fates（灰雾织命）：瓦伦港连续调查 MVP

一个完全本地运行的单城市超自然调查 RPG 原型。它使用确定性 D100、权威事件日志和浏览器 IndexedDB 存档；不需要 API Key 或网络服务。

## 试玩内容

- 三个原创案件：误投的药箱、封锁仓库的账册、夜航哨声。
- 每案先接触，再选择谨慎或冒险调查；后者消耗更多时间并提高警方关注。
- 自由行动输入可用关键词映射到尚可接触的案件；未知输入不会改变世界。
- 每次行动自动保存，重开页面会尝试恢复本地进度。

## 运行

需要 Node 20+ 与 pnpm。

```powershell
pnpm install
pnpm dev
```

在终端显示的本地地址打开浏览器，通常为 `http://localhost:5173/`。

## 验证与构建

```powershell
pnpm test
pnpm build
pnpm preview
```

## 手动验收

1. 点击“开始调查”，接触任一案件。
2. 选择“谨慎调查”或“冒险调查”，检查时间、警方关注、事件号与线索变化。
3. 再完成另外两个案件，确认它们共享同一世界时间与风险状态。
4. 在“自由行动”输入“检查药箱”或“去仓库看看”，确认它进入合法案件；输入无关文字，确认状态不改变。
5. 刷新页面，确认已完成案件、时间、线索和日志保持。

## 已知限制

本版本用于验证调查循环；不含角色创建、魔药/晋升、真实 LLM、图像生成、多人同步、完整经济或战斗系统。

## 文档与反馈

- [文档索引](docs/INDEX.md)
- [试玩反馈模板](docs/试玩反馈模板.md)
