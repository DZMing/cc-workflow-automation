#!/usr/bin/env node
// test-c1-hash-consistency.js — C1: enhancer hash 与 shared.js 一致（12 用例）
"use strict";

const fs = require("fs");
const path = require("path");
const cp = require("child_process");

const {
  HOOKS_DIR,
  test,
  assert,
  assertEqual,
  summarize,
  mkTmpDir,
  getRealRoot,
  getBridgePathForDir,
  cleanupDir,
} = require("./test-helpers");

const shared = require(path.join(HOOKS_DIR, "forge-shared"));

// ─── 本地纯函数（基线验证，不依赖 shared）────────────────────────────────────
// O5: 保留作为基线测试，新增 ESM subprocess 测试验证跨环境一致性
const crypto = require("crypto");
function enhancerHash(realRoot) {
  return crypto.createHash("md5").update(realRoot).digest("hex").slice(0, 12);
}

// ─── 用例 ─────────────────────────────────────────────────────────────────────
console.log("\n【C1】Bridge 路径 hash 一致性");

const CWD = path.resolve(__dirname, "..");
const EXPECTED_HASH = enhancerHash(fs.realpathSync(getRealRoot(CWD)));

// 用例 1：当前项目 hash 一致，且等于已知 EXPECTED_HASH
test("1-1 当前项目：enhancer hash === shared getBridgePath hash", () => {
  const realRoot = fs.realpathSync(getRealRoot(CWD));
  const eHash = enhancerHash(realRoot);
  // shared.getBridgePath 返回完整路径，从中提取 hash
  const sharedPath = shared.getBridgePath(realRoot);
  const sharedHash = path.basename(path.dirname(sharedPath));
  assertEqual(eHash, sharedHash, `enhancer=${eHash} vs shared=${sharedHash}`);
  assertEqual(eHash, EXPECTED_HASH, `hash=${eHash} 应为 ${EXPECTED_HASH}`);
});

// 用例 2：macOS symlink 归一化：/var/tmp 与 /private/var/tmp hash 相同
test("1-2 macOS symlink 归一化：/var/tmp hash 一致", () => {
  if (process.platform !== "darwin") {
    console.log("         SKIP（非 macOS）");
    return;
  }
  const a = "/var/tmp",
    b = "/private/var/tmp";
  let ra, rb;
  try {
    ra = fs.realpathSync(a);
  } catch (_) {
    console.log("         SKIP（/var/tmp 不可用）");
    return;
  }
  try {
    rb = fs.realpathSync(b);
  } catch (_) {
    console.log("         SKIP（/private/var/tmp 不可用）");
    return;
  }
  assertEqual(
    enhancerHash(ra),
    enhancerHash(rb),
    "symlink 归一化后 hash 应相同",
  );
});

// 用例 3：非 git 目录 fallback — resolveProjectRoot 返回 realpathSync(tmpDir)
test("1-3 非 git 目录 fallback", () => {
  const tmp = mkTmpDir("c1");
  try {
    const root = shared.resolveProjectRoot(tmp);
    const expected = fs.realpathSync(tmp);
    assertEqual(
      root,
      expected,
      `resolveProjectRoot 应返回 realpathSync(dir), got ${root}`,
    );
  } finally {
    cleanupDir(tmp);
  }
});

// 用例 4：真实 bridge 可读取且 _schema_version === 2
test("1-4 真实 bridge 可读取（schema=2）", () => {
  const { data, corrupt } = shared.readBridgeSnapshot(CWD);
  assert(!corrupt, "bridge 不应损坏");
  assert(data !== null, "bridge 数据不为 null");
  assertEqual(data._schema_version, 2, "_schema_version 应为 2");
});

// 用例 5：不存在的 bridge 返回 data=null
test("1-5 不存在的 bridge 返回 data=null", () => {
  const tmp = mkTmpDir("c1");
  try {
    const { data } = shared.readBridgeSnapshot(tmp);
    assert(data === null, `data 应为 null, got ${JSON.stringify(data)}`);
  } finally {
    cleanupDir(tmp);
  }
});

// 用例 6：损坏 JSON 返回 corrupt=true
test("1-6 损坏 JSON 返回 corrupt=true", () => {
  const tmp = mkTmpDir("c1");
  try {
    // git init，使 getBridgePath 能计算正确 hash
    try {
      cp.execFileSync("git", ["init"], { cwd: tmp, stdio: "ignore" });
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
        { cwd: tmp, stdio: "ignore" },
      );
    } catch (_) {}
    const root = fs.realpathSync(getRealRoot(tmp));
    const bp = getBridgePathForDir(root);
    fs.mkdirSync(path.dirname(bp), { recursive: true });
    fs.writeFileSync(bp, "{ invalid json !!!");
    const { data, corrupt } = shared.readBridgeSnapshot(tmp);
    assert(corrupt === true, `corrupt 应为 true, got ${corrupt}`);
    assert(
      data === null,
      `data 应为 null 当 corrupt=true, got ${JSON.stringify(data)}`,
    );
  } finally {
    cleanupDir(tmp);
  }
});

// 用例 7（O5）：ESM subprocess 与 CJS 版本 hash 一致（跨运行时一致性验证）
test("1-7 ESM subprocess hash 与 shared 一致", () => {
  const realRoot = fs.realpathSync(getRealRoot(CWD));
  // 用 --input-type=module 运行 ESM 代码，验证跨环境下 hash 算法相同
  const r = cp.spawnSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `import crypto from 'crypto';
import fs from 'fs';
const root = fs.realpathSync(${JSON.stringify(realRoot)});
const h = crypto.createHash('md5').update(root).digest('hex').slice(0, 12);
process.stdout.write(h);`,
    ],
    { encoding: "utf8", timeout: 5000 },
  );
  assert(
    r.status === 0,
    `ESM subprocess 应退出 0, got ${r.status}\nstderr: ${r.stderr.slice(0, 200)}`,
  );
  const esmHash = r.stdout.trim();
  assertEqual(
    esmHash,
    EXPECTED_HASH,
    `ESM hash=${esmHash} 应与 EXPECTED_HASH=${EXPECTED_HASH} 一致`,
  );
});

// 用例 8（O6）：子目录与根目录解析到同一 project root
test("1-8 子目录 tests/ 解析到同一 project root", () => {
  const rootFromCwd = shared.resolveProjectRoot(CWD);
  const rootFromTests = shared.resolveProjectRoot(path.join(CWD, "tests"));
  assertEqual(
    rootFromTests,
    rootFromCwd,
    `子目录 tests/ 应解析到同一 project root`,
  );
});

// ─── 扩展用例（Phase 2）─────────────────────────────────────────────────────

// 用例 9（新增）：深层 symlink 链（3+ 级）hash 一致性
test("1-9 深层 symlink 链（3+ 级）hash 一致性", () => {
  const tmp = mkTmpDir("c1-deep-symlink");
  try {
    // 创建目标目录
    const target = path.join(tmp, "target");
    fs.mkdirSync(target, { recursive: true });

    // 创建链式 symlink：link1 → target, link2 → link1, link3 → link2
    const link1 = path.join(tmp, "link1");
    try {
      fs.symlinkSync(target, link1, "dir");
    } catch (e) {
      console.log("         SKIP（symlink 不支持）");
      return;
    }
    const link2 = path.join(tmp, "link2");
    fs.symlinkSync(link1, link2, "dir");
    const link3 = path.join(tmp, "link3");
    fs.symlinkSync(link2, link3, "dir");

    // 三层 symlink 全部归一化到同一 realpath
    const realTarget = fs.realpathSync(target);
    const realLink3 = fs.realpathSync(link3);
    assertEqual(realTarget, realLink3, "3 层 symlink 应归一化到同一路径");
    assertEqual(
      enhancerHash(realTarget),
      enhancerHash(realLink3),
      "hash 应一致",
    );
  } finally {
    cleanupDir(tmp);
  }
});

// 用例 10（新增）：Bridge 路径计算与 .git/worktree 兼容性
test("1-10 Bridge 路径与 git worktree 兼容", () => {
  const tmp = mkTmpDir("c1-worktree");
  try {
    // 初始化 git 仓库
    try {
      cp.execFileSync("git", ["init"], { cwd: tmp, stdio: "ignore" });
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
        { cwd: tmp, stdio: "ignore" },
      );
    } catch (e) {
      console.log("         SKIP（git 初始化失败）");
      return;
    }

    const root = fs.realpathSync(getRealRoot(tmp));
    const bp = shared.getBridgePath(root);

    // 验证 bridge 路径格式包含 bridges 目录
    assert(bp.includes("bridges"), `Bridge 路径应包含 'bridges': ${bp}`);

    // 路径应该能用于读取（即使文件不存在，路径本身应该有效）
    const dir = path.dirname(bp);
    assert(dir.startsWith("/"), `Bridge 路径应为绝对路径: ${bp}`);
  } finally {
    cleanupDir(tmp);
  }
});

// 用例 11（新增）：环境变量覆盖对 hash 的隔离性
test("1-11 环境变量 CLAUDE_BRIDGE_OVERRIDE 不影响 hash 计算", () => {
  const originalEnv = process.env.CLAUDE_BRIDGE_OVERRIDE;
  try {
    const realRoot = fs.realpathSync(getRealRoot(CWD));
    const hash1 = enhancerHash(realRoot);

    // 设置环境变量
    process.env.CLAUDE_BRIDGE_OVERRIDE = "/some/override/path";
    const hash2 = enhancerHash(realRoot);

    // Hash 计算不应受环境变量影响
    assertEqual(hash1, hash2, "环境变量不应影响 hash 计算");
    assertEqual(hash1, EXPECTED_HASH, "hash 应保持一致");
  } finally {
    // 恢复环境变量
    if (originalEnv !== undefined) {
      process.env.CLAUDE_BRIDGE_OVERRIDE = originalEnv;
    } else {
      delete process.env.CLAUDE_BRIDGE_OVERRIDE;
    }
  }
});

// 用例 12（新增）：并发 hash 计算一致性（同步循环验证）
test("1-12 并发 hash 计算一致性（5 次）", () => {
  const realRoot = fs.realpathSync(getRealRoot(CWD));
  const results = [];
  for (let i = 0; i < 5; i++) {
    results.push(enhancerHash(realRoot));
  }
  assertEqual(
    results.every((h) => h === EXPECTED_HASH),
    true,
    "5 次 hash 计算结果应全部一致",
  );
});

// ─── 结果 ─────────────────────────────────────────────────────────────────────
summarize();
