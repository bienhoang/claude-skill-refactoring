#!/usr/bin/env node

/**
 * Phase 05 Tier 3 Adapter Tests
 *
 * Tests for Continue.dev, CodeBuddy, Kiro adapters.
 * Covers:
 * - Registry discovery (12 adapters)
 * - Continue.dev: .prompt files, YAML frontmatter, <s> tags, {{{ input }}}, install/uninstall
 * - CodeBuddy: commands/*.md, @ file references, references dir, install/uninstall
 * - Kiro: specs/ with EARS requirements, design, tasks, install/uninstall
 *
 * Run with: node --test tests/phase-05-tier3-adapters.test.js
 */

const test = require("node:test");
const assert = require("node:assert");
const path = require("path");
const fs = require("fs");
const os = require("os");

// === Imports ===
const ContinueDevAdapter = require("../adapters/continue-dev");
const CodeBuddyAdapter = require("../adapters/codebuddy");
const KiroAdapter = require("../adapters/kiro");

const PKG_DIR = path.resolve(__dirname, "..");

// === Helpers ===

function createTempDir(prefix = "test-") {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  return {
    dir,
    cleanup: () => {
      if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
    },
  };
}

// === Registry Discovery ===

test("Registry: discovers all 12 adapters (Tier 1 + 2 + 3)", () => {
  delete require.cache[require.resolve("../adapters/registry")];
  const registry = require("../adapters/registry");
  const list = registry.list();
  const names = list.map((a) => a.name);
  assert.ok(names.includes("continue-dev"), "should have continue-dev");
  assert.ok(names.includes("codebuddy"), "should have codebuddy");
  assert.ok(names.includes("kiro"), "should have kiro");
  assert.ok(list.length >= 12, "should have at least 12 adapters");
});

// === Continue.dev Adapter ===

test("Continue.dev: name and displayName", () => {
  const adapter = new ContinueDevAdapter();
  assert.strictEqual(adapter.name, "continue-dev");
  assert.strictEqual(adapter.displayName, "Continue.dev");
});

test("Continue.dev: supports global scope", () => {
  const adapter = new ContinueDevAdapter();
  const globalPath = adapter.getInstallPath("global", "/tmp");
  assert.ok(globalPath.includes(".continue"), "global path should contain .continue");
});

test("Continue.dev: dry-run lists .prompt files", () => {
  const adapter = new ContinueDevAdapter();
  const temp = createTempDir("cont-dry-");
  try {
    const result = adapter.install({ packageDir: PKG_DIR, scope: "project", projectRoot: temp.dir, dryRun: true });
    assert.strictEqual(result.success, true);
    assert.ok(result.files.some((f) => f.endsWith(".prompt")), "should list .prompt files");
    assert.ok(result.files.some((f) => f.includes("refactor.prompt")), "should have router prompt");
    assert.ok(result.files.some((f) => f.includes("refactor-review.prompt")), "should have review prompt");
  } finally {
    temp.cleanup();
  }
});

test("Continue.dev: install creates .prompt files with valid frontmatter", () => {
  const adapter = new ContinueDevAdapter();
  const temp = createTempDir("cont-install-");
  try {
    adapter.install({ packageDir: PKG_DIR, scope: "project", projectRoot: temp.dir });

    const promptsDir = path.join(temp.dir, ".continue", "prompts");
    assert.ok(fs.existsSync(promptsDir), "should create prompts dir");

    // Check router prompt
    const routerPath = path.join(promptsDir, "refactor.prompt");
    assert.ok(fs.existsSync(routerPath), "should create refactor.prompt");
    const routerContent = fs.readFileSync(routerPath, "utf-8");
    assert.ok(routerContent.startsWith("---"), "should have YAML frontmatter");
    assert.ok(routerContent.includes("name: refactor"), "should have name in frontmatter");
    assert.ok(routerContent.includes("<s>"), "should have system message tag");
    assert.ok(routerContent.includes("</s>"), "should close system message tag");
    assert.ok(routerContent.includes("{{{ input }}}"), "should have Handlebars input variable");

    // Check command prompt
    const reviewPath = path.join(promptsDir, "refactor-review.prompt");
    assert.ok(fs.existsSync(reviewPath), "should create review prompt");
    const reviewContent = fs.readFileSync(reviewPath, "utf-8");
    assert.ok(reviewContent.includes("name: refactor-review"), "should have correct name");
  } finally {
    temp.cleanup();
  }
});

test("Continue.dev: prompt files have no Claude-specific syntax", () => {
  const adapter = new ContinueDevAdapter();
  const temp = createTempDir("cont-clean-");
  try {
    adapter.install({ packageDir: PKG_DIR, scope: "project", projectRoot: temp.dir });
    const promptsDir = path.join(temp.dir, ".continue", "prompts");
    for (const file of fs.readdirSync(promptsDir)) {
      const content = fs.readFileSync(path.join(promptsDir, file), "utf-8");
      assert.ok(!content.includes("$ARGUMENTS"), `${file} should not have $ARGUMENTS`);
      assert.ok(!content.includes("Activate `refactoring`"), `${file} should not have Activate directive`);
    }
  } finally {
    temp.cleanup();
  }
});

test("Continue.dev: creates 6 prompt files total", () => {
  const adapter = new ContinueDevAdapter();
  const temp = createTempDir("cont-count-");
  try {
    adapter.install({ packageDir: PKG_DIR, scope: "project", projectRoot: temp.dir });
    const promptsDir = path.join(temp.dir, ".continue", "prompts");
    const prompts = fs.readdirSync(promptsDir).filter((f) => f.endsWith(".prompt"));
    assert.strictEqual(prompts.length, 6, "should have 6 prompt files (1 router + 5 commands)");
  } finally {
    temp.cleanup();
  }
});

test("Continue.dev: uninstall removes prompt files", () => {
  const adapter = new ContinueDevAdapter();
  const temp = createTempDir("cont-uninstall-");
  try {
    adapter.install({ packageDir: PKG_DIR, scope: "project", projectRoot: temp.dir });
    adapter.uninstall({ scope: "project", projectRoot: temp.dir });

    const promptsDir = path.join(temp.dir, ".continue", "prompts");
    const remaining = fs.existsSync(promptsDir)
      ? fs.readdirSync(promptsDir).filter((f) => f.includes("refactor"))
      : [];
    assert.strictEqual(remaining.length, 0, "should remove all prompt files");
    assert.ok(!adapter.hasMarker(path.join(temp.dir, ".continue")), "should remove marker");
  } finally {
    temp.cleanup();
  }
});

test("Continue.dev: uninstall is no-op if not installed", () => {
  const adapter = new ContinueDevAdapter();
  const temp = createTempDir("cont-noop-");
  try {
    const result = adapter.uninstall({ scope: "project", projectRoot: temp.dir });
    assert.ok(result.success);
    assert.ok(result.message.includes("nothing to remove"));
  } finally {
    temp.cleanup();
  }
});

// === CodeBuddy Adapter ===

test("CodeBuddy: name and displayName", () => {
  const adapter = new CodeBuddyAdapter();
  assert.strictEqual(adapter.name, "codebuddy");
  assert.strictEqual(adapter.displayName, "CodeBuddy");
});

test("CodeBuddy: supports global scope", () => {
  const adapter = new CodeBuddyAdapter();
  const globalPath = adapter.getInstallPath("global", "/tmp");
  assert.ok(globalPath.includes(".codebuddy"), "global path should contain .codebuddy");
});

test("CodeBuddy: dry-run lists commands and references", () => {
  const adapter = new CodeBuddyAdapter();
  const temp = createTempDir("cb-dry-");
  try {
    const result = adapter.install({ packageDir: PKG_DIR, scope: "project", projectRoot: temp.dir, dryRun: true });
    assert.strictEqual(result.success, true);
    assert.ok(result.files.some((f) => f.includes("commands/")), "should list command files");
    assert.ok(result.files.some((f) => f.includes("references/")), "should list reference files");
  } finally {
    temp.cleanup();
  }
});

test("CodeBuddy: install creates command files with @ references", () => {
  const adapter = new CodeBuddyAdapter();
  const temp = createTempDir("cb-install-");
  try {
    adapter.install({ packageDir: PKG_DIR, scope: "project", projectRoot: temp.dir });

    const cmdDir = path.join(temp.dir, ".codebuddy", "commands");
    assert.ok(fs.existsSync(cmdDir), "should create commands dir");

    // Main command
    const mainPath = path.join(cmdDir, "refactor.md");
    assert.ok(fs.existsSync(mainPath), "should create refactor.md");

    // Sub-command with @ references
    const reviewPath = path.join(cmdDir, "refactor-review.md");
    assert.ok(fs.existsSync(reviewPath), "should create refactor-review.md");
    const content = fs.readFileSync(reviewPath, "utf-8");
    assert.ok(content.includes("@.codebuddy/references/"), "should have @ file references");
    assert.ok(!content.includes("$ARGUMENTS"), "should not have $ARGUMENTS");
  } finally {
    temp.cleanup();
  }
});

test("CodeBuddy: install copies reference files", () => {
  const adapter = new CodeBuddyAdapter();
  const temp = createTempDir("cb-refs-");
  try {
    adapter.install({ packageDir: PKG_DIR, scope: "project", projectRoot: temp.dir });
    const refsDir = path.join(temp.dir, ".codebuddy", "references");
    assert.ok(fs.existsSync(refsDir), "should create references dir");
    assert.ok(fs.existsSync(path.join(refsDir, "code-smells.md")), "should copy code-smells.md");
    assert.ok(fs.existsSync(path.join(refsDir, "metrics.md")), "should copy metrics.md");
  } finally {
    temp.cleanup();
  }
});

test("CodeBuddy: creates 6 command files total", () => {
  const adapter = new CodeBuddyAdapter();
  const temp = createTempDir("cb-count-");
  try {
    adapter.install({ packageDir: PKG_DIR, scope: "project", projectRoot: temp.dir });
    const cmdDir = path.join(temp.dir, ".codebuddy", "commands");
    const cmds = fs.readdirSync(cmdDir).filter((f) => f.includes("refactor"));
    assert.strictEqual(cmds.length, 6, "should have 6 command files (1 main + 5 sub-commands)");
  } finally {
    temp.cleanup();
  }
});

test("CodeBuddy: uninstall removes commands and references", () => {
  const adapter = new CodeBuddyAdapter();
  const temp = createTempDir("cb-uninstall-");
  try {
    adapter.install({ packageDir: PKG_DIR, scope: "project", projectRoot: temp.dir });
    adapter.uninstall({ scope: "project", projectRoot: temp.dir });

    const cmdDir = path.join(temp.dir, ".codebuddy", "commands");
    const remaining = fs.existsSync(cmdDir)
      ? fs.readdirSync(cmdDir).filter((f) => f.includes("refactor"))
      : [];
    assert.strictEqual(remaining.length, 0, "should remove all command files");

    const refsDir = path.join(temp.dir, ".codebuddy", "references");
    assert.ok(!fs.existsSync(refsDir), "should remove references dir");
    assert.ok(!adapter.hasMarker(path.join(temp.dir, ".codebuddy")), "should remove marker");
  } finally {
    temp.cleanup();
  }
});

// === Kiro Adapter ===

test("Kiro: name and displayName", () => {
  const adapter = new KiroAdapter();
  assert.strictEqual(adapter.name, "kiro");
  assert.strictEqual(adapter.displayName, "Kiro (limited)");
});

test("Kiro: rejects global scope", () => {
  const adapter = new KiroAdapter();
  const result = adapter.install({ packageDir: PKG_DIR, scope: "global", projectRoot: "/tmp", dryRun: true });
  assert.strictEqual(result.success, false);
  assert.ok(result.message.includes("global"));
});

test("Kiro: dry-run lists spec files", () => {
  const adapter = new KiroAdapter();
  const temp = createTempDir("kiro-dry-");
  try {
    const result = adapter.install({ packageDir: PKG_DIR, scope: "project", projectRoot: temp.dir, dryRun: true });
    assert.strictEqual(result.success, true);
    assert.ok(result.files.some((f) => f.includes("requirements.md")), "should list requirements.md");
    assert.ok(result.files.some((f) => f.includes("design.md")), "should list design.md");
    assert.ok(result.files.some((f) => f.includes("tasks.md")), "should list tasks.md");
  } finally {
    temp.cleanup();
  }
});

test("Kiro: install creates requirements.md in EARS format", () => {
  const adapter = new KiroAdapter();
  const temp = createTempDir("kiro-install-");
  try {
    adapter.install({ packageDir: PKG_DIR, scope: "project", projectRoot: temp.dir });

    const reqPath = path.join(temp.dir, ".kiro", "specs", "refactoring", "requirements.md");
    assert.ok(fs.existsSync(reqPath), "should create requirements.md");
    const content = fs.readFileSync(reqPath, "utf-8");
    assert.ok(content.includes("REQ-001"), "should have requirement IDs");
    assert.ok(content.includes("**WHEN**"), "should use EARS format (WHEN)");
    assert.ok(content.includes("**THE SYSTEM SHALL**"), "should use EARS format (SHALL)");
  } finally {
    temp.cleanup();
  }
});

test("Kiro: install creates design.md with workflow", () => {
  const adapter = new KiroAdapter();
  const temp = createTempDir("kiro-design-");
  try {
    adapter.install({ packageDir: PKG_DIR, scope: "project", projectRoot: temp.dir });

    const designPath = path.join(temp.dir, ".kiro", "specs", "refactoring", "design.md");
    assert.ok(fs.existsSync(designPath), "should create design.md");
    const content = fs.readFileSync(designPath, "utf-8");
    assert.ok(content.includes("Analyze"), "should describe analysis phase");
    assert.ok(content.includes("Verify"), "should describe verification phase");
    assert.ok(content.includes("Architecture"), "should describe architecture section");
  } finally {
    temp.cleanup();
  }
});

test("Kiro: install creates tasks.md with checklist", () => {
  const adapter = new KiroAdapter();
  const temp = createTempDir("kiro-tasks-");
  try {
    adapter.install({ packageDir: PKG_DIR, scope: "project", projectRoot: temp.dir });

    const tasksPath = path.join(temp.dir, ".kiro", "specs", "refactoring", "tasks.md");
    assert.ok(fs.existsSync(tasksPath), "should create tasks.md");
    const content = fs.readFileSync(tasksPath, "utf-8");
    assert.ok(content.includes("- [ ]"), "should have task checklist items");
    assert.ok(content.includes("Detect code smells"), "should include smell detection task");
    assert.ok(content.includes("Verify tests"), "should include test verification task");
  } finally {
    temp.cleanup();
  }
});

test("Kiro: uninstall removes entire spec directory", () => {
  const adapter = new KiroAdapter();
  const temp = createTempDir("kiro-uninstall-");
  try {
    adapter.install({ packageDir: PKG_DIR, scope: "project", projectRoot: temp.dir });
    const specDir = path.join(temp.dir, ".kiro", "specs", "refactoring");
    assert.ok(fs.existsSync(specDir), "should exist after install");

    adapter.uninstall({ scope: "project", projectRoot: temp.dir });
    assert.ok(!fs.existsSync(specDir), "should remove entire spec dir");
  } finally {
    temp.cleanup();
  }
});

test("Kiro: uninstall is no-op if not installed", () => {
  const adapter = new KiroAdapter();
  const temp = createTempDir("kiro-noop-");
  try {
    const result = adapter.uninstall({ scope: "project", projectRoot: temp.dir });
    assert.ok(result.success);
    assert.ok(result.message.includes("nothing to remove"));
  } finally {
    temp.cleanup();
  }
});

// === CLI Integration ===

test("CLI: tools command shows all 12 adapters", () => {
  const { execFileSync } = require("child_process");
  const cliPath = path.resolve(__dirname, "..", "cli.js");
  const output = execFileSync(process.execPath, [cliPath, "tools"], { encoding: "utf-8" });
  assert.ok(output.includes("continue-dev"), "should list continue-dev");
  assert.ok(output.includes("codebuddy"), "should list codebuddy");
  assert.ok(output.includes("kiro"), "should list kiro");
  assert.ok(output.includes("Supported tools ("), "should show supported tools count");
});

// === Install/Uninstall Cycle ===

test("Full cycle: install then uninstall for all 3 Tier 3 adapters", () => {
  const adapters = [
    new ContinueDevAdapter(),
    new CodeBuddyAdapter(),
    new KiroAdapter(),
  ];

  for (const adapter of adapters) {
    const temp = createTempDir(`cycle-${adapter.name}-`);
    try {
      const installResult = adapter.install({ packageDir: PKG_DIR, scope: "project", projectRoot: temp.dir });
      assert.ok(installResult.success, `${adapter.name}: install should succeed`);
      assert.ok(installResult.files.length > 0, `${adapter.name}: should list installed files`);

      const uninstallResult = adapter.uninstall({ scope: "project", projectRoot: temp.dir });
      assert.ok(uninstallResult.success, `${adapter.name}: uninstall should succeed`);
    } finally {
      temp.cleanup();
    }
  }
});
