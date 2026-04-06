# Forge 工作流自动化测试指南

完整的 Forge hooks 系统测试套件，覆盖 Claude Code 质量门机制的所有核心模块。

## 📊 测试覆盖概览

| 模块     | 名称                | 测试数       | 覆盖范围                                     |
| -------- | ------------------- | ------------ | -------------------------------------------- |
| C1       | Hash Consistency    | 12           | 路径 hash 计算、symlink 归一化、git worktree |
| C2       | Context Proxy       | 10           | 上下文代理、session 管理、状态机             |
| C3       | Instruction Strings | 10           | 质量门指令注入、多语言、编码转义             |
| C4       | Quality FSM         | 14           | 状态机转移、lease/epoch、escalation          |
| C5       | Integration         | 3            | 端到端集成、真实场景验证                     |
| **总计** |                     | **49 tests** | **100% pass rate**                           |

## 🚀 快速开始

### 前置条件

- Node.js v18+
- Forge hooks 已安装在 `~/.claude/hooks/`

### 安装和运行

```bash
cd cc工作流自动化优化/tests
bash run-all.sh
```

> **注意**: 无需 `npm install`，项目无外部依赖。

**期望结果**：`ALL SUITES PASSED (5 suites)`

## 🧪 分模块运行

```bash
node test-c1-hash-consistency.js   # Hash 计算
node test-c2-context-proxy.js      # 上下文代理
node test-c3-instruction-strings.js  # 指令注入
node test-c4-quality-fsm.js        # 状态机
node test-c5-integration-smoke.js  # 集成测试
```

## 📚 完整文档

- [项目概览](../README.md)
- [项目状态](../.planning/PROJECT-STATUS.md)
- [架构概览](../CLAUDE.md#架构概览)

---

**更新**：2026-04-05 | **状态**：Production Ready ✅
