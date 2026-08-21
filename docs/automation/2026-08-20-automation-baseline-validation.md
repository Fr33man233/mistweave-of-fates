# 自动化测试平台 V1 基线验收记录

> 日期：2026-08-20
> 状态：本地候选 GO，未提交、未推送

## 1. 交付范围

- Playwright Test 1.62.1，桌面 Chrome/Chromium 单项目。
- Vite Node API 自动启动与关闭，不依赖人工服务。
- 每测试独立 BrowserContext、Service Worker 禁用、外部网络阻断。
- 浏览器 `console.error`、`pageerror`、截图和 trace 失败证据。
- 仅在 `VITE_E2E=1` 注册的 `render_game_to_text()` 白名单状态投影。
- 1 个跨版本 shared 场景、6 个 V0.4 场景。
- `loop:fast`、`test:e2e`、`test:automation` 和可选 `loop:full` 命令。
- 生产构建测试钩子泄漏自动检查。

## 2. 验证结果

| 检查 | 结果 | 证据 |
|---|---|---|
| Vitest | PASS | 33 个文件、123 个测试通过 |
| TypeScript 与 Vite 构建 | PASS | 123 个模块转换，PWA 产物生成 |
| 生产测试边界 | PASS | `dist` 不含 `render_game_to_text`、`automationStateVersion`、`active-character` |
| Playwright 基线 | PASS | 7/7，约 10 秒 |
| 隔离复跑 | PASS | 连续第二次 7/7，约 10 秒，无串档 |
| 完整命令 | PASS | `pnpm test:automation` 完成 123 个 Vitest、构建、边界扫描和 7 个 E2E，约 33 秒 |
| Actions 环境入口模拟 | PASS | `GITHUB_ACTIONS=true` 时 Vite E2E 仍强制使用本地根路径，shared 冒烟 1/1 |
| 外部网络 | PASS | fixture 只允许本地/data/blob；未出现外部请求 |
| 真实模型调用 | PASS | 0 次；未读取或发送密钥 |
| Git 差异格式 | PASS | `git diff --check` 无错误，仅有既有 Windows 行尾提示 |

## 3. 建设中发现并关闭的问题

1. **pnpm store 不一致**：沙箱默认 store 与既有 `node_modules` 链接位置不同。安装时显式复用既有 store，没有重装全部依赖。
2. **Playwright Chromium 下载超时**：三分钟停止线内未完成。改用已安装且版本匹配的系统 Chrome；CI 仍可显式启用托管 Chromium。
3. **强制删 IndexedDB 产生假失败**：React 已打开旧数据库后删除会触发 `blocked`。改为依赖 Playwright 每测试独立 BrowserContext，不再修改正在运行应用的数据库。
4. **Windows Vite 子进程未及时退出**：从 `webServer` shell 子进程改为 global setup 中直接使用 Vite Node API，并在 teardown 显式关闭。
5. **宽泛文本定位不稳定**：`行动预览` 同时出现在阶段、反馈和标题中。改用精确可见文本，保留语义定位。
6. **本地 CI 环境变量模拟触发 pnpm 重建依赖**：一次模拟误触 pnpm 的 CI 安装策略并清空 `node_modules` 链接；已把残缺目录移动到临时备份，并按锁文件从既有 store 完整恢复 436 个包。恢复后完整自动化再次通过，源码和存档未受影响。后续 Actions 入口模拟使用直接 Node 命令，不在本地改变 pnpm CI 模式。

## 4. 当前已知限制

- 默认依赖本机 Google Chrome；无 Chrome 的环境需安装 Playwright Chromium 并设置 `PLAYWRIGHT_USE_BUNDLED_CHROMIUM=1`。
- GitHub Pages 工作流已增加 `test:automation` 发布前门禁，但当前改动未提交、未推送，因此尚无远端 CI 实际运行证据。
- 刷新公共入口后会先回到旧主菜单；测试通过重新进入 V0.4 验证快照恢复。是否改为直接续玩属于产品 UX 决策，不在本次基础设施中修改。
- 尚未覆盖多角色切换、真实模型重试 UI、世界 AI、占卜能力连续链；这些仍是 V0.4 产品阻断项，不应伪装成自动化平台失败。
- 移动端、Firefox/WebKit、像素视觉基线和真实模型 E2E 均按范围延期。

## 5. 资源结果

- 快速门约 21 秒；桌面 E2E 约 10 秒；完整自动化约 33 秒。
- 成功场景不保存视频或截图；失败才保存 screenshot 和 trace。
- 默认自动化为零外部 API、零模型 token、零人工服务启停。

## 6. 结论

自动化测试平台 V1 **GO**：可以作为后续版本共享基础设施。Loop Engineering 仍为可选工作法，不影响单独执行 `test:e2e` 或 `test:automation`。
