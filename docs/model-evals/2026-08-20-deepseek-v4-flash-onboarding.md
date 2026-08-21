# DeepSeek V4 Flash 模型准入记录

> 状态：T0/T1/T2 与 Keeper T3 已通过；世界提案 T3 增量仅通过安全空提案/拒绝路径，真实提案连续链仍 NO-GO
> 日期：2026-08-20
> 用途：Mistweave of Fates V0.4 的首个真实 Keeper 与世界 AI B+ 候选
> 关联：[V0.4 设计规格](../superpowers/specs/2026-08-20-v04-real-model-vertical-slice-design.md) · [V0.4 实施计划](../superpowers/plans/2026-08-20-v04-real-model-vertical-slice.md)

## 1. 已确认身份与协议

| 项目 | 已确认值 | 官方证据 |
|---|---|---|
| 供应商 | DeepSeek | [DeepSeek API Docs](https://api-docs.deepseek.com/) |
| 准确模型 ID | `deepseek-v4-flash` | [模型与价格](https://api-docs.deepseek.com/zh-cn/quick_start/pricing/) |
| 模型版本名 | DeepSeek-V4-Flash | [模型与价格](https://api-docs.deepseek.com/zh-cn/quick_start/pricing/) |
| OpenAI 兼容基址 | `https://api.deepseek.com` | [模型与价格](https://api-docs.deepseek.com/zh-cn/quick_start/pricing/) |
| 接口 | OpenAI Chat Completions；也提供 Anthropic 兼容接口 | [V4 更新记录](https://api-docs.deepseek.com/updates/) |
| 上下文/最大输出 | 1M / 最大 384K | [模型与价格](https://api-docs.deepseek.com/zh-cn/quick_start/pricing/) |
| 结构化输出 | JSON Output；Prompt 必须明确要求 JSON，且存在偶发空内容风险 | [JSON Output](https://api-docs.deepseek.com/zh-cn/guides/json_mode) |
| 思考模式 | 支持开启/关闭，默认开启；支持 `high/max` | [思考模式](https://api-docs.deepseek.com/guides/thinking_mode/) |
| 上下文缓存 | 磁盘缓存默认启用，usage 可区分命中 | [Context Caching](https://api-docs.deepseek.com/guides/kv_cache/) |
| 公开价格快照 | 缓存命中输入 ¥0.02/M、未命中输入 ¥1/M、输出 ¥2/M | [模型与价格](https://api-docs.deepseek.com/zh-cn/quick_start/pricing/) |

价格和能力可能变化，每次进入新发布门或更换模型版本前必须重新核验官方页面。旧模型名 `deepseek-chat`、`deepseek-reasoner` 已在官方时间表中弃用，项目只使用准确 ID `deepseek-v4-flash`。

## 2. V0.4 路由决定

- `keeper_interpret`：首轮默认关闭思考模式，使用 JSON Output 和本地 Zod Schema，目标是低延迟、稳定 `execute | clarify | reject`。
- `keeper_narrate`：首轮默认关闭思考模式；只接收已提交且玩家可见的 `ResolutionEnvelope`，输出长度受限。
- `world_propose`：仍使用 `deepseek-v4-flash`；首轮路由关闭思考模式以优先保证结构化 JSON，待独立样本证明 `high` 在正确性上有净收益后再开启。
- 不启用模型工具调用。游戏不把掷骰、状态读取、文件、网络或提交动作暴露为模型工具。
- 不使用 1M 上下文作为产品预算。首轮采用最小可见场景切片和结构化摘要，端点分别设置远低于模型上限的输入/输出限额。

JSON Output 只保证响应可解析为 JSON，不保证符合业务 Schema，也不保证内容真实。空内容、未知字段、非法 ID、越权状态字段和截断响应必须拒绝；只允许一次有界重试。

## 3. 凭据边界

- 用户已经确认持有 API Key，但 Key 不进入聊天、Prompt、工具参数、源代码、`.env.example` 值、日志、测试夹具、浏览器包、localStorage 或 IndexedDB。
- 本地模型网关只从服务端环境变量 `DEEPSEEK_API_KEY` 读取 Key；变量名可进入文档，变量值不得进入项目。
- 禁止使用 `VITE_DEEPSEEK_API_KEY` 或任何 `VITE_*` 名称，因为 Vite 会把它暴露给浏览器代码。
- 网关启动只检查变量是否存在，不打印值或长度；401/402/429/5xx 统一映射为脱敏错误。
- 出现泄漏或疑似泄漏时立即停止调用、撤销/轮换 Key、清理本地调试记录并保留不含密钥的事故证据。

## 4. 数据与隐私边界

DeepSeek 的[隐私政策](https://cdn.deepseek.com/policies/en-US/deepseek-privacy-policy.html)说明服务会处理用户输入，可能用于服务改进和模型训练，提供退出训练用途的选择；数据可能在中华人民共和国境内处理，保留时间取决于用途、敏感度和法律要求。官方同时要求不要提交敏感个人数据。V0.4 因此采用以下默认边界：

### 4.1 T1 允许发送

- 一条固定、无游戏设定、无个人数据的合成文本；
- 一个只要求返回 `clarify` JSON 的最小 Schema 例子。

### 4.2 T2/T3 已批准发送

- 平行廷根事件的最小原创场景摘要；
- 当前玩家可见的 NPC、地点、物体和危险前兆；
- COC 技能、资源和已解锁能力的最小投影；
- 玩家在封闭测试中主动输入的游戏行动文本；
- 已提交且玩家可见的判定结果，用于 Keeper 叙事。

### 4.3 始终禁止发送

- API Key、私有源码、完整仓库文件、完整设计文档或完整存档；
- 案件隐藏真相、未发现线索、其他角色私有状态和无关事件历史；
- 真实姓名、联系方式、账号标识、精确位置、健康、未成年人或其他敏感个人数据；
- 大段原著原文、未授权内容资产或与当前场景无关的设定全文。

`user_id` 只使用随机/哈希化的本地会话 ID，不包含姓名或其他个人信息；官方说明它用于缓存、内容安全和调度隔离。

## 5. 调用与费用预算候选

用户已确认以下首轮上限：

| 阶段 | 调用上限 | 费用停止线 | 内容 |
|---|---:|---:|---|
| T1 | 1 次 | ¥1 | 固定无敏感 JSON 连通性 |
| T2 | 50 次 | ¥5 | 脱敏 `execute/clarify/reject` 代表集与少量模式对照 |
| T3 + 首轮封闭试玩 | 200 次 | ¥20 | 单场景 Keeper、一次世界提案及人工体验 |

任一上限先到即停止。相同失败在 Prompt、合同或代码没有变化时不得重复付费调用。实际成本按官方 usage 记录 input、cached input、output 和 reasoning；缓存与 reasoning 若属于总量子集不得重复相加。

## 6. T0–T3 退出证据

- `T0`：配置、Schema、Prompt、假适配器、缺失 Key、错误脱敏、超时和空内容负例通过，真实调用为 0；本次已通过。
- `T1`：已执行 1 次固定无敏感调用，HTTP/JSON 阶段通过，但返回 JSON 未满足固定 `clarify` 合同，因此 T1 未通过；未重试、未换模型、未发送游戏内容。原始模型输出不落盘。
- 本次失败发生在成功路径的模型/usage 摘要输出前，因此实际返回的模型 ID、usage 和延迟没有形成完整证据；不得用请求参数中的模型 ID 代替服务端返回值。
- `T1 修复后复测`（用户单独授权，独立于历史 T1）：已执行 1 次固定无敏感调用；HTTP/JSON 阶段通过，但候选 `kind` 为未接受的 `clarification`，不是合同要求的 `clarify`，故复测未通过。实际返回模型为 `deepseek-v4-flash`；安全元数据为 `input=68`、`cached_input=0`、`output=43`、`reasoning_output=0`、`total=111` tokens，延迟 `1045ms`，候选键集合为 `allowedAnswerHints/kind/question`。自动重试、模型切换和游戏内容发送均为 `0`；原始候选正文与密钥均未落盘。
- `T1 精确枚举复测`（用户新授权，独立停止线）：离线将 Prompt 固定为唯一允许的 `kind: "clarify"` 后，执行 1 次固定无敏感调用并通过。实际模型为 `deepseek-v4-flash`，Prompt 版本为 `t1-clarify-v2`；安全元数据为 `input=106`、`cached_input=0`、`output=36`、`reasoning_output=0`、`total=142` tokens，延迟 `997ms`，候选类型为 `clarify`。自动重试、模型/供应商/协议切换和游戏内容发送均为 `0`；原始候选正文与密钥均未落盘。
- `T2`：代表集至少 80% 正确执行或合理澄清；越权状态、隐藏事实和未经确认风险动作接受数为 0。
- `T3`：真实 Keeper 走通单场景输入→预览→确认→规则提交→结果叙事；一次世界 AI 候选经门禁提交或解释性拒绝；模型失败不阻塞保存/退出/恢复。

### 6.2 T3 最小单场景验证（2026-08-20）

- 用户明确授权发送“廷根河岸”最小可见场景、玩家行动“我检查路边木箱上留下的划痕。”和已提交确定性结果；未发送原始候选正文、源码、完整存档、隐藏真相或个人数据。
- 调用数：2/200；自动重试：0；模型/供应商/协议切换：0。
- `keeper_interpret`：`execute` 合同通过；模型 `deepseek-v4-flash`，`input=202`、`cached_input=0`、`output=63`、`reasoning_output=0`、`total=265` tokens，延迟 `1149ms`。
- `keeper_narrate`：仅接收已提交 resolution，叙事 JSON 合同通过；模型 `deepseek-v4-flash`，`input=207`、`cached_input=0`、`output=33`、`reasoning_output=0`、`total=240` tokens，延迟 `805ms`。
- 原始模型正文没有落盘，因此本次只能证明结构化链路和权限边界；Keeper 叙事与事实的人工语义一致性仍需在后续封闭试玩中单独验收，不能提前宣称为零矛盾。

### 6.3 世界提案 T3 增量验证（2026-08-21）

- 用户授权范围：只发送廷根河岸最小可见对象、无个人数据的人物资源投影、允许模板和 `scene-0` 检查点；不发送源码、完整存档、隐藏真相或原始原著正文。
- 前四次调用均为显式单次调用、无自动重试、无模型/供应商切换；随后用户另行授权一次明确限额调用，累计 T3 为 7/200。
- 第 1 次（思考开启、`max_tokens=500`）和第 2 次（思考开启、`max_tokens=1200`）均因 JSON 输出截断失败；元数据分别为 `537/0/500/500/1037`、`537/512/1200/1200/1737` tokens，延迟 `6000ms`、`12044ms`。
- 离线将世界提案首轮路由改为关闭思考模式后，第 3 次返回合法空提案列表，边界通过但没有新增临时提案：`458/0/6/0/464` tokens，`859ms`。
- 为验证“候选被接受”而修改提示要求必须提出一个允许提案，第 4 次未满足结构/边界合同并停止：`462/0/126/0/588` tokens，`1837ms`。没有读取或保存原始候选正文。
- 新授权的第 5 次调用使用关闭思考、`max_tokens=512`、精确 JSON 示例和零重试；返回一个合法 `temporary-danger` 提案并通过独立边界检查。模型 `deepseek-v4-flash`，`471/0/77/0/548` tokens，`971ms`，`finish_reason=stop`；根对象和提案字段集合完全匹配，候选正文仍未保存。
- 结论：`512` 的输出上限足够完成该短合同；前两次失败的主要原因是思考模式耗尽单次生成预算，而不是账号 token 额度不足。第三次空提案来自提示允许空数组；第四次是在未给出精确示例时的 Schema 遵循失败。真实提案合同已在隔离脚本中通过，但浏览器真实网关提交和 Keeper/占卜连续链仍需单独验收。

### 6.4 浏览器真实网关世界提案（2026-08-21）

- 用户另行授权下一步后，将生产世界提案 Prompt 升级为 `world-v2`：关闭思考、`max_tokens=512`、动态提供一个只引用当前可见稳定 ID 的精确 JSON 示例。
- 在 `http://127.0.0.1:5175/` 的现有 V0.4 档案中只点击一次“请求真实世界模型提案”；候选通过真实 Vite 网关、本地 Schema、允许模板、可见对象和检查点校验，生成一条玩家可见的临时环境变化。
- 页面显示 1 条不含原始文本的模型交互元数据；刷新后环境提案和元数据数量均恢复，历史模型请求没有自动重放。
- 本次浏览器调用计入 T3，累计 8/200；浏览器界面未暴露该次 usage/延迟的具体数值，因此不伪造补齐。原始候选对象、Prompt、密钥、隐藏真相和档案姓名均未发送或记录。
- 结论：真实世界提案的“浏览器→真实网关→本地校验→临时状态→刷新恢复”链路通过；尚未完成 Keeper 行动、世界提案与占卜能力组合在同一任务链中的人工事实一致性复核。

### 6.1 T2 修正后代表集（2026-08-20）

- 调用数：5/50；自动重试：0；模型切换：0；发送游戏内容：0。
- 5/5 返回可解析 JSON；实际模型字段均为 `deepseek-v4-flash`。
- `ambiguous`、`clarify_target` 返回 `clarify`；`legal_execute` 返回 `execute` 且候选键集合符合预期；`illegal_reject`、`injection_reject` 返回 `reject`。
- 越权/提示注入样例接受数：0；原始候选正文不落盘，仅保留候选类型、键集合、usage 和延迟。
- 分项元数据：总计 `input=657`、`cached_input=0`、`output=317`、`reasoning_output=0`、`total=974` tokens；单例延迟 712–1107ms（p50=986ms，p95=1107ms，样本 n=5）。
- 该结果证明当前分类 Prompt 与三分支合同在 T2 样本上可用；随后精确枚举 T1 复测成功，Checkpoint A 的真实模型准入条件已满足。

任何一级失败不得跳级、静默改用 `deepseek-v4-pro`、旧模型别名、其他供应商或第三方中转。

## 7. 用户授权记录

- 已允许把 4.2 列出的最小场景切片和封闭玩家输入发送给 DeepSeek API。
- 已接受历史 T1/T2/T3 分别为 ¥1/¥5/¥20 的停止线以及 1/50/200 次调用上限；在两次历史 T1 失败后，额外单独批准 1 次精确枚举 T1 复测，现已消耗且通过。
- 已确认关闭将输入用于训练。

授权不覆盖 4.3 的始终禁止数据，也不允许自动提高停止线或改用其他模型/供应商。

## 8. T1 失败后的处理

### 8.1 两次失败复测与精确枚举通过复测（2026-08-20）

- 复测前的最小修复：失败诊断现在也记录实际模型、分项 usage 与延迟，不保存原始候选正文。
- 用户为这次复测单独授权了 1 次固定无敏感调用；实际模型为 `deepseek-v4-flash`，调用 `1/1`，自动重试 `0`，模型/供应商/协议切换 `0`。
- HTTP 与 JSON 通过，但候选 `kind` 是 `clarification` 而不是严格合同的 `clarify`；候选键集合为 `allowedAnswerHints/kind/question`，所以结果为 `t1_schema_mismatch`。
- 安全元数据：`input=68`、`cached_input=0`、`output=43`、`reasoning_output=0`、`total=111` tokens，延迟 `1045ms`。未记录密钥、原始候选、游戏内容、源码、完整文档/存档、隐藏真相或个人数据。
- 上述复测次数已耗尽；后续精确枚举复测经用户新授权后才执行。

### 8.2 精确枚举 T1 复测通过（2026-08-20）

- 最小离线修复：系统 Prompt 明确要求唯一 JSON 形状，且 `kind` 必须是小写 `clarify`，禁止 `clarification` 等近似枚举；脚本记录 `promptVersion=t1-clarify-v2`。
- 用户单独授权 1 次新 T1 停止线；调用 `1/1`，实际模型为 `deepseek-v4-flash`，HTTP/JSON/严格合同均通过。
- 安全元数据：`input=106`、`cached_input=0`、`output=36`、`reasoning_output=0`、`total=142` tokens，延迟 `997ms`，候选类型 `clarify`。
- 自动重试、模型/供应商/协议切换和游戏内容发送均为 `0`；不记录密钥或原始候选正文。
- 复测后离线验证通过：Vitest 21 文件/90 测试、`tsc -b`、`vite build`、`git diff --check` 和密钥负向扫描。Checkpoint A 通过；仍需用户后续明确指令才可进入 Checkpoint B。

- 失败类别：`t1_schema_mismatch`；问题在模型输出与应用合同之间，不是 API Key 泄漏或权限越权证据。
- 失败调用数：1；自动重试数：0；模型切换数：0；游戏内容发送量：0。
- 历史失败后的处置已完成：先离线修正 Prompt/合同/解析诊断，再由用户单独授权精确枚举 T1 复测；历史失败记录保留，不改写为通过。
- Windows 预审脚本的直接进程退出已改为设置 `process.exitCode`，避免失败路径关闭异步句柄时产生宿主断言。
- T2 已按用户批准的 T2 停止线执行；“Checkpoint A 的 T1 成功”硬条件已由 8.2 的独立授权复测满足。
