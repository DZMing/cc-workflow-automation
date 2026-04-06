#!/usr/bin/env node
// test-c5-integration-smoke.js — 端到端集成烟雾测试（3 用例）
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

const shared = require(path.join(HOOKS_DIR, "forge-shared"));
const { nextGateToInject } = require(
  path.join(HOOKS_DIR, "forge-quality-pipeline"),
);
const CWD = path.resolve(__dirname, "..");

// ─── 用例 ─────────────────────────────────────────────────────────────────────
console.log("\n【C5】端到端集成烟雾测试");

// 用例 1：读取真实 bridge：schema=2, changeEpoch>=89, contextProxy 存在
test("5-1 真实 bridge 可读取（schema=2, changeEpoch>=1, contextProxy 存在）", () => {
  const { data, corrupt } = shared.readBridgeSnapshot(CWD);
  assert(!corrupt, "真实 bridge 不应损坏");
  assert(data !== null, "bridge data 不为 null");
  assertEqual(data._schema_version, 2, "_schema_version 应为 2");
  assert(
    typeof data.change?.changeEpoch === "number" &&
      data.change.changeEpoch >= 1,
    `changeEpoch 应为正数, got ${data.change?.changeEpoch}`,
  );
  assert(data.contextProxy !== undefined, "contextProxy 应存在于真实 bridge");
});

// 用例 2：全 idle 门 → nextGateToInject 返回 null（无代码变更时不注入）
test("5-2 全 idle 门 + 无 planWrittenAt → nextGateToInject=null", () => {
  // makeFullBridge() 默认生成全 idle 门、planWrittenAt=null 的 bridge
  const idleBridge = makeFullBridge();
  const r = nextGateToInject(idleBridge);
  assert(r === null, `全 idle 门应返回 null, got ${JSON.stringify(r)}`);
});

// 用例 3：state.json 完整（project_name, phase.total, tech_stack）
test("5-3 state.json 字段完整", () => {
  const os = require("os");
  const slug = shared.resolveSlug(CWD);
  const statePath = path.join(
    os.homedir(),
    ".forge",
    "projects",
    slug,
    "state.json",
  );
  assert(
    require("fs").existsSync(statePath),
    `state.json 不存在: ${statePath}`,
  );
  const state = JSON.parse(require("fs").readFileSync(statePath, "utf8"));
  assert(
    typeof state.project_name === "string" && state.project_name.length > 0,
    `project_name 应为非空字符串, got ${JSON.stringify(state.project_name)}`,
  );
  assertEqual(
    state.phase?.total,
    5,
    `phase.total 应为 5, got ${state.phase?.total}`,
  );
  assert(
    typeof state.tech_stack === "string" &&
      state.tech_stack.toLowerCase().includes("node"),
    `tech_stack 应含 'Node', got ${state.tech_stack}`,
  );
});

// ─── 结果 ─────────────────────────────────────────────────────────────────────
summarize();
