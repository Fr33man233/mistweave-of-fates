# Mistweave of Fates（灰雾织命）：V0.1 验收与发布记录

> 版本：V0.1 连续调查 MVP
> 状态：已验收并公开发布
> 验收日期：2026-08-19
> 代码基线：功能发布提交为 `2023dbf`；其后 V0.1 文档重命名与 Pages 同步提交为 `674eb77`。

## 已交付范围

- 单城市瓦伦港的本地持续调查原型。
- 三个原创案件及两阶段调查选择。
- 确定性 D100、事件游标、时间推进、线索、警方关注与本地自由行动解析。
- 浏览器 IndexedDB 存档与恢复模块。
- React/Vite/PWA 客户端与 GitHub Pages 试玩发布。

## 验收结果

| 检查 | 结果 | 证据 |
|---|---|---|
| 自动化测试 | 通过 | `pnpm test`：7 个测试文件、20 项测试通过 |
| TypeScript 与生产构建 | 通过 | `pnpm build`：`tsc -b`、Vite、PWA service worker 与 precache 成功 |
| 公开仓库 | 已发布 | [GitHub 仓库](https://github.com/Fr33man233/mistweave-of-fates) |
| 浏览器试玩 | 已发布 | [GitHub Pages](https://fr33man233.github.io/mistweave-of-fates/) |

## 已知限制

V0.1 不包含角色创建、死亡角色卡、魔药/晋升、真实 LLM、图像生成、多人、完整经济、战斗或跨城旅行。这些不构成 V0.1 验收失败，而是 V0.2 及后续版本的明确范围。

## 后续版本

[V0.2 首次晋升体验版设计](./docs/superpowers/specs/2026-08-19-v02-first-ascension-design.md) 承接 V0.1 的案件、状态机、D100 与存档能力，新增角色卡和首次超凡成长链。
