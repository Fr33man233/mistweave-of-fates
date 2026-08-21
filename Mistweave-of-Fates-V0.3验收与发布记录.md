# Mistweave of Fates（灰雾织命）V0.3 验收与发布记录

> 状态：本地验收候选，未提交、未推送、未发布；版本定位为 pre-MVP 内部收敛版。
> 日期：2026-08-20
> 历史边界：本候选属于旧原创瓦伦港产品方向，已被[平行廷根 AI Keeper 产品重定义](docs/superpowers/specs/2026-08-20-parallel-tingen-ai-keeper-product-redefinition.md)覆盖；只保留为技术证据，不代表当前产品已经实现。
> 基线：`e92889c`（V0.2 首次晋升规则系统验证版）
> 设计规格：[V0.3 全栈预审与设计规格](docs/superpowers/specs/2026-08-20-v03-investigation-closure-design.md)
> 实施计划：[V0.3 真实调查闭环版实施计划](docs/superpowers/plans/2026-08-20-v03-investigation-closure.md)

## 1. 交付范围

本地候选实现一条原创代表案件“雾钟下的失窃航标”，以案件内核、最小调查语法、职业透镜、路径透镜和固化真相实例组成。四个首发职业共享同一案件入口；观察者与猎犬只改变合法方法、判定或代价，不复制职业×路径剧情。

已实现的用户闭环为：实名/性别建角 → 三次有即时反馈的调查 → 隐晦接触两条线索 → 主动获取安全或冒险材料 → 准备并二次确认首次服药 → 成功、带代价成功、普通失败或灾难失败 → 在后续事件内声明并使用能力。材料来源、成本、风险、事件游标、能力压力和恢复出口均由确定性 TypeScript 规则核心提交。

## 2. 八项退出条件证据

| 退出条件 | 结果 | 证据 |
|---|---|---|
| 六项 V0.2 试玩缺口关闭 | 通过 | `src/App.test.tsx`、`src/core/recovery.test.ts`、`src/core/ascension.test.ts`、`src/content/events/post-ascension-beacon.test.ts`；浏览器完成反馈、材料、晋升、能力、刷新恢复主流程 |
| 建角→调查→材料→晋升→能力连续闭环 | 通过 | `src/content/cases/stolen-beacon.test.ts`、`src/content/events/post-ascension-beacon.test.ts`；桌面浏览器本地流程完成 |
| 失败、死亡、恢复无已知必现软锁 | 通过（已测矩阵） | 普通失败进入 `restricted` 并经 `recoverPathway` 恢复；灾难失败永久失效；`recovery.test.ts`、`save.test.ts`、App 导航测试；未宣称穷举所有状态 |
| 三方法、三终局、双来源可达 | 通过 | `src/content/validate.test.ts`、`src/content/cases/stolen-beacon.test.ts`；内容校验拒绝重复/悬空引用与单来源关键事实 |
| 关键负例零权威变化 | 通过 | `src/core/actions.test.ts` 的重复/载荷冲突；Schema/存档损坏拒绝；能力不新增事实；固定 seed 重放测试 |
| 四职业与两路径透镜 | 通过 | `src/content/lenses.test.ts`、代表案件四职业 lens 与两 pathway lens；pairwise 组合由共享案件合同覆盖 |
| 工程、持久化和基础可用性 | 通过 | 18 个测试文件、83 个测试通过；TypeScript 构建检查通过；生产 Vite/PWA 构建通过；IndexedDB current/previous 与 V0.2 字段迁移测试通过 |
| 不错误宣称 MVP | 通过 | README、`docs/版本定义与发布门.md`、本记录均明确 V0.3 为 pre-MVP；未接真实模型、公共网关、账号、云存档或批量内容 |

## 3. 自动化与浏览器结果

- `tsc -b`：通过，无诊断。
- `vitest run`：18/18 测试文件、83/83 测试通过；最终报告时长 10.83 秒（含环境启动）。
- `vite build`：通过，111 modules transformed，PWA precache 5 entries；构建使用固定 Node 运行时，不修改系统 PATH。
- 本地桌面浏览器：已完成记者建角、三案谨慎调查、双线索、观察者安全材料、仪式准备、首次服药、事件内“痕迹感知”和刷新恢复；运行时/网络错误为 0，当前页面 `scrollWidth <= clientWidth`。
- 约 360px 视口：当前 Browser 插件能力未提供可写 viewport 的受信接口，未伪造该项人工视觉证据。响应式 CSS 静态检查保留 `min-width: 320px`、单列 `auto-fit` 和 `max-width: 640px` 规则；正式发布前仍需在可控移动视口补测。
- 离线边界：生产代码无真实模型、API key、账号或业务网络请求；静态 PWA 仍可依赖浏览器缓存和宿主静态资源。

## 4. 迁移、回滚与故障恢复

- 存档信封版本为 `0.3.0`，保存时在同一 IndexedDB transaction 中保留上一份 `previous` 快照；完整性校验失败时优先回退上一份，双快照均失败或未来版本拒绝加载。
- V0.1/V0.2 合法角色缺少姓名、性别或初始意愿时只填入明确默认显示值，不推断身份；死亡、活动角色引用和轨道准备状态继续经过一致性门禁。
- 本地回滚点为基线 `e92889c`；本轮未提交、未推送，未改变远端 Pages。生产发布前应先由用户决定是否提交当前文档与代码，再按版本发布流程构建和线上验收。

## 5. 资源效率与已知问题

- 当前成本：零模型 token、零外部 API 调用；全量 83 项测试约 10.83 秒，生产构建为一次本地 Vite/PWA 构建。定向测试复用共享建角、三案和晋升夹具，避免每个任务重复全量回归。
- 预期改进：继续复用 CaseCore/透镜/固定 seed/双快照校验，后续新增案件不复制职业×路径内容；浏览器主流程应固化为一次可重复冒烟脚本。
- 已知问题：移动窄视口人工验收尚未在当前 Browser 插件能力下完成；V0.3 不覆盖真实模型自由行动、50 回合连续性、外部玩家反馈、公网成本和运营安全。历史已完成晋升且已经使用过能力的存档不会重复生成同一后续事件；新晋升或迁移后未完成能力事件的存档会开放后续调查入口。

## 6. 发布结论

V0.3 代码与本地验收证据达到本设计规格的内部 GO，可进入用户审阅和后续版本发布决策；它不是 MVP 发布门，也不授权自动提交、推送或 GitHub Pages 发布。若用户批准版本提交，下一步应先完成约 360px 视觉验收，再按版本定义与发布门执行提交、构建、回滚演练和（如另行批准）公网投放。
