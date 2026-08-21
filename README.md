# Mistweave of Fates / 灰雾织命

> **English** | [中文](#中文说明)

> **Current direction (2026-08-20):** the Valenport V0.1–V0.3 builds below are retained as historical technical slices. The active product definition is now a private-test, parallel-Tingen COC 7e RPG with an AI Keeper, a bounded B+ world AI, and four approved pathways through Sequences 9–8. See the [current product redefinition](docs/superpowers/specs/2026-08-20-parallel-tingen-ai-keeper-product-redefinition.md). No implementation or public release of that new direction is claimed here.
> The first V0.4 playable slice will use `deepseek-v4-flash` through a server-side local gateway; model stubs are test-only and never count as Keeper experience evidence.

## English

**Mistweave of Fates** is a browser-local, single-city supernatural investigation RPG set in the original industrial port of Valenport. Deterministic TypeScript rules own every D100 roll and state change; the React client only presents state and submits legal actions. No API key, backend, or network service is required.

### V0.2 first-ascension system-validation slice

V0.2 is a published rules-system validation build, not a completed MVP or a complete player-experience loop. It proves the deterministic character-to-ascension machinery, persistence, and deployment; investigation feedback, active material acquisition, contextual ability value, and complete failure/recovery paths remain pre-MVP work.

- Create an apothecary apprentice, reporter, detective, or dockworker. The profile has three non-refundable character slots; deceased cards remain permanently disabled.
- Resolve three original investigations through cautious or risky approaches. After three meaningful events, both the Observer and Hound leads become available and remain independently investigable.
- Find a trusted source, choose safe or risky ritual materials, and review the ability direction, irreversible change, and death risk before confirming the potion.
- Resolve the first ascension as success, costly success, ordinary failure, or catastrophic failure. Success locks one pathway and raises spirituality from 5/5 to 8/8; catastrophe permanently kills the character.
- Use Trace Sense or Danger Trail with 1–3 spirituality declared before the D100 roll. Overcharge improves the check while increasing pollution, injury, or sanity pressure.
- Save the complete profile, pathway, ritual, event log, and death state in browser IndexedDB. Structurally valid V0.1 saves are migrated locally.

### V0.3 investigation-closure candidate (local, pre-MVP)

The local V0.3 candidate closes the smallest meaningful player loop without a model: named characters with controlled gender values, three feedback-bearing investigations, two indirect pathway leads, explicit material acquisition with cost/risk, first ascension with conflict and failure recovery, and an ascension ability applied inside a later event. It also adds stable request idempotency, deterministic seeds, IndexedDB current/previous snapshots, corruption fallback, exit/recovery navigation, and character switching. This candidate is not pushed or published and does not claim MVP readiness.

### Play and validate

V0.2 is published on GitHub Pages: [play Mistweave of Fates](https://fr33man233.github.io/mistweave-of-fates/).

Requires Node 20.19+ (or Node 22.12+) and pnpm:

```powershell
pnpm install --frozen-lockfile
pnpm dev
pnpm test
pnpm build
pnpm test:e2e
pnpm test:automation
```

See the [test runbook](docs/Loop-Engineering测试运行手册.md) for browser automation, cross-version scenarios, and the optional Loop Engineering workflow. Default automation only accesses the local test server and never calls the real model.

### Feedback

Please use the [bilingual playtest feedback template](docs/试玩反馈模板.md). The most useful V0.2 feedback is whether the three-case pace feels clear, both hidden leads feel tempting, the ritual warning is understandable, the first ability feels worth its cost, and permanent death feels fair rather than surprising.

### Current limits

V0.3 remains pre-MVP: it intentionally excludes real LLM narration, a backend, multiplayer, combat, a complete economy, image generation, high-rank pathways, resurrection, inheritance, batch content, and external-player validation. Local saves can be copied or edited, so permanent death is a rules commitment rather than anti-cheat enforcement.

---

## 中文说明

> **当前方向（2026-08-20）：**下述瓦伦港 V0.1–V0.3 版本只作为历史技术切片保留。当前产品已重定义为仅限私人/封闭测试的“平行廷根 + COC 7e + AI Keeper + B+ 世界 AI”，并批准四条途径至少实现序列 9–8。详见[当前产品重定义与全栈预审](docs/superpowers/specs/2026-08-20-parallel-tingen-ai-keeper-product-redefinition.md)。本 README 不宣称该新方向已经实现或具备公开发布资格。
> V0.4 第一份可玩切片将通过本地服务端网关使用 `deepseek-v4-flash`；模型桩只用于测试，不能作为 Keeper 体验成立的证据。

# Mistweave of Fates（灰雾织命）：V0.2 首次晋升规则系统验证版

《灰雾织命》是一款完全在浏览器本地运行的单城市超自然调查 RPG，舞台是原创工业港城“瓦伦港”。确定性 TypeScript 规则引擎负责 D100、状态和死亡；React 只展示状态并提交合法动作。不需要 API Key、后端或网络服务。

V0.2 是已发布的规则系统验证版，不是已经完成的 MVP 或完整玩家体验闭环。它证明了从职业入口到首次晋升的确定性机械流程、存档与部署；调查结果反馈、主动材料获取、事件内能力价值和完整失败/恢复路径仍属于 pre-MVP 工作。

### V0.3 本地闭环候选

V0.3 在不依赖真实模型的条件下补齐最小用户结果：实名与受控性别字段、逐行动调查反馈、隐晦双线索、主动材料获取、双药冲突、普通失败限制、资源归零恢复、退出/继续/换角、损坏 current 回退 previous，以及晋升后在代表事件内实际使用能力。它是本地 pre-MVP 验收候选，不代表 MVP、V1.0 公测或 V2.0 正式上线，也未提交或推送。

## V0.2 试玩流程

1. 创建药房学徒、记者、警探或码头工人。玩家档案只有三个不可退款槽位，死亡角色卡永久禁用。
2. 以谨慎或冒险方式完成三个原创案件；三次有效事件后，观察者与猎犬两条隐晦线索会同时出现，并可分别调查。
3. 找到可信来源，选择安全或冒险材料。服药前必须阅读能力方向、不可逆身心改变，以及失控/死亡风险。
4. 二次确认后结算首次晋升：成功、带代价成功、普通失败或灾难失败。成功会锁定一条路径并把灵性从 5/5 提升为 8/8；灾难失败会永久失效当前角色卡。
5. 晋升后可使用“痕迹感知”或“危险追迹”，在骰点前声明消耗 1–3 点灵性。加注提高成功率，也提高污染、伤势或理智压力。
6. 角色、双轨、材料、仪式、能力、事件日志和死亡状态自动保存到 IndexedDB；结构有效的 V0.1 存档会在本地迁移。

## 本地运行与验证

V0.2 已发布至 GitHub Pages：[在线试玩](https://fr33man233.github.io/mistweave-of-fates/)。

需要 Node 20.19+（或 Node 22.12+）与 pnpm：

```powershell
pnpm install --frozen-lockfile
pnpm dev
pnpm test
pnpm build
pnpm test:e2e
pnpm test:automation
```

浏览器自动化、跨版本场景组织和可选 Loop Engineering 流程见[测试运行手册](docs/Loop-Engineering测试运行手册.md)。默认自动化只访问本地测试服务，不调用真实模型。

## 试玩反馈

请使用[中英双语试玩反馈模板](docs/试玩反馈模板.md)。V0.2 最需要确认的是：三案节奏是否清楚、两条路径是否都值得追查、仪式风险是否易懂、首次能力是否值得代价，以及永久死亡是否公平而非突兀。

## 当前限制

V0.3 仍不接入真实 LLM、后端、多人、战斗、完整经济、图像生成、高阶路径、批量内容、复活或继承，也未完成外部玩家验证。本地存档可被复制或编辑，因此永久死亡是规则承诺，不是反作弊保证。
