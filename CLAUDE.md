# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 运行测试

```bash
# 运行全部测试套件
cd tests && bash run-all.sh

# 运行单个模块
node tests/test-c1-hash-consistency.js
node tests/test-c2-context-proxy.js
node tests/test-c3-instruction-strings.js
node tests/test-c4-quality-fsm.js
node tests/test-c5-integration-smoke.js
```

测试无需 `npm install`（`package.json` 仅声明 `"type": "commonjs"`，无外部依赖）。

## 前置条件

测试文件依赖 `~/.claude/hooks/` 下的 Forge hooks：

- `forge-shared.js` — 共享工具库（hash、路径、bridge 读写）
- `forge-context-bridge.js` — C2 上下文代理 hook
- `forge-quality-pipeline.js` — C4 质量门 FSM

运行时数据位于 `~/.forge/runtime/bridges/{hash}/bridge.json`（schema v2）。

## 架构概览

### Bridge（核心数据结构）

`bridge.json` 是 Forge 引擎的运行时状态文件，所有测试围绕它展开：

```
{
  _schema_version: 2,
  project: { cwd, slug, isWeb, flowType },
  phase:   { current, total, phaseEpoch },
  change:  { changeEpoch, touchedFiles, planWrittenAt, securityRisk },
  gates:   { plan_review, tests, code_review, qa, security, benchmark, ship },
              每个 gate: { status, epoch, leaseUntil, failCount }
  contextProxy: { sessionId, toolCallCount },
  context: { warningLevel, lastSaveAt },
  audit:   { lastToolName, updatedAt }
}
```

文件路径由项目根目录的 MD5 hash（12 位）决定：
`~/.forge/runtime/bridges/{md5(realpathSync(projectRoot)).slice(0,12)}/bridge.json`

### 测试模块分工

- **C1**：验证 hash 算法在 CJS/ESM、macOS symlink、子目录等场景下的一致性
- **C2**：验证 `forge-context-bridge.js` hook — toolCallCount 递增、session 切换重置、context warning 阈值（proxy_warning=200, proxy_critical=350）、leased 守卫防误跳转
- **C3**：验证指令字符串注入逻辑
- **C4**：验证质量门 FSM（`nextGateToInject`）— 触发顺序、epoch 过期、lease 有效期、failCount≥3 升级为 escalation
- **C5**：端到端集成冒烟测试

### 共享测试工具（`tests/test-helpers.js`）

| 工具                             | 用途                                                     |
| -------------------------------- | -------------------------------------------------------- |
| `makeFullBridge(overrides)`      | 创建完整 bridge 对象（含所有默认字段，防 schema 漂移）   |
| `spawnHook(hookFile, stdinData)` | 以子进程方式运行 hook，返回 `{exitCode, stdout, stderr}` |
| `setupForgeTmpDir()`             | 创建带 git init 和 `.planning/STATE.md` 的临时目录       |
| `cleanupForgeTmpDir(dir)`        | 清理临时目录及对应 bridge 文件                           |
| `getBridgePathForDir(realRoot)`  | 根据项目根路径计算 bridge.json 的完整路径                |

### Gate 状态机

每个质量门的合法状态：`idle → leased → passed | failed`

- `leased`：已注入但等待结果，`leaseUntil` 过期后视为超时重新注入
- `failCount ≥ 3`：升级为 `escalation` 门，停止重试
- `epoch` 必须匹配当前 `changeEpoch`，否则视为过期结果重新触发
