#!/usr/bin/env node

/**
 * Phase 02 CLI Framework Tests
 *
 * Tests for:
 * - CLI version output
 * - `tools` command output
 * - `install --dry-run` behavior
 * - `install` with unknown tool (error + exit code)
 * - `uninstall --dry-run` behavior (via adapter)
 * - Multi-tool comma-separated parsing
 * - Postinstall coexistence (Phase 01 tests still pass)
 *
 * Run with: node --test tests/phase-02-cli.test.js
 */

const test = require("node:test");
const assert = require("node:assert");
const { execFileSync } = require("child_process");
const path = require("path");

const CLI_PATH = path.resolve(__dirname, "..", "cli.js");
const NODE = process.execPath;

/** Run CLI command and return { stdout, stderr, exitCode } */
function runCli(args, options = {}) {
  try {
    const stdout = execFileSync(NODE, [CLI_PATH, ...args], {
      encoding: "utf-8",
      timeout: 10000,
      cwd: options.cwd || path.resolve(__dirname, ".."),
      env: { ...process.env, ...options.env },
    });
    return { stdout, stderr: "", exitCode: 0 };
  } catch (err) {
    return {
      stdout: err.stdout || "",
      stderr: err.stderr || "",
      exitCode: err.status,
    };
  }
}

// === Version ===

test("CLI: --version outputs package version", async () => {
  const { stdout, exitCode } = runCli(["--version"]);
  const pkg = require("../package.json");
  assert.strictEqual(stdout.trim(), pkg.version);
  assert.strictEqual(exitCode, 0);
});

// === Tools command ===

test("CLI: tools command lists claude-code adapter", async () => {
  const { stdout, exitCode } = runCli(["tools"]);
  assert.ok(stdout.includes("claude-code"), "should list claude-code");
  assert.ok(stdout.includes("Claude Code"), "should show display name");
  assert.ok(stdout.includes("Supported tools"), "should show header");
  assert.strictEqual(exitCode, 0);
});

test("CLI: tools command shows capabilities", async () => {
  const { stdout } = runCli(["tools"]);
  assert.ok(stdout.includes("commands"), "should show commands capability");
  assert.ok(stdout.includes("refs"), "should show refs capability");
});

test("CLI: tools command shows usage hint", async () => {
  const { stdout } = runCli(["tools"]);
  assert.ok(
    stdout.includes("npx refactoring-kit install --tool="),
    "should show usage hint"
  );
});

// === Install command ===

test("CLI: install --dry-run shows file list without writing", async () => {
  const { stdout, exitCode } = runCli([
    "install",
    "--tool=claude-code",
    "--dry-run",
  ]);
  assert.ok(stdout.includes("Would install"), "should show dry-run message");
  assert.ok(stdout.includes("would create:"), "should list files");
  assert.ok(stdout.includes("SKILL.md"), "should include SKILL.md");
  assert.strictEqual(exitCode, 0);
});

test("CLI: install defaults to claude-code when no --tool specified", async () => {
  const { stdout, exitCode } = runCli(["install", "--dry-run"]);
  assert.ok(
    stdout.includes("Claude Code") || stdout.includes("Would install"),
    "should default to claude-code"
  );
  assert.strictEqual(exitCode, 0);
});

test("CLI: install with unknown tool shows error and exits 1", async () => {
  const { stderr, exitCode } = runCli(["install", "--tool=nonexistent"]);
  assert.ok(
    stderr.includes("Unknown tool") || stderr.includes("nonexistent"),
    "should show error for unknown tool"
  );
  assert.strictEqual(exitCode, 1);
});

test("CLI: install with multiple tools (comma-separated)", async () => {
  // Only claude-code exists right now, so second tool should fail
  const { stdout, stderr, exitCode } = runCli([
    "install",
    "--tool=claude-code,nonexistent",
    "--dry-run",
  ]);
  assert.ok(
    stdout.includes("Would install") || stdout.includes("Claude Code"),
    "should process claude-code"
  );
  assert.ok(
    stderr.includes("nonexistent"),
    "should report error for unknown tool"
  );
  assert.strictEqual(exitCode, 1, "should exit 1 when any tool fails");
});

// === Uninstall command ===

test("CLI: uninstall with unknown tool shows error", async () => {
  const { stderr, exitCode } = runCli(["uninstall", "--tool=nonexistent"]);
  assert.ok(
    stderr.includes("Unknown tool") || stderr.includes("nonexistent"),
    "should show error"
  );
  assert.strictEqual(exitCode, 1);
});

// === Help ===

test("CLI: --help shows all commands", async () => {
  const { stdout, exitCode } = runCli(["--help"]);
  assert.ok(stdout.includes("install"), "should list install command");
  assert.ok(stdout.includes("uninstall"), "should list uninstall command");
  assert.ok(stdout.includes("tools"), "should list tools command");
  assert.strictEqual(exitCode, 0);
});

test("CLI: install --help shows options", async () => {
  const { stdout, exitCode } = runCli(["install", "--help"]);
  assert.ok(stdout.includes("--tool"), "should show --tool option");
  assert.ok(stdout.includes("--global"), "should show --global option");
  assert.ok(stdout.includes("--dry-run"), "should show --dry-run option");
  assert.strictEqual(exitCode, 0);
});

// === Uninstall dry-run ===

test("CLI: uninstall --dry-run shows what would be removed", async () => {
  const { stdout, exitCode } = runCli([
    "uninstall",
    "--tool=claude-code",
    "--dry-run",
  ]);
  assert.ok(
    stdout.includes("Would remove") || stdout.includes("Claude Code"),
    "should show dry-run message"
  );
  assert.strictEqual(exitCode, 0);
});

test("CLI: uninstall --help shows --dry-run option", async () => {
  const { stdout, exitCode } = runCli(["uninstall", "--help"]);
  assert.ok(stdout.includes("--dry-run"), "should show --dry-run option");
  assert.ok(stdout.includes("--tool"), "should show --tool option");
  assert.strictEqual(exitCode, 0);
});

// === Multi-tool success ===

test("CLI: install single tool (claude-code) succeeds with dry-run", async () => {
  const { stdout, exitCode } = runCli([
    "install",
    "--tool=claude-code",
    "--dry-run",
  ]);
  assert.ok(stdout.includes("Would install"), "should show success");
  assert.strictEqual(exitCode, 0);
});

// === Edge cases ===

test("CLI: no arguments shows usage info", async () => {
  const { stdout, stderr } = runCli([]);
  const output = stdout + stderr;
  assert.ok(
    output.includes("install") || output.includes("Usage"),
    "should show help or usage when no command given"
  );
});
