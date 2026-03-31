# cc-workflow-automation

Forge 工作流引擎的自动化测试套件，用于验证 Claude Code hooks 核心组件的正确性。

## 前置要求

1. **安装 Claude Code**（[官方文档](https://docs.anthropic.com/claude-code)）
2. **安装 Forge 工作流插件** — Forge hooks 需存在于 `~/.claude/hooks/`
3. **Node.js** v18+

## 安装

```bash
git clone https://github.com/DZMing/cc-workflow-automation
cd cc-workflow-automation/tests
npm install
```

## 运行测试

```bash
cd tests
bash run-all.sh
```

或单独运行某个模块：

```bash
node tests/test-c1-hash-consistency.js
```

## 测试模块

| 文件                             | 模块 | 说明                              |
| -------------------------------- | ---- | --------------------------------- |
| `test-c1-hash-consistency.js`    | C1   | Bridge 路径 hash 一致性（8 用例） |
| `test-c2-context-proxy.js`       | C2   | 上下文代理 hook                   |
| `test-c3-instruction-strings.js` | C3   | 指令字符串处理                    |
| `test-c4-quality-fsm.js`         | C4   | 质量门控有限状态机                |
| `test-c5-integration-smoke.js`   | C5   | 集成冒烟测试                      |

## 项目结构

```
tests/
  run-all.sh              # 运行全部测试
  test-helpers.js         # 共享测试工具
  test-c1-*.js ~ test-c5-*.js  # 各模块测试
```

## 常见问题

**测试报错 "Cannot find module forge-shared"**
→ 说明 `~/.claude/hooks/forge-shared.js` 不存在，需先安装 Forge hooks。

**bridge 数据不存在**
→ 需先在本机跑过至少一次 Forge 流水线（`/forge` 命令），生成 `~/.forge/runtime/bridges/` 数据。
