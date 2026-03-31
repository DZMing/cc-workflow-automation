#!/usr/bin/env node
// test-c4-quality-fsm.js — 质量门 FSM 完整决策逻辑（11 用例）
"use strict";

const path = require("path");

const {
  HOOKS_DIR,
  test,
  assert,
  assertEqual,
  summarize,
  makeFullBridge,
} = require("./test-helpers");

const { nextGateToInject } = require(
  path.join(HOOKS_DIR, "forge-quality-pipeline"),
);

// ─── 用例 ─────────────────────────────────────────────────────────────────────
console.log("\n【C4】质量门 FSM 决策逻辑");

// 用例 1：plan_review 触发（planWrittenAt 已设）
test("4-1 plan_review 触发", () => {
  const b = makeFullBridge({
    change: { planWrittenAt: "2026-01-01", changeEpoch: 1 },
  });
  const r = nextGateToInject(b);
  assert(r !== null, "plan_review 应触发");
  assertEqual(r.name, "plan_review");
});

// 用例 2：code_review 触发（tests=passed）
test("4-2 code_review 触发（tests=passed）", () => {
  const b = makeFullBridge({
    change: { changeEpoch: 1 },
    gates: { tests: { status: "passed", epoch: 1 } },
  });
  const r = nextGateToInject(b);
  assert(r !== null, "code_review 应触发");
  assertEqual(r.name, "code_review");
});

// 用例 3：qa 触发（code_review=passed + isWeb）
test("4-3 qa 触发（code_review=passed + isWeb）", () => {
  const b = makeFullBridge({
    project: { isWeb: true },
    change: { changeEpoch: 1 },
    gates: {
      tests: { status: "passed", epoch: 1 },
      code_review: { status: "passed", epoch: 1 },
    },
  });
  const r = nextGateToInject(b);
  assert(r !== null, "qa 应触发");
  assertEqual(r.name, "qa");
});

// 用例 4：security 触发（code_review=passed + securityRisk.required）
test("4-4 security 触发（securityRisk.required=true）", () => {
  const b = makeFullBridge({
    change: { changeEpoch: 1, securityRisk: { required: true } },
    gates: {
      tests: { status: "passed", epoch: 1 },
      code_review: { status: "passed", epoch: 1 },
    },
  });
  const r = nextGateToInject(b);
  assert(r !== null, "security 应触发");
  assertEqual(r.name, "security");
});

// 用例 5：ship 触发（所有核心门 passed + isLastPhase，非 Web 跳过 qa）
test("4-5 ship 触发（所有核心门 passed + isLastPhase）", () => {
  const b = makeFullBridge({
    phase: { current: 3, total: 3 },
    change: { changeEpoch: 1 },
    gates: {
      tests: { status: "passed", epoch: 1 },
      code_review: { status: "passed", epoch: 1 },
    },
  });
  const r = nextGateToInject(b);
  assert(r !== null, "ship 应触发");
  assertEqual(r.name, "ship");
});

// 用例 6：escalation 触发（plan_review failCount=3）
test("4-6 escalation 触发（plan_review failCount=3）", () => {
  const b = makeFullBridge({
    change: { planWrittenAt: "2026-01-01", changeEpoch: 1 },
    gates: {
      plan_review: {
        status: "failed",
        epoch: null,
        leaseUntil: null,
        failCount: 3,
      },
    },
  });
  const r = nextGateToInject(b);
  assert(r !== null, "escalation 应触发");
  assertEqual(r.name, "escalation", `应为 escalation, got ${r && r.name}`);
});

// 用例 7：过期 lease 重新注入（plan_review leased, leaseUntil=过去时间）
test("4-7 过期 lease 重新触发 plan_review", () => {
  const expiredTime = new Date(Date.now() - 60000).toISOString();
  const b = makeFullBridge({
    change: { planWrittenAt: "2026-01-01", changeEpoch: 1 },
    gates: {
      plan_review: {
        status: "leased",
        epoch: null,
        leaseUntil: expiredTime,
        failCount: 0,
      },
    },
  });
  const r = nextGateToInject(b);
  assert(r !== null, "过期 lease 应重新触发");
  assertEqual(
    r.name,
    "plan_review",
    `过期 lease 应重新触发 plan_review, got ${r && r.name}`,
  );
});

// 用例 8（O4 修复）：code_review failCount=3 → 精确断言为 escalation
// 原断言 if (r !== null) assert(r.name !== 'code_review') 允许 null 通过（P0 假通过风险）
test("4-8 code_review failCount=3 → escalation 触发", () => {
  const b = makeFullBridge({
    change: { changeEpoch: 1 },
    gates: {
      tests: { status: "passed", epoch: 1 },
      code_review: {
        status: "failed",
        epoch: null,
        leaseUntil: null,
        failCount: 3,
      },
    },
  });
  const r = nextGateToInject(b);
  // code_review.requires()=true（tests passed）且 failCount>=3 → escalation 触发
  assert(
    r !== null,
    "code_review failCount=3 应触发 escalation，不应返回 null",
  );
  assertEqual(r.name, "escalation", `应为 escalation, got ${r && r.name}`);
});

// 用例 9（O6）：isLastPhase 拒绝 Infinity（D10 fix 验证，防止永远触发 ship）
test("4-9 isLastPhase 拒绝 Infinity → ship 不触发", () => {
  const b = makeFullBridge({
    phase: { current: Infinity, total: 3 },
    change: { changeEpoch: 1 },
    gates: {
      tests: { status: "passed", epoch: 1 },
      code_review: { status: "passed", epoch: 1 },
    },
  });
  const r = nextGateToInject(b);
  assert(
    r === null || r.name !== "ship",
    `Infinity phase 不应触发 ship, got ${r && r.name}`,
  );
});

// 用例 10（O6）：tests.epoch 不匹配 changeEpoch → code_review 不依赖过期结果，重新触发
test("4-10 code_review.epoch 过期（不匹配 changeEpoch）→ 重新触发", () => {
  const b = makeFullBridge({
    change: { changeEpoch: 5 },
    gates: {
      tests: { status: "passed", epoch: 5 },
      code_review: { status: "passed", epoch: 4 }, // epoch 旧，不匹配 changeEpoch=5
    },
  });
  const r = nextGateToInject(b);
  assert(r !== null, "code_review epoch 过期应重新触发");
  assertEqual(r.name, "code_review", `应为 code_review, got ${r && r.name}`);
});

// 用例 11（O6）：未过期 lease → 跳过，返回 null（防止重复注入）
test("4-11 未过期 lease → 跳过，不重复注入", () => {
  const futureTime = new Date(Date.now() + 60000).toISOString();
  const b = makeFullBridge({
    change: { planWrittenAt: "2026-01-01", changeEpoch: 1 },
    gates: {
      plan_review: {
        status: "leased",
        epoch: null,
        leaseUntil: futureTime,
        failCount: 0,
      },
    },
  });
  const r = nextGateToInject(b);
  // plan_review 在有效 lease 期间跳过，且无其他门满足触发条件 → null
  assert(r === null, `有效 lease 期间不应触发任何门, got ${r && r.name}`);
});

// ─── 结果 ─────────────────────────────────────────────────────────────────────
summarize();
