# V0.3 真实调查闭环版实施计划

> 状态：实施已完成，待本地验收记录与用户发布决定；本文不代表提交或推送授权
> 日期：2026-08-20
> 设计规格：[V0.3 全栈预审与设计规格](../specs/2026-08-20-v03-investigation-closure-design.md)
> 基线：`e92889c`（V0.2 首次晋升规则系统验证版已发布，未达到 MVP）

## 1. 目标与交付顺序

V0.3 的唯一用户结果是：玩家在零模型依赖下完成“有反馈的调查 → 隐晦双线索 → 主动材料获取 → 准备与首次晋升 → 后续事件内使用能力”，并能退出、继续、换角、从资源归零或损坏存档中恢复；失败、冲突和永久死亡没有已知必现软锁。

实施按以下依赖链推进：

`版本化 Schema/迁移夹具 → requestId 原子提交/双快照 → 调查合同/校验器 → 代表案件/透镜 → 反馈投影 → 资源与导航 → 材料/晋升冲突 → 能力事件 → React 集成 → 浏览器与发布验收`

每项先写失败测试，再做最小实现并运行定向测试。全量测试只在三个集成检查点和发布候选阶段运行，避免每个小任务重复支付完整回归成本。

## 2. 全局约束与资源预算

- 不增加运行时依赖、服务端、真实模型调用、网络要求或批量内容；所有自动化保持零模型 token。
- 不修改已确认的灵性、1–3 点能力加注、首次服药四档结算和风险数值，除非测试证明规格缺口无法关闭并另行取得用户决定。
- 三张角色槽不可退款；死亡永久失效；V0.3 无复活、继承或反作弊承诺。
- React 不写业务状态；内容不执行规则；随机数、事实、终局、资源、死亡和事件都由 TypeScript 核心决定。
- 新增一个 `CaseCore`、一套 `CaseGrammar`、四个职业配置、两个路径透镜和一个晋升后能力事件；禁止职业×路径复制剧情。
- 定向测试按模块运行；Checkpoint A/B/C 各运行一次全量测试，最终只再运行一次全量测试、生产构建和浏览器矩阵。
- 发生存档兼容、死亡语义、已确认数值或范围变化时停止对应任务，不用临时分支规则绕过。

## 3. Checkpoint A：数据与事务基础

### Task 1：冻结 V0.3 Schema、角色身份与迁移夹具

**文件：**修改 `src/core/schema.ts`、`src/core/profile.ts`、`src/core/schema.test.ts`、`src/core/profile.test.ts`；新增 `src/storage/fixtures/` 下脱敏的 V0.1/V0.2 合法与损坏存档夹具。

**合同：**根存档与 V0.3 新对象使用 `schemaVersion: "0.3.0"`；角色增加非空 `name` 和受控 `gender`（至少含 `unspecified`）；旧角色迁移为明确默认显示值，不推断身份；四职业和三槽规则不变。

- [ ] 写失败测试：V0.3 新角色姓名/性别必填且可序列化；非法/空白值拒绝；四职业与三槽不变。
- [ ] 写固定 V0.2 合法存档夹具以及字段缺失、未来版本、引用损坏负例；夹具只含原创虚构数据。
- [ ] 实现版本化 Schema 与纯迁移入口，使旧存档只在通过旧 Schema 后升级。
- [ ] 运行 `pnpm test -- src/core/schema.test.ts src/core/profile.test.ts src/storage/save.test.ts`。

**完成证据：**新建角色、合法旧档升级和损坏拒绝均有状态前后断言；未触碰晋升数值。

### Task 2：建立统一的 `requestId` 原子提交与固定种子重放

**文件：**新增 `src/core/actions.ts`、`src/core/actions.test.ts`；修改 `src/core/rules.ts`、`src/core/rules.test.ts`、`src/core/game.ts`、`src/core/schema.ts`。

**合同：**`ActionIntent` 使用稳定 `(instanceId, requestId)` 幂等键；核心一次性产出 `nextGame + Resolution + committedEvents`。相同 key 与相同载荷返回原结果；相同 key 但不同载荷返回稳定冲突错误且零状态变化。

- [ ] 写失败测试：首次提交只增加一次事件和游标；重复提交不重掷、不扣费、不推进时钟；载荷冲突拒绝。
- [ ] 写固定 seed 重放测试，断言 D100、`Resolution`、事件序号与状态变化一致。
- [ ] 将现有案件、晋升和能力调用逐步兼容统一动作入口，但此任务不改变业务结果。
- [ ] 运行 `pnpm test -- src/core/actions.test.ts src/core/rules.test.ts src/core/game.test.ts src/core/ascension.test.ts src/core/abilities.test.ts`。

**完成证据：**幂等正例、载荷冲突负例、固定 seed 日志快照；旧动作结果回归不变。

### Task 3：双快照 IndexedDB、损坏拒绝与恢复

**文件：**新增 `src/storage/envelope.ts`、`src/storage/envelope.test.ts`；修改 `src/storage/save.ts`、`src/storage/save.test.ts`。

**合同：**保存信封包含 `current`、`previous`、`savedAt`、版本与完整性校验；同一 IndexedDB transaction 中验证候选、保留上一快照并写入 current。current 损坏时可读取 previous；两者均损坏或版本未知时拒绝加载，绝不清除原始记录或半加载。

- [ ] 写失败测试：连续两次保存形成 current/previous；写入失败不破坏 previous；current 损坏回退 previous。
- [ ] 写负例：校验不符、事件游标倒退、重复 requestId 结果不一致、未知未来版本、双快照损坏。
- [ ] 实现加载结果的显式状态：`loaded | recovered_previous | rejected`，供 UI 准确提示。
- [ ] 运行 `pnpm test -- src/storage/envelope.test.ts src/storage/save.test.ts`。

**完成证据：**V0.2→V0.3 迁移、上一快照恢复和拒绝路径全部可重复；原始损坏记录未被覆盖。

### Checkpoint A 验收

- [ ] 运行 `pnpm test`，记录测试文件数、测试数、时长和失败项。
- [ ] 确认没有模型调用、网络请求、新依赖或生产 UI 行为变化。
- [ ] 只有 Schema、幂等、重放和存档恢复全部通过后进入案件实现。

## 4. Checkpoint B：调查合同、内容与反馈

### Task 4：最小调查合同与内容校验器

**文件：**新增 `src/core/investigation-schema.ts`、`src/core/investigation-schema.test.ts`、`src/content/validate.ts`、`src/content/validate.test.ts`。

**合同：**实现 `CaseCore`、`CaseGrammar`、`Fact`、`ClueSource`、`InvestigationInstance`、`ActionIntent`、`Resolution`、`EndingPredicate` 和稳定 ID/引用规则。

- [ ] 写合法最小案件测试，证明可解析、实例化、保存和重放。
- [ ] 写内容负例：重复/悬空 ID、关键事实单源、无恢复入口、不可达终局、终局无前置、透镜改真相、能力直接新增事实、无四职业通用入口。
- [ ] 实现确定性图可达检查；只验证本版一个案件所需语法，不提前建设 V0.6 完整工具链。
- [ ] 运行 `pnpm test -- src/core/investigation-schema.test.ts src/content/validate.test.ts`。

**完成证据：**合法样例通过；每类非法内容在运行时前以稳定错误码拒绝。

### Task 5：实现原创代表案件“雾钟下的失窃航标”

**文件：**新增 `src/content/cases/stolen-beacon.ts`、`src/content/cases/stolen-beacon.test.ts`；修改 `src/content/valenport.ts`、`src/content/valenport.test.ts`。

**内容边界：**一个港区场景、三名功能角色、三类方法、三个合法终局、两个关键事实的双来源/恢复入口；实例 seed 固化 `truthVariantId`，随后不可修改。

- [ ] 先写内容与可达性测试，覆盖现场勘查、访谈/凭证、职业或交易交换。
- [ ] 为 `report_authority`、`repair_quietly`、`expose_smuggling` 各写一条固定 seed 可达流程。
- [ ] 写来源失败后从第二来源恢复的测试，证明普通失败不会关闭全部终局。
- [ ] 写真相不可变测试：职业、路径、叙事投影和重复请求均不能改变 `truthVariantId`。
- [ ] 运行 `pnpm test -- src/content/cases/stolen-beacon.test.ts src/content/validate.test.ts src/content/valenport.test.ts`。

**完成证据：**三方法、三终局、双来源的事件日志与固定 seed；原创文案和引用检查通过。

### Task 6：职业/路径透镜组合而非笛卡尔积内容

**文件：**新增 `src/content/lenses.ts`、`src/content/lenses.test.ts`；修改代表案件测试。

**合同：**四职业都有公共入口；至少记者和码头工人体现不同联系人/方法/代价；观察者和猎犬只改变合法方法、判定或代价，不新增事实、不跳过阶段、不自动满足终局。

- [ ] 写四职业通路参数化测试与职业差异断言。
- [ ] 写两路径透镜测试及“未晋升角色无路径修正”负例。
- [ ] 用 pairwise 覆盖职业×路径×主要方法；保留死亡/资源不足等高风险组合的显式测试，不生成完整笛卡尔积。
- [ ] 运行 `pnpm test -- src/content/lenses.test.ts src/content/cases/stolen-beacon.test.ts`。

**完成证据：**四职业均可完成；两职业差异和两路径能力落点可解释；无重复案件副本。

### Task 7：`SceneViewModel` 与逐行动解释反馈

**文件：**新增 `src/core/view-model.ts`、`src/core/view-model.test.ts`；按需修改 `src/core/actions.ts`。

**合同：**只从已提交状态投影 `scene`、`feedback`、`caseBoard`、`profile`、`navigation`；反馈包含行动、方法、D100/成功等级、时间/资源/法律/关系变化、获得或错过的内容和下一合法行动，不泄露未确认事实。

- [ ] 写成功、带代价成功、普通失败、拒绝、冲突和恢复结果的投影测试。
- [ ] 写隐藏真相/未确认事实不得进入 ViewModel 的负例。
- [ ] 写不可执行动作不出现在 `navigation/actions` 的测试。
- [ ] 运行 `pnpm test -- src/core/view-model.test.ts src/core/actions.test.ts`。

**完成证据：**每次任务行动都有可解释反馈；叙事层缺失也不影响玩家理解结果。

### Checkpoint B 验收

- [ ] 运行 `pnpm test`，记录总量与时长；失败只回到相关任务，不扩大内容。
- [ ] 运行内容校验报告，确认三方法、三终局、双来源、四职业和两路径透镜全部成立。
- [ ] 用固定 seed 重放代表案件，确认权威事件完全一致。

## 5. Checkpoint C：失败恢复、主动材料、晋升与能力价值

### Task 8：主菜单、换角与资源归零的核心语义

**文件：**新增 `src/core/recovery.ts`、`src/core/recovery.test.ts`；修改 `src/core/profile.ts`、`src/core/profile.test.ts`、`src/core/game.ts`、`src/core/game.test.ts`。

**合同：**活动角色最多一个；死亡角色不可激活。`hp=0` 进入 `incapacitated`，`sanity=0` 进入 `broken`，`spirituality=0` 仅禁用能力；治疗/休整/退出当前案件/换角至少保留一个合法出口。三槽全死亡显示终态与新局/恢复说明，不伪造可玩角色。

- [ ] 写返回主菜单、继续、切换有效角色和中断案件后恢复测试。
- [ ] 写 hp/sanity/spirituality 归零的允许与拒绝矩阵。
- [ ] 写无活动角色、全槽死亡、失效角色激活和资源不足负例，断言没有状态变化或死按钮。
- [ ] 运行 `pnpm test -- src/core/profile.test.ts src/core/game.test.ts src/core/recovery.test.ts`。

**完成证据：**状态遍历无已知必现软锁；死亡边界未扩大到普通失败。

### Task 9：主动材料获取与来源/代价事件

**文件：**新增 `src/core/materials.ts`、`src/core/materials.test.ts`；修改 `src/core/ascension.ts`、`src/core/ascension.test.ts` 和代表案件内容/测试。

**合同：**材料只能由调查、交易、交换、采集或明确风险行动获得；记录 `sourceActionId`、成本、风险和获得事件。移除 V0.2 `prepareRitual` 自动分配材料的路径，但合法 V0.2 已准备存档迁移后保持可解释。

- [ ] 写无材料不能准备、五类来源中本版批准方式可获得、来源/代价可追溯测试。
- [ ] 写重复 requestId 不重复给材料或扣成本测试。
- [ ] 写资源不足、来源已耗尽、非法材料和迁移旧准备记录负例。
- [ ] 运行 `pnpm test -- src/core/materials.test.ts src/core/ascension.test.ts src/storage/save.test.ts`。

**完成证据：**所有新增材料都有来源事件；自动授予路径不存在；V0.2 合法档不丢失。

### Task 10：双药冲突、失败后限制与四档晋升回归

**文件：**修改 `src/core/ascension.ts`、`src/core/ascension.test.ts`、`src/core/game.ts`、Schema/迁移测试。

**合同：**两线可准备；确认一线后另一线材料/准备标为 `conflicted`。普通失败进入 `restricted`，同一配方不能换 requestId 无限重掷，只能走规格允许的补救/冷却入口；灾难失败永久死亡。既定四档阈值与代价不变。

- [ ] 先把 V0.2“普通失败可直接重试”测试改为失败测试，再实现限制语义。
- [ ] 写双准备、确认一线、另一线冲突、重复确认与双成功不可能测试。
- [ ] 写 success/costly_success/failure/catastrophic_failure 固定 seed 回归和永久死亡测试。
- [ ] 写失败、冲突、死亡后 UI 所需稳定错误/结果码。
- [ ] 运行 `pnpm test -- src/core/ascension.test.ts src/core/actions.test.ts src/storage/save.test.ts`。

**完成证据：**四档数值 diff 复核无偷改；失败限制、双药冲突和幂等均有事件日志。

### Task 11：晋升后事件内能力使用

**文件：**新增 `src/content/events/post-ascension-beacon.ts` 及测试；修改 `src/core/abilities.ts`、`src/core/abilities.test.ts`、代表案件/透镜测试。

**合同：**至少一个晋升后事件允许在判定前声明观察者或猎犬能力与 1–3 点加注；能力改变方法、判定或代价并展示收益与污染/伤势/理智压力，不直接给事实。

- [ ] 写两路径各自可用、未晋升/路径不匹配/灵性不足拒绝测试。
- [ ] 写 1–3 点预声明消耗、固定 seed 重放和压力结算测试。
- [ ] 写能力失败仍保留恢复入口、能力不能新增事实或跳过终局测试。
- [ ] 运行 `pnpm test -- src/core/abilities.test.ts src/content/events/post-ascension-beacon.test.ts src/core/view-model.test.ts`。

**完成证据：**玩家在真实事件内看到能力收益与代价；能力不再是孤立按钮。

### Checkpoint C 验收

- [ ] 运行规则闭环固定 seed 集成测试：建角→调查→材料→准备→晋升→能力事件。
- [ ] 运行失败矩阵：普通失败、资源归零、双药冲突、受限服药、灾难死亡、退出/继续、换角。
- [ ] 运行 `pnpm test` 并记录总量、时长和失败项；只有全部通过后进入 React 集成。

## 6. UI、浏览器与发布候选

### Task 12：React 主信息架构与响应式集成

**文件：**修改 `src/App.tsx`、`src/App.test.tsx`、`src/styles.css`；按需拆分 `src/components/`，但不得在组件内复制规则。

**界面：**主菜单（继续/角色档案/恢复）→ 角色创建/切换 → 案件与结果反馈 → 案件板 → 材料/晋升 → 晋升后能力事件。桌面双栏、约 360px 单列；沿用工业神秘风格。

- [ ] 写姓名/性别建角、继续、返回、换角、退出当前案件的 UI 失败测试。
- [ ] 写代表案件三方法、逐行动反馈、主动材料、双药冲突、失败限制和事件内能力的主流程测试。
- [ ] 写 current 损坏回退 previous、双快照拒绝、全槽死亡、hp/sanity/spirituality 归零和不可执行按钮隐藏/禁用测试。
- [ ] 实现 UI 只提交稳定 `ActionIntent` 并渲染 `SceneViewModel`；移除直接调用散落规则动作的路径。
- [ ] 运行 `pnpm test -- src/App.test.tsx src/storage/save.test.ts src/core/view-model.test.ts`。

**完成证据：**DOM 测试覆盖主流程和失败流程；React 不持有或推断案件真相。

### Task 13：自动化、构建与浏览器验收

**文件：**新增或修改验收测试与脚本；只有需要记录结果时修改执行日志，不发布。

- [ ] 运行 `pnpm test`，记录实际测试文件数、测试数、时长和失败项。
- [ ] 运行 `pnpm build`，确认 TypeScript、Vite/PWA 和 Pages base 不回归。
- [ ] 在桌面宽度完成建角→代表案件→材料→晋升→能力事件，并刷新恢复。
- [ ] 在约 360px 宽度重复主流程关键节点，确认无横向溢出、遮挡、死按钮或不可达操作。
- [ ] 人工执行损坏 current→previous 恢复、资源归零、双药冲突、普通失败限制、灾难死亡与换角。
- [ ] 确认离线静态模式没有业务网络依赖、真实模型调用、API key 或个人数据上传。

**完成证据：**测试/构建日志、桌面与移动浏览器记录、迁移/恢复记录和已知问题清单。

### Task 14：V0.3 验收记录与本地发布准备

**文件：**新增 `Mistweave-of-Fates-V0.3验收与发布记录.md`；修改 `README.md`、`docs/INDEX.md`、`Mistweave-of-Fates-V0.1开发执行日志.md`；必要时补充反馈模板。

- [ ] 逐条链接设计规格八项退出条件的自动化、浏览器和手工证据。
- [ ] 明确写明 V0.3 是 pre-MVP，尚未满足真实模型自由行动、50 回合连续性和外部玩家等 MVP 发布门。
- [ ] 记录实际 Schema、迁移、回滚点、Pages 候选、资源成本与未关闭问题。
- [ ] 运行文档链接检查、`git diff --check` 和范围负向检索。
- [ ] 保持所有文件本地未提交；只有用户按版本发布流程明确授权后，才提交、推送和做 Pages 线上验收。

## 7. 八项退出条件到任务的追溯

| 退出条件 | 主任务 | 证据来源 |
|---|---|---|
| 1. 六项试玩缺口关闭 | 1、7–12 | Schema、反馈、能力事件、冲突、失败限制、导航/恢复测试与浏览器记录 |
| 2. 连续规则闭环 | 5、9–13 | 固定 seed 集成测试与桌面/移动主流程 |
| 3. 失败/死亡/恢复无必现软锁 | 3、8、10、12、13 | 状态遍历、资源归零、死亡/换角与快照恢复矩阵 |
| 4. 三方法/三终局/双来源可达 | 4–6 | 内容校验、固定 seed 日志、恢复入口测试 |
| 5. 关键负例零权威变化 | 2–4、8–10 | requestId、非法目标、资源不足、能力越权、损坏存档断言 |
| 6. 四职业与两路径透镜 | 5、6、11 | 四职业参数化、pairwise 和两路径事件测试 |
| 7. 工程与基础可用性 | A/B/C、12、13 | 定向/全量测试、构建、迁移和浏览器结果 |
| 8. 不错误宣称 MVP | 14 | README、索引、验收记录与范围负向检索 |

## 8. 停止条件与后续门

出现以下任一情况立即停止相关实施并回到设计决策：需要改既定晋升数值；需要把普通资源归零改为永久死亡；V0.2 合法存档无法无损升级且只能删除；原子提交无法在当前 IndexedDB 架构实现；代表案件需要第二套语法或批量内容才能成立；或必须接入真实模型才能完成规则闭环。

V0.3 只有八项退出条件全部有证据后才可标记完成。完成后下一步仍是 V0.4 的独立全栈预审；不得直接宣称 MVP、启动 V1.0 批量内容或 V2.0 目标。
