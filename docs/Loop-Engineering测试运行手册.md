# Mistweave of Fates 跨版本自动化测试与 Loop Engineering 运行手册

> 状态：自动化测试平台 V1，本地未提交
> 设计依据：[跨版本自动化测试平台全栈预审与设计](superpowers/specs/2026-08-20-cross-version-test-automation-design.md)

## 1. 定位

测试平台只建设一次，之后跨版本复用。每个新版本只新增版本场景、固定夹具和迁移测试，不重新安装或重写测试框架。

测试分为三层：

- `src/**/*.test.ts(x)`：规则、Schema、组件、存储和模型离线合同；
- `tests/e2e/shared/`：跨版本永久冒烟和安全边界；
- `tests/e2e/vXX/`：当前版本玩家流程场景。

Loop Engineering 是可选的工作习惯，不是自动测试通过的前置条件。默认顺序是“改动 → 快速门 → 相关 E2E → 必要修复 → 完整门”。

## 2. 一次性环境准备

```powershell
pnpm install --frozen-lockfile
```

当前本地配置默认使用已经安装的 Google Chrome，避免重复下载浏览器。若 CI 或其他环境需要 Playwright 托管 Chromium：

```powershell
pnpm exec playwright install chromium
$env:PLAYWRIGHT_USE_BUNDLED_CHROMIUM = '1'
pnpm test:e2e
```

真实模型密钥不属于自动化测试依赖。默认命令不得读取 API Key 或调用外部模型。

## 3. 常用命令

### 快速确定性门

```powershell
pnpm loop:fast
```

依次运行全部 Vitest、生产构建和生产测试边界扫描。失败后停止，不运行浏览器测试。

### 浏览器 E2E

```powershell
pnpm test:e2e
```

Playwright 通过 Vite Node API 自动启动 `127.0.0.1:4173`，执行桌面 Chromium 场景并自动关闭服务。不复用人工已启动的开发服务。

### 完整自动化门

```powershell
pnpm test:automation
```

等价于快速门通过后再执行全部 E2E。`pnpm loop:full` 是可选别名。

### 只跑相关场景

```powershell
pnpm test:e2e -- --grep "行动预览"
```

开发过程中优先运行相关场景；发布候选必须运行完整自动化门。

## 4. 当前场景基线

| ID | 层级 | 场景 | 核心断言 |
|---|---|---|---|
| S01 | shared | 公共入口进入 V0.4 | 入口可见；测试状态合同为 `1.0.0`；零外部调用；无禁止字段 |
| V04-01 | v04 | 建立人物档案 | 姓名/性别必填；无“非二元”新建选项；属性实时变化 |
| V04-02 | v04 | 随机/平均分配 | 固定 seed；属性、职业技能和兴趣技能预算可用尽 |
| V04-03 | v04 | 预览与撤回 | 撤回不提交事件、不增加事实、不改变事件游标 |
| V04-04 | v04 | 结算与恢复 | 即时反馈、固定 D100、事实、requestId、刷新后重新进入恢复一致 |
| V04-05 | v04 | 未知自由行动 | 产生澄清；规则状态、事件游标和事实不改变 |
| V04-06 | v04 | 退出当前事件 | 丢弃未提交预览；已提交世界状态不回退 |

跨版本永久规则仍主要由 Vitest 保护，包括幂等、模型越权拒绝、COC 公式、存档校验、世界提案和能力白名单。

## 5. 状态投影

Playwright 启动 Vite 时设置 `VITE_E2E=1`。只有此模式下页面才注册：

```javascript
window.render_game_to_text()
```

它返回紧凑 JSON 字符串，只包含玩家可见和测试必需状态。不得加入：

- 角色真实姓名或可反推姓名的 ID；
- 原始自由输入；
- Prompt 或模型原始响应；
- API Key、请求头或凭据；
- 未发现事实、隐藏真相或完整存档；
- 无界历史记录。

新增字段必须更新 `automationStateVersion` 或保持向后兼容，并增加白名单单元测试。

## 6. 隔离、网络与失败证据

- 每个 Playwright 测试获得新的 BrowserContext，IndexedDB、Storage、Cookie 和 Cache 不跨场景共享。
- Service Worker 在测试中禁用，避免 PWA 缓存干扰。
- 只允许访问 `127.0.0.1`、`localhost`、`data:` 和 `blob:`；任何外部请求都使测试失败。
- `console.error` 和未捕获 `pageerror` 统一使测试失败。
- 本地与 CI 默认重试次数为 0；先修复 flaky，不用重试掩盖。
- 失败时保存 `test-results/` 中的截图、trace 和错误上下文；HTML 报告位于 `playwright-report/`。

查看报告：

```powershell
pnpm test:e2e:report
```

## 7. 新版本接入规则

进入 V0.5 或后续版本时：

1. 保留 `shared` 场景；
2. 新增 `tests/e2e/v05/`，不复制 fixture 和服务配置；
3. 只有产品合同真实变化时才更新状态投影；
4. 为 V0.4 合法存档升级到 V0.5 增加迁移测试；
5. 删除玩法时把旧场景标记并记录原因，不静默删掉回归证据；
6. 新增真实模型场景时必须使用独立命令和既有 T0–T3 授权，不并入默认自动化门。

现有 GitHub Pages 工作流在部署前执行 `pnpm test:automation`。任一规则、构建、生产边界或桌面 E2E 失败都会阻止部署；本地未提交文件不会触发该工作流。

## 8. 可选 Loop Engineering

对一个明确目标执行：

1. 写下可观察结果和受影响层；
2. 做最小改动；
3. 运行相关 Vitest 或 E2E；
4. 查看状态投影、失败截图、trace 和控制台；
5. 一次修复一个已定位问题；
6. 重跑触发场景；
7. 共享规则、存档或入口变化时运行 `pnpm test:automation`。

官方 `develop-web-game` Skill 的“小步修改、状态投影、截图复核”原则可以作为此循环的参考，但其 Canvas、帧推进和自带 Playwright 客户端不适用于当前 DOM 为主的文字 RPG。`game-playtest` 可作为发布前人工视觉检查清单，但不替代项目内自动化断言。

## 9. 停止规则

- Vitest 或构建失败：停止 E2E。
- 浏览器状态与页面不一致：按功能缺陷处理。
- 场景出现外部网络请求：按隐私/测试隔离缺陷处理。
- 连续两次运行结果不一致：先治理 flaky 和异步存档，不扩大场景。
- Chrome/Chromium 不可用：明确报告环境失败，不把人工点击记为自动化通过。
- 真实模型调用没有新的明确授权：停止在离线边界。
