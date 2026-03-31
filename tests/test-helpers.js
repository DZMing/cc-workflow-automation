#!/usr/bin/env node
// test-helpers.js — 共享测试工具（O1: 消除 5 文件 ~170 行重复）
// 导出：测试运行器 + makeFullBridge + 临时目录工具 + subprocess 工具
"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const cp = require("child_process");

// ─── 常量 ─────────────────────────────────────────────────────────────────────

const HOOKS_DIR = path.join(os.homedir(), ".claude", "hooks");

// ─── 最小测试运行器 ────────────────────────────────────────────────────────────

let passed = 0,
  failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  [PASS] ${name}`);
    passed++;
  } catch (e) {
    console.log(`  [FAIL] ${name}\n         ${e.message}`);
    failed++;
  }
}

async function testAsync(name, fn) {
  try {
    await fn();
    console.log(`  [PASS] ${name}`);
    passed++;
  } catch (e) {
    console.log(`  [FAIL] ${name}\n         ${e.message}`);
    failed++;
  }
}

function assert(c, m) {
  if (!c) throw new Error(m || "Assertion failed");
}

function assertEqual(a, b, m) {
  if (a !== b)
    throw new Error(
      m || `Expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`,
    );
}

function summarize() {
  console.log(
    `\n  共 ${passed + failed} 个用例 → ${passed} PASS, ${failed} FAIL`,
  );
  process.exit(failed > 0 ? 1 : 0);
}

// ─── 临时目录工具 ──────────────────────────────────────────────────────────────

function mkTmpDir(prefix) {
  const p = path.join(
    os.tmpdir(),
    `forge-${prefix || "test"}-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`,
  );
  fs.mkdirSync(p, { recursive: true });
  return p;
}

function getRealRoot(dir) {
  try {
    return cp
      .execFileSync("git", ["rev-parse", "--show-toplevel"], {
        cwd: dir,
        encoding: "utf8",
      })
      .trim();
  } catch (_) {
    try {
      return fs.realpathSync(dir);
    } catch (_2) {
      return dir;
    }
  }
}

function getBridgePathForDir(realRoot) {
  const h = crypto
    .createHash("md5")
    .update(realRoot)
    .digest("hex")
    .slice(0, 12);
  return path.join(
    os.homedir(),
    ".forge",
    "runtime",
    "bridges",
    h,
    "bridge.json",
  );
}

function cleanupDir(dir) {
  try {
    const root = getRealRoot(dir);
    const bp = getBridgePathForDir(root);
    try {
      fs.rmSync(path.dirname(bp), { recursive: true, force: true });
    } catch (_) {}
  } catch (_) {}
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch (_) {}
}

function setupForgeTmpDir() {
  const d = mkTmpDir("forge");
  fs.mkdirSync(path.join(d, ".planning"), { recursive: true });
  fs.writeFileSync(
    path.join(d, ".planning", "STATE.md"),
    "# State\nPhase: 1\n",
  );
  try {
    cp.execFileSync("git", ["init"], { cwd: d, stdio: "ignore" });
  } catch (_) {}
  try {
    cp.execFileSync(
      "git",
      [
        "-c",
        "user.email=t@t.com",
        "-c",
        "user.name=T",
        "commit",
        "--allow-empty",
        "-m",
        "init",
      ],
      { cwd: d, stdio: "ignore" },
    );
  } catch (_) {}
  return d;
}

function cleanupForgeTmpDir(dir) {
  cleanupDir(dir);
}

// ─── subprocess 工具 ──────────────────────────────────────────────────────────

function spawnHook(hookFile, stdinData) {
  const r = cp.spawnSync(process.execPath, [hookFile], {
    input: JSON.stringify(stdinData),
    encoding: "utf8",
    timeout: 15000,
    env: { ...process.env },
  });
  return {
    exitCode: r.status !== null ? r.status : -1,
    stdout: r.stdout || "",
    stderr: r.stderr || "",
  };
}

// ─── makeFullBridge（统一版本，含 failCount: 0，防止 schema 漂移）──────────────

function makeFullBridge(overrides) {
  const base = {
    _schema_version: 2,
    project: { cwd: "/tmp/test", slug: "test", isWeb: false, flowType: "new" },
    phase: { current: 1, total: 3, phaseEpoch: 1 },
    change: {
      changeEpoch: 1,
      touchedFiles: [],
      planWrittenAt: null,
      summaryWrittenAt: null,
      securityRisk: { required: false, reasons: [], files: [] },
    },
    gates: {
      plan_review: {
        status: "idle",
        epoch: null,
        leaseUntil: null,
        failCount: 0,
      },
      tests: { status: "idle", epoch: null, leaseUntil: null, failCount: 0 },
      code_review: {
        status: "idle",
        epoch: null,
        leaseUntil: null,
        failCount: 0,
      },
      qa: { status: "idle", epoch: null, leaseUntil: null, failCount: 0 },
      security: { status: "idle", epoch: null, leaseUntil: null, failCount: 0 },
      benchmark: {
        status: "idle",
        epoch: null,
        leaseUntil: null,
        failCount: 0,
      },
      ship: { status: "idle", epoch: null, leaseUntil: null, failCount: 0 },
    },
    context: { warningLevel: null, lastSaveAt: null },
    audit: { lastToolName: null, updatedAt: null },
  };
  const r = { ...base, ...overrides };
  if (overrides?.gates) {
    r.gates = { ...base.gates };
    for (const [k, v] of Object.entries(overrides.gates)) {
      r.gates[k] = { ...base.gates[k], ...v };
    }
  }
  if (overrides?.project) r.project = { ...base.project, ...overrides.project };
  if (overrides?.phase) r.phase = { ...base.phase, ...overrides.phase };
  if (overrides?.change) r.change = { ...base.change, ...overrides.change };
  return r;
}

// ─── 导出 ─────────────────────────────────────────────────────────────────────

module.exports = {
  HOOKS_DIR,
  test,
  testAsync,
  assert,
  assertEqual,
  summarize,
  mkTmpDir,
  getRealRoot,
  getBridgePathForDir,
  cleanupDir,
  setupForgeTmpDir,
  cleanupForgeTmpDir,
  spawnHook,
  makeFullBridge,
};
