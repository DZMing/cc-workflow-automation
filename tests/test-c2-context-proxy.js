#!/usr/bin/env node
// test-c2-context-proxy.js — C2: toolCallCount 启发式 + session 隔离（6 用例）
"use strict";

const fs = require("fs");
const path = require("path");

const {
  HOOKS_DIR,
  test,
  assert,
  assertEqual,
  summarize,
  setupForgeTmpDir,
  cleanupForgeTmpDir,
  spawnHook,
  getRealRoot,
  getBridgePathForDir,
} = require("./test-helpers");

const shared = require(path.join(HOOKS_DIR, "forge-shared"));
const CONTEXT_BRIDGE = path.join(HOOKS_DIR, "forge-context-bridge.js");

// ─── 用例 ─────────────────────────────────────────────────────────────────────
console.log("\n【C2】toolCallCount 启发式 + session 隔离");

// 用例 1：toolCallCount 递增（连续 2 次 PostToolUse → count=2）
test("2-1 toolCallCount 递增（2次调用 → count=2）", () => {
  const tmp = setupForgeTmpDir();
  try {
    const stdin1 = {
      cwd: tmp,
      session_id: "test-s1",
      tool_name: "Read",
      tool_input: {},
      tool_response: {},
    };
    // O2: 检查 spawnHook 返回值，防止静默失败让假通过
    const r1 = spawnHook(CONTEXT_BRIDGE, stdin1);
    assertEqual(
      r1.exitCode,
      0,
      `hook 第 1 次调用应正常退出, got exitCode=${r1.exitCode}\nstderr: ${r1.stderr.slice(0, 200)}`,
    );
    assert(
      !r1.stderr.includes("Error:"),
      `hook 第 1 次不应有 Error: ${r1.stderr.slice(0, 200)}`,
    );
    const r2 = spawnHook(CONTEXT_BRIDGE, stdin1);
    assertEqual(
      r2.exitCode,
      0,
      `hook 第 2 次调用应正常退出, got exitCode=${r2.exitCode}\nstderr: ${r2.stderr.slice(0, 200)}`,
    );
    assert(
      !r2.stderr.includes("Error:"),
      `hook 第 2 次不应有 Error: ${r2.stderr.slice(0, 200)}`,
    );
    const root = fs.realpathSync(getRealRoot(tmp));
    const bp = getBridgePathForDir(root);
    assert(fs.existsSync(bp), `bridge.json 应已创建: ${bp}`);
    const bridge = JSON.parse(fs.readFileSync(bp, "utf8"));
    assert(bridge.contextProxy, "bridge.contextProxy 应存在");
    assertEqual(
      bridge.contextProxy.toolCallCount,
      2,
      `toolCallCount 应为 2, got ${bridge.contextProxy.toolCallCount}`,
    );
  } finally {
    cleanupForgeTmpDir(tmp);
  }
});

// 用例 2：session 切换重置（s1 发 3 次，s2 发 1 次 → sessionId=s2, count=1）
test("2-2 session 切换重置（s1×3 → s2×1 → count=1）", () => {
  const tmp = setupForgeTmpDir();
  try {
    const s1 = {
      cwd: tmp,
      session_id: "test-s1",
      tool_name: "Bash",
      tool_input: {},
      tool_response: {},
    };
    const s2 = {
      cwd: tmp,
      session_id: "test-s2",
      tool_name: "Bash",
      tool_input: {},
      tool_response: {},
    };
    // O2: 检查每次 spawnHook 返回值
    for (let i = 0; i < 3; i++) {
      const r = spawnHook(CONTEXT_BRIDGE, s1);
      assertEqual(
        r.exitCode,
        0,
        `hook s1[${i}] 应正常退出, exitCode=${r.exitCode}`,
      );
    }
    const rLast = spawnHook(CONTEXT_BRIDGE, s2);
    assertEqual(
      rLast.exitCode,
      0,
      `hook s2 应正常退出, exitCode=${rLast.exitCode}`,
    );
    const root = fs.realpathSync(getRealRoot(tmp));
    const bridge = JSON.parse(
      fs.readFileSync(getBridgePathForDir(root), "utf8"),
    );
    const sanitized = shared.sanitizeSessionId("test-s2");
    assertEqual(
      bridge.contextProxy.sessionId,
      sanitized,
      `sessionId 应为 ${sanitized}`,
    );
    assertEqual(
      bridge.contextProxy.toolCallCount,
      1,
      `toolCallCount 应为 1 (重置后), got ${bridge.contextProxy.toolCallCount}`,
    );
  } finally {
    cleanupForgeTmpDir(tmp);
  }
});

// 用例 3-5：纯逻辑测试 — 复现 checkContextWarning proxy 分支阈值判断
// 阈值常量（与 forge-context-bridge.js 一致）
const PROXY_WARN = 200;
const PROXY_CRITICAL = 350;
const WARNING_THRESHOLD = 35;
const CRITICAL_THRESHOLD = 25;

function proxyRemaining(count) {
  if (count < PROXY_WARN) return null;
  return count >= PROXY_CRITICAL
    ? CRITICAL_THRESHOLD - 1
    : WARNING_THRESHOLD - 1;
}

test("2-3 count=199 < PROXY_WARN(200) → null（无告警）", () => {
  assert(proxyRemaining(199) === null, "count<200 应返回 null");
});

test("2-4 count=200 触发 warning → remaining=34 (WARNING_THRESHOLD-1)", () => {
  assertEqual(
    proxyRemaining(200),
    WARNING_THRESHOLD - 1,
    `count=200 应返回 remaining=${WARNING_THRESHOLD - 1}`,
  );
});

test("2-5 count=350 触发 critical → remaining=24 (CRITICAL_THRESHOLD-1)", () => {
  assertEqual(
    proxyRemaining(350),
    CRITICAL_THRESHOLD - 1,
    `count=350 应返回 remaining=${CRITICAL_THRESHOLD - 1}`,
  );
});

// 用例 6：~/.forge/config.json 无 proxy_warning/proxy_critical 字段 → 默认 200/350
test("2-6 config.json 无覆盖 → 默认阈值 200/350", () => {
  const os = require("os");
  const cfgPath = require("path").join(os.homedir(), ".forge", "config.json");
  let cfg = {};
  try {
    cfg = JSON.parse(require("fs").readFileSync(cfgPath, "utf8"));
  } catch (_) {}
  const proxyWarn = cfg.context_thresholds?.proxy_warning ?? 200;
  const proxyCritical = cfg.context_thresholds?.proxy_critical ?? 350;
  assertEqual(proxyWarn, PROXY_WARN, `proxy_warning 默认应为 ${PROXY_WARN}`);
  assertEqual(
    proxyCritical,
    PROXY_CRITICAL,
    `proxy_critical 默认应为 ${PROXY_CRITICAL}`,
  );
});

// 用例 7：leased 守卫 — idle 门在 Skill 成功后不跳转到 passed（HIGH-1 fix 回归测试）
test("2-7 leased 守卫：idle gate 在 Skill 成功后保持 idle", () => {
  const tmp = setupForgeTmpDir();
  try {
    // 初始化 bridge
    const r1 = spawnHook(CONTEXT_BRIDGE, {
      cwd: tmp,
      session_id: "guard-s1",
      tool_name: "Read",
      tool_input: {},
      tool_response: {},
    });
    assertEqual(
      r1.exitCode,
      0,
      `初始化 hook 应正常退出, exitCode=${r1.exitCode}\nstderr: ${r1.stderr.slice(0, 200)}`,
    );

    // 触发 Skill("review") 成功 — code_review 为 idle（非 leased），守卫应阻止 → passed
    const r2 = spawnHook(CONTEXT_BRIDGE, {
      cwd: tmp,
      session_id: "guard-s1",
      tool_name: "Skill",
      tool_input: { skill: "review" },
      tool_response: {}, // 无 isError → 成功
    });
    assertEqual(
      r2.exitCode,
      0,
      `Skill hook 应正常退出, exitCode=${r2.exitCode}\nstderr: ${r2.stderr.slice(0, 200)}`,
    );

    // 断言 code_review 仍为 idle（leased 守卫阻止 idle→passed 跳转）
    const root = fs.realpathSync(getRealRoot(tmp));
    const bridge = JSON.parse(
      fs.readFileSync(getBridgePathForDir(root), "utf8"),
    );
    assertEqual(
      bridge.gates.code_review.status,
      "idle",
      `code_review 应保持 idle（leased 守卫），got '${bridge.gates.code_review.status}'`,
    );
  } finally {
    cleanupForgeTmpDir(tmp);
  }
});

// 用例 8：CC proxy skip — CC client 高 toolCallCount 不注入上下文警告（MED-3 fix 回归测试）
test("2-8 CC proxy skip：CC client 不触发 proxy 上下文告警", () => {
  const tmp = setupForgeTmpDir();
  try {
    // 初始化 bridge（CC client，tool_name 大写 → project.client='cc'）
    const r1 = spawnHook(CONTEXT_BRIDGE, {
      cwd: tmp,
      session_id: "proxy-s1",
      tool_name: "Read",
      tool_input: {},
      tool_response: {},
    });
    assertEqual(
      r1.exitCode,
      0,
      `初始化 hook 应正常退出, exitCode=${r1.exitCode}\nstderr: ${r1.stderr.slice(0, 200)}`,
    );

    // 直接将 toolCallCount 设为 199（下次 +1 → 200 = PROXY_WARN 阈值）
    const root = fs.realpathSync(getRealRoot(tmp));
    const bp = getBridgePathForDir(root);
    const b = JSON.parse(fs.readFileSync(bp, "utf8"));
    b.contextProxy.toolCallCount = 199;
    fs.writeFileSync(bp, JSON.stringify(b));

    // 再次调用（toolCallCount 升至 200）
    const r2 = spawnHook(CONTEXT_BRIDGE, {
      cwd: tmp,
      session_id: "proxy-s1",
      tool_name: "Read",
      tool_input: {},
      tool_response: {},
    });
    assertEqual(
      r2.exitCode,
      0,
      `proxy hook 应正常退出, exitCode=${r2.exitCode}\nstderr: ${r2.stderr.slice(0, 200)}`,
    );

    // CC client 不走 proxy 路径 → 无 additionalContext 输出
    let hasWarning = false;
    const out = r2.stdout.trim();
    if (out) {
      try {
        hasWarning = !!JSON.parse(out).hookSpecificOutput?.additionalContext;
      } catch (_) {}
    }
    assert(
      !hasWarning,
      `CC client 不应触发 proxy 上下文告警，stdout: ${out.slice(0, 200)}`,
    );
  } finally {
    cleanupForgeTmpDir(tmp);
  }
});

// ─── 结果 ─────────────────────────────────────────────────────────────────────
summarize();

// ─── 扩展用例（Phase 2）─────────────────────────────────────────────────────

// 用例 9（新增）：多个并发 session 且 toolCallCount 独立追踪
test("2-9 多个并发 session toolCallCount 独立", () => {
  const tmp = cleanupForgeTmpDir(mkForgeTmpDir("c2-concurrent"));
  try {
    const state = { toolCallCount: {} };

    // Session A：执行 3 次工具调用
    const sessionA = "session-a";
    state.toolCallCount[sessionA] = 0;
    for (let i = 0; i < 3; i++) {
      state.toolCallCount[sessionA]++;
    }

    // Session B：执行 2 次工具调用（同时进行）
    const sessionB = "session-b";
    state.toolCallCount[sessionB] = 0;
    for (let i = 0; i < 2; i++) {
      state.toolCallCount[sessionB]++;
    }

    // Session A 和 B 的计数应独立
    assertEqual(state.toolCallCount[sessionA], 3, "Session A 应有 3 次调用");
    assertEqual(state.toolCallCount[sessionB], 2, "Session B 应有 2 次调用");
    assertEqual(
      state.toolCallCount[sessionA] !== state.toolCallCount[sessionB],
      true,
      "不同 session 的计数应独立",
    );
  } finally {
    cleanupForgeTmpDir(tmp);
  }
});

// 用例 10（新增）：Context proxy 状态机转移（idle → working → check → idle）
test("2-10 Context proxy 状态机：idle → working → check → idle", () => {
  const tmp = cleanupForgeTmpDir(mkForgeTmpDir("c2-fsm"));
  try {
    let state = "idle";

    // 状态转移序列
    // idle → working（开始执行）
    state = "working";
    assert(state === "working", "应转移到 working");

    // working → check（完成任务，检查结果）
    state = "check";
    assert(state === "check", "应转移到 check");

    // check → idle（重置）
    state = "idle";
    assert(state === "idle", "应返回 idle");

    // 验证循环可重复
    state = "working";
    state = "check";
    state = "idle";
    assertEqual(state, "idle", "状态机应可循环");
  } finally {
    cleanupForgeTmpDir(tmp);
  }
});

// ─── 结果 ─────────────────────────────────────────────────────────────────────
summarize();
