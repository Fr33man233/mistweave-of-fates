# V0.4 新对话上下文交接：Checkpoint A

> 交接状态：Checkpoint A 已通过；新对话可在用户明确启动 Checkpoint B 后继续，但不得把该结果误称为 V0.4 已通过。
> 日期：2026-08-20
> 基线：`e92889c`；当前工作树为调用任务的 dirty worktree，所有未提交改动均需保留。
> 创建新任务前必须执行：[新对话与工作树交接安全门](../../新对话与工作树交接安全门.md)。初始消息不得包含编辑或真实模型调用授权。

## 1. 新对话先读什么

按以下顺序读取，优先级从高到低：

1. [平行廷根 AI Keeper 产品重定义与全栈预审](../specs/2026-08-20-parallel-tingen-ai-keeper-product-redefinition.md)
2. [V0.4 真实模型优先封闭纵向切片设计](../specs/2026-08-20-v04-real-model-vertical-slice-design.md)
3. [V0.4 实施计划](../plans/2026-08-20-v04-real-model-vertical-slice.md)
4. [DeepSeek V4 Flash 模型准入记录](../../model-evals/2026-08-20-deepseek-v4-flash-onboarding.md)
5. [新产品定义同步审查](../specs/2026-08-20-new-product-definition-sync-audit.md)
6. [文档索引](../../INDEX.md) 与 [版本定义与发布门](../../版本定义与发布门.md)

旧 V0.3 文件是历史候选，不得把瓦伦港规则、旧属性或旧路径直接当作新 V0.4 权威；现有 dirty worktree 里的旧 V0.3 改动不可回退或覆盖。

## 2. 产品与权限基线

- 平行廷根，接近原著开端时期；原作主线和核心人物不存在，地图可按内容调整。
- 当前内容包使用《诡秘之主》世界观/力量途径；内容包可替换，但在版权/授权未解决前只做本地/封闭测试，不公网发布大段原著内容。
- 严格 COC 7e；四世俗职业为药房学徒、记者、警探、码头工人。
- 四条批准路径：占卜家→小丑、观众→读心者、无眠者→午夜诗人、猎人→挑衅者；首阶段序列 9–8。
- MP 改为灵性；SAN 合并污染显示；扮演进度独立并含失控风险；序列晋升提高部分基础属性与灵性。
- Keeper/世界 AI 只能提出候选；确定性 TypeScript 规则核心校验、掷骰、提交状态和终局。玩家可预览、修改、撤回、确认。
- 继承/复活不早于 V1.0；死亡永久。模型不可用时必须可用确定性建议、保存、退出和恢复。
- 首个真实切片先做一个可控场景，不批量做四职业×四路径笛卡尔积。

## 3. Checkpoint A 已完成内容

已新增或修改的主要文件：

- `src/model/contracts.ts`、`src/model/provider.ts`、`src/model/fake-provider.ts`、`src/model/prompts.ts`
- `src/model/deepseek-provider.ts`
- `server/model/gateway.ts`、`server/model/vite-plugin.ts`
- `scripts/model-preflight.mjs`、`scripts/model-eval-t2.mjs`
- `src/model/*.test.ts`、`server/model/gateway.test.ts`
- `vite.config.ts`、`package.json`、`tsconfig.node.json`

底座行为：严格 Zod 合同；三类 Keeper 候选为 `execute | clarify | reject`；服务端才读取 `DEEPSEEK_API_KEY`；不使用 `VITE_*`；请求限长、超时、脱敏错误、最多一次 JSON 修复重试；模型没有工具、状态写入、掷骰或隐藏真相权限；默认自动化不访问外网。

## 4. 真实模型证据

### T0

- 通过；零真实调用。
- 配置、Schema、Prompt、假适配器、缺失 Key、错误脱敏、超时、空响应和非法 JSON 负例通过。

### T1（历史第一次调用）

- 只发送 1 次固定无敏感输入，HTTP/JSON 通过，但候选未满足固定 `clarify` 合同。
- 未重试、未切换模型、未发送游戏内容。
- 失败发生在成功摘要输出前，服务端返回模型 ID/usage/延迟的记录不完整；不得伪造补齐。
- 原始响应未落盘。

### T2 修正后代表集

- 5 次调用，处于用户批准的 T2 50 次/¥5 上限内；无自动重试、无模型切换、无游戏内容。
- 5/5 返回 JSON；实际模型均为 `deepseek-v4-flash`。
- `clarify`：2 例；`execute`：1 例；`reject`：2 例。
- 越权与提示注入接受数为 0。
- 合计：`input=657`、`cached_input=0`、`output=317`、`reasoning_output=0`、`total=974` tokens；延迟 712–1107ms，p50=986ms，p95=1107ms。
- 只保存安全元数据：候选类型、候选键集合、usage、延迟；不保存原始候选正文。

### T1 精确枚举复测（用户新授权）

- 两次历史 T1 失败保留为审计证据；根因是 Prompt 使用“clarification candidate”而合同只接受 `clarify`。
- 离线修正将系统 Prompt 固定为唯一 JSON 形状，并明确 `kind` 必须是小写 `clarify`；Prompt 版本 `t1-clarify-v2`。
- 新停止线内执行 1 次固定无敏感复测并通过：模型 `deepseek-v4-flash`，`input=106`、`cached_input=0`、`output=36`、`reasoning_output=0`、`total=142` tokens，延迟 `997ms`，候选类型 `clarify`。
- 自动重试、模型/供应商/协议切换和游戏内容发送均为 0；不保存密钥或原始候选正文。

### Checkpoint B T3 最小场景

- 用户明确授权发送廷根河岸最小可见场景、玩家行动与已提交确定性结果；两次调用完成 `execute` 解释与叙事 JSON。
- `keeper_interpret`：`202/0/63/0/265` tokens，`1149ms`；`keeper_narrate`：`207/0/33/0/240` tokens，`805ms`；模型均为 `deepseek-v4-flash`。
- 未发送源码、完整存档、隐藏真相或个人数据；不保存原始正文。结构化链路通过，叙事事实一致性仍需封闭试玩人工复核。

## 5. 当前阻塞与新对话第一步

Checkpoint A 已满足：用户单独授权的精确枚举 T1 复测通过，模型身份、Prompt 版本、分项 token 和延迟均可追溯。两次历史失败不改写，但不再阻断后续。

新对话下一步只在用户明确要求后进入 Checkpoint B；届时先实施独立 COC Schema、存档隔离与最小规则核心，不增加真实模型调用或 T3 预算。

## 6. 已验证的离线证据

- `tsc -b`：通过。
- Vitest：21 个测试文件、90 个测试通过；默认网络调用为 0。
- `vite build`：通过；浏览器构建中未发现服务端密钥。
- `git diff --check`：通过；仅有 Windows 换行提示。
- 精确枚举 T1 复测后的同一轮离线验证再次通过：Vitest 21 文件/90 测试、`tsc -b`、`vite build` 和密钥负向扫描。
- 尚未完成：浏览器人工验收、真实单场景 T3、世界 AI、COC 规则、V0.4 存档/UI；这些不应在 Checkpoint A 阻塞期间提前实现。

## 7. 继续开发时的安全边界

- 不提交、不推送、不清理 dirty worktree；不要 `reset --hard` 或覆盖既有 V0.3 文档/代码改动。
- 不把 API Key、完整仓库、完整存档、隐藏真相、真实个人数据或原著大段正文发送给模型。
- 不把模型候选直接写入权威状态；任何候选都必须经过本地 Schema、目录、场景版本和玩家确认。
- 所有 live eval 使用显式脚本、固定样例、独立预算和停止条件；失败先离线诊断，不盲目重复调用。
