#!/usr/bin/env node
// test-c3-instruction-strings.js — C3: OC client 路径 — 6 门消息均使用 use_skill，无 Skill( 调用（6 用例）
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

// ─── 辅助：收集所有门的 message（供全局断言）────────────────────────────────
function allGateMessages() {
  const messages = [];

  // plan_review
  const b1 = makeFullBridge({
    project: { client: "oc" },
    change: { planWrittenAt: "2026-01-01", changeEpoch: 1 },
  });
  const r1 = nextGateToInject(b1);
  if (r1) messages.push(r1.message);

  // code_review
  const b2 = makeFullBridge({
    project: { client: "oc" },
    gates: { tests: { status: "passed", epoch: 1 } },
  });
  const r2 = nextGateToInject(b2);
  if (r2) messages.push(r2.message);

  // qa
  const b3 = makeFullBridge({
    project: { isWeb: true, client: "oc" },
    change: { changeEpoch: 1 },
    gates: {
      tests: { status: "passed", epoch: 1 },
      code_review: { status: "passed", epoch: 1 },
    },
  });
  const r3 = nextGateToInject(b3);
  if (r3) messages.push(r3.message);

  // security
  const b4 = makeFullBridge({
    project: { client: "oc" },
    change: { changeEpoch: 1, securityRisk: { required: true } },
    gates: {
      tests: { status: "passed", epoch: 1 },
      code_review: { status: "passed", epoch: 1 },
    },
  });
  const r4 = nextGateToInject(b4);
  if (r4) messages.push(r4.message);

  // benchmark
  const b5 = makeFullBridge({
    project: { isWeb: true, client: "oc" },
    phase: { current: 2, total: 3 },
    change: { changeEpoch: 1 },
    gates: {
      tests: { status: "passed", epoch: 1 },
      code_review: { status: "passed", epoch: 1 },
      qa: { status: "passed", epoch: 1 },
    },
  });
  const r5 = nextGateToInject(b5);
  if (r5) messages.push(r5.message);

  // ship
  const b6 = makeFullBridge({
    project: { client: "oc" },
    phase: { current: 3, total: 3 },
    change: { changeEpoch: 1 },
    gates: {
      tests: { status: "passed", epoch: 1 },
      code_review: { status: "passed", epoch: 1 },
    },
  });
  const r6 = nextGateToInject(b6);
  if (r6) messages.push(r6.message);

  return messages;
}

// ─── 用例 ─────────────────────────────────────────────────────────────────────
console.log("\n【C3】质量门指令字符串 — use_skill / 无 Skill(");

// 用例 1：plan_review → message 含 use_skill + autoplan
test("3-1 plan_review 消息含 use_skill 和 autoplan", () => {
  const b = makeFullBridge({
    project: { client: "oc" },
    change: { planWrittenAt: "2026-01-01", changeEpoch: 1 },
  });
  const r = nextGateToInject(b);
  assert(r !== null, "plan_review 应触发注入");
  assertEqual(r.name, "plan_review", `name 应为 plan_review, got ${r.name}`);
  assert(
    r.message.includes("use_skill"),
    `消息应含 use_skill: ${r.message.slice(0, 120)}`,
  );
  assert(r.message.toLowerCase().includes("autoplan"), `消息应含 autoplan`);
});

// 用例 2：code_review → message 含 use_skill + review
test("3-2 code_review 消息含 use_skill 和 review", () => {
  const b = makeFullBridge({
    project: { client: "oc" },
    change: { changeEpoch: 1 },
    gates: { tests: { status: "passed", epoch: 1 } },
  });
  const r = nextGateToInject(b);
  assert(r !== null, "code_review 应触发注入");
  assertEqual(r.name, "code_review", `name 应为 code_review, got ${r.name}`);
  assert(r.message.includes("use_skill"), `消息应含 use_skill`);
  assert(r.message.toLowerCase().includes("review"), `消息应含 review`);
});

// 用例 3：qa → message 含 use_skill + qa
test("3-3 qa 消息含 use_skill 和 qa", () => {
  const b = makeFullBridge({
    project: { isWeb: true, client: "oc" },
    change: { changeEpoch: 1 },
    gates: {
      tests: { status: "passed", epoch: 1 },
      code_review: { status: "passed", epoch: 1 },
    },
  });
  const r = nextGateToInject(b);
  assert(r !== null, "qa 应触发注入");
  assertEqual(r.name, "qa", `name 应为 qa, got ${r.name}`);
  assert(r.message.includes("use_skill"), `消息应含 use_skill`);
  assert(r.message.toLowerCase().includes("qa"), `消息应含 qa`);
});

// 用例 4：security → message 含 use_skill + cso
test("3-4 security 消息含 use_skill 和 cso", () => {
  const b = makeFullBridge({
    project: { client: "oc" },
    change: { changeEpoch: 1, securityRisk: { required: true } },
    gates: {
      tests: { status: "passed", epoch: 1 },
      code_review: { status: "passed", epoch: 1 },
    },
  });
  const r = nextGateToInject(b);
  assert(r !== null, "security 应触发注入");
  assertEqual(r.name, "security", `name 应为 security, got ${r.name}`);
  assert(r.message.includes("use_skill"), `消息应含 use_skill`);
  assert(r.message.toLowerCase().includes("cso"), `消息应含 cso`);
});

// 用例 5：benchmark → message 含 use_skill + benchmark
test("3-5 benchmark 消息含 use_skill 和 benchmark", () => {
  const b = makeFullBridge({
    project: { isWeb: true, client: "oc" },
    phase: { current: 2, total: 3 },
    change: { changeEpoch: 1 },
    gates: {
      tests: { status: "passed", epoch: 1 },
      code_review: { status: "passed", epoch: 1 },
      qa: { status: "passed", epoch: 1 },
    },
  });
  const r = nextGateToInject(b);
  assert(r !== null, "benchmark 应触发注入");
  assertEqual(r.name, "benchmark", `name 应为 benchmark, got ${r.name}`);
  assert(r.message.includes("use_skill"), `消息应含 use_skill`);
  assert(r.message.toLowerCase().includes("benchmark"), `消息应含 benchmark`);
});

// 用例 6：ship 消息含 use_skill/ship；全部 6 门消息无 Skill(
test("3-6 ship 消息含 use_skill/ship；全部门消息无 Skill(", () => {
  const b = makeFullBridge({
    project: { client: "oc" },
    phase: { current: 3, total: 3 },
    change: { changeEpoch: 1 },
    gates: {
      tests: { status: "passed", epoch: 1 },
      code_review: { status: "passed", epoch: 1 },
    },
  });
  const r = nextGateToInject(b);
  assert(r !== null, "ship 应触发注入");
  assertEqual(r.name, "ship", `name 应为 ship, got ${r.name}`);
  assert(r.message.includes("use_skill"), `消息应含 use_skill`);
  assert(r.message.toLowerCase().includes("ship"), `消息应含 ship`);

  // O3 修复：=== 6 精确断言，丢任意一门都会失败（原 >= 1 太弱）
  const allMsgs = allGateMessages();
  assertEqual(
    allMsgs.length,
    6,
    `应收集到全部 6 门消息, got ${allMsgs.length}`,
  );
  for (const msg of allMsgs) {
    assert(
      !msg.includes("Skill("),
      `消息不应含 Skill( 调用：\n${msg.slice(0, 150)}`,
    );
  }
});

// 用例 7：CC client（默认）→ 消息含 Skill 工具，不含 use_skill（HIGH-2 回归测试）
test("3-7 CC client → 消息含 Skill 工具，不含 use_skill", () => {
  const b = makeFullBridge({
    project: { client: "cc" },
    change: { planWrittenAt: "2026-01-01", changeEpoch: 1 },
  });
  const r = nextGateToInject(b);
  assert(r !== null, "plan_review 应触发注入");
  assert(
    r.message.includes("Skill 工具"),
    `CC 消息应含 Skill 工具: ${r.message.slice(0, 120)}`,
  );
  assert(
    !r.message.includes("use_skill"),
    `CC 消息不应含 use_skill: ${r.message.slice(0, 120)}`,
  );
});

// ─── 结果 ─────────────────────────────────────────────────────────────────────
summarize();
