# Mistweave of Fates / 灰雾织命

> **English** | [中文](#中文说明)

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

### Play and validate

V0.2 is published on GitHub Pages: [play Mistweave of Fates](https://fr33man233.github.io/mistweave-of-fates/).

Requires Node 20.19+ (or Node 22.12+) and pnpm:

```powershell
pnpm install --frozen-lockfile
pnpm dev
pnpm test
pnpm build
```

### Feedback

Please use the [bilingual playtest feedback template](docs/试玩反馈模板.md). The most useful V0.2 feedback is whether the three-case pace feels clear, both hidden leads feel tempting, the ritual warning is understandable, the first ability feels worth its cost, and permanent death feels fair rather than surprising.

### Current limits

V0.2 intentionally excludes real LLM narration, a backend, multiplayer, combat, a complete economy, image generation, high-rank pathways, resurrection, and inheritance. Local saves can be copied or edited, so permanent death is a rules commitment rather than anti-cheat enforcement.

---

## 中文说明

# Mistweave of Fates（灰雾织命）：V0.2 首次晋升规则系统验证版

《灰雾织命》是一款完全在浏览器本地运行的单城市超自然调查 RPG，舞台是原创工业港城“瓦伦港”。确定性 TypeScript 规则引擎负责 D100、状态和死亡；React 只展示状态并提交合法动作。不需要 API Key、后端或网络服务。

V0.2 是已发布的规则系统验证版，不是已经完成的 MVP 或完整玩家体验闭环。它证明了从职业入口到首次晋升的确定性机械流程、存档与部署；调查结果反馈、主动材料获取、事件内能力价值和完整失败/恢复路径仍属于 pre-MVP 工作。

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
```

## 试玩反馈

请使用[中英双语试玩反馈模板](docs/试玩反馈模板.md)。V0.2 最需要确认的是：三案节奏是否清楚、两条路径是否都值得追查、仪式风险是否易懂、首次能力是否值得代价，以及永久死亡是否公平而非突兀。

## 当前限制

V0.2 不接入真实 LLM、后端、多人、战斗、完整经济、图像生成、高阶路径、复活或继承。本地存档可被复制或编辑，因此永久死亡是规则承诺，不是反作弊保证。
