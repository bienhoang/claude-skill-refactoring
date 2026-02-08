#!/usr/bin/env node

/**
 * Phase 01 Adapter Architecture Tests
 *
 * Tests for:
 * - Adapter Registry (discovery, getDefault, list, has, get)
 * - BaseAdapter (abstract class, marker management, file utilities)
 * - ClaudeCodeAdapter (install/uninstall with dryRun)
 * - Backward compatibility (install-skill.js, uninstall-skill.js)
 *
 * Run with: node --test tests/phase-01-adapters.test.js
 */

const test = require("node:test");
const assert = require("node:assert");
const path = require("path");
const fs = require("fs");
const os = require("os");

// === Imports ===
const BaseAdapter = require("../adapters/base-adapter");
const registry = require("../adapters/registry");
const ClaudeCodeAdapter = require("../adapters/claude-code");

// === Test Helpers ===

/**
 * Create a temporary directory for test isolation.
 * Returns an object with `dir` (path) and `cleanup()` method.
 */
function createTempDir(prefix = "test-") {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  return {
    dir,
    cleanup: () => {
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    },
  };
}

/**
 * Create mock files and directories for testing file collection.
 */
function createMockSourceTree(basePath) {
  fs.mkdirSync(path.join(basePath, "SKILL.md"), { recursive: true });
  fs.writeFileSync(
    path.join(basePath, "SKILL.md", "skill.txt"),
    "skill content"
  );
  fs.mkdirSync(path.join(basePath, "references"), { recursive: true });
  fs.writeFileSync(
    path.join(basePath, "references", "code-smells.md"),
    "smells"
  );
  fs.writeFileSync(path.join(basePath, "README.md"), "readme");
}

// === Test Suite 1: Registry Discovery ===

test("Registry: discovers ClaudeCodeAdapter on first access", async () => {
  const hasAdapter = registry.has("claude-code");
  assert.strictEqual(hasAdapter, true, "Registry should discover claude-code adapter");
});

test("Registry: registry.getDefault() returns ClaudeCodeAdapter instance", async () => {
  const defaultAdapter = registry.getDefault();
  assert.ok(
    defaultAdapter instanceof ClaudeCodeAdapter,
    "getDefault() should return ClaudeCodeAdapter instance"
  );
});

test("Registry: registry.has('claude-code') returns true", async () => {
  const has = registry.has("claude-code");
  assert.strictEqual(has, true, "should have claude-code adapter");
});

test("Registry: registry.get('nonexistent') throws with helpful message", async () => {
  assert.throws(
    () => registry.get("nonexistent"),
    /Unknown tool: "nonexistent"/,
    "should throw for unknown adapter with helpful message"
  );
});

test("Registry: registry.list() returns array with claude-code entry", async () => {
  const list = registry.list();
  assert.ok(Array.isArray(list), "list() should return array");
  const found = list.find((a) => a.name === "claude-code");
  assert.ok(found, "list should contain claude-code");
  assert.strictEqual(found.displayName, "Claude Code", "should have displayName");
  assert.ok(found.capabilities, "should have capabilities");
});

// === Test Suite 2: BaseAdapter ===

test("BaseAdapter: cannot instantiate directly (throws)", async () => {
  assert.throws(
    () => new BaseAdapter(),
    /BaseAdapter is abstract/,
    "should not allow direct instantiation"
  );
});

test("BaseAdapter: abstract methods throw 'Not implemented'", async () => {
  class TestAdapter extends BaseAdapter {
    get name() {
      return "test";
    }
  }

  const adapter = new TestAdapter();
  assert.throws(() => adapter.displayName, /Not implemented/);
  assert.throws(() => adapter.capabilities, /Not implemented/);
  assert.throws(() => adapter.getInstallPath("global", "/"), /Not implemented/);
  assert.throws(() => adapter.install({}), /Not implemented/);
  assert.throws(() => adapter.uninstall({}), /Not implemented/);
});

test("BaseAdapter: default markerFile format is .refactoring-skill-{name}", async () => {
  class TestAdapter extends BaseAdapter {
    get name() {
      return "test-tool";
    }
    get displayName() {
      return "Test Tool";
    }
    get capabilities() {
      return {};
    }
  }

  const adapter = new TestAdapter();
  assert.strictEqual(
    adapter.markerFile,
    ".refactoring-skill-test-tool",
    "should use default marker format"
  );
});

test("BaseAdapter: shared utilities work - copyRecursive", async () => {
  const temp = createTempDir("copy-test-");
  try {
    // Create source tree
    fs.mkdirSync(path.join(temp.dir, "source", "sub"), { recursive: true });
    fs.writeFileSync(
      path.join(temp.dir, "source", "file1.txt"),
      "content1"
    );
    fs.writeFileSync(
      path.join(temp.dir, "source", "sub", "file2.txt"),
      "content2"
    );

    // Copy using adapter
    const adapter = registry.getDefault();
    adapter.copyRecursive(
      path.join(temp.dir, "source"),
      path.join(temp.dir, "dest")
    );

    // Verify
    assert.ok(
      fs.existsSync(path.join(temp.dir, "dest", "file1.txt")),
      "should copy top-level file"
    );
    assert.ok(
      fs.existsSync(path.join(temp.dir, "dest", "sub", "file2.txt")),
      "should copy nested file"
    );
    assert.strictEqual(
      fs.readFileSync(path.join(temp.dir, "dest", "file1.txt"), "utf-8"),
      "content1",
      "copied file content should match"
    );
  } finally {
    temp.cleanup();
  }
});

test("BaseAdapter: shared utilities work - marker management", async () => {
  const temp = createTempDir("marker-test-");
  try {
    const adapter = registry.getDefault();
    const dir = temp.dir;

    // Write marker
    adapter.writeMarker(dir);
    assert.ok(
      fs.existsSync(path.join(dir, adapter.markerFile)),
      "marker should be written"
    );

    // Check hasMarker
    assert.strictEqual(
      adapter.hasMarker(dir),
      true,
      "hasMarker should return true"
    );

    // Remove marker
    adapter.removeMarker(dir);
    assert.strictEqual(
      adapter.hasMarker(dir),
      false,
      "hasMarker should return false after removal"
    );
  } finally {
    temp.cleanup();
  }
});

test("BaseAdapter: shared utilities work - collectFiles", async () => {
  const temp = createTempDir("collect-test-");
  try {
    // Create source tree
    const srcDir = path.join(temp.dir, "source");
    fs.mkdirSync(path.join(srcDir, "sub"), { recursive: true });
    fs.writeFileSync(path.join(srcDir, "file1.txt"), "content");
    fs.writeFileSync(path.join(srcDir, "sub", "file2.txt"), "content");

    const adapter = registry.getDefault();
    const files = adapter.collectFiles(srcDir, path.join(temp.dir, "dest"));

    assert.ok(Array.isArray(files), "should return array");
    assert.ok(
      files.some((f) => f.endsWith("file1.txt")),
      "should include file1.txt"
    );
    assert.ok(
      files.some((f) => f.includes("sub") && f.endsWith("file2.txt")),
      "should include nested sub/file2.txt"
    );
  } finally {
    temp.cleanup();
  }
});

// === Test Suite 3: ClaudeCodeAdapter ===

test("ClaudeCodeAdapter: name returns 'claude-code'", async () => {
  const adapter = new ClaudeCodeAdapter();
  assert.strictEqual(adapter.name, "claude-code");
});

test("ClaudeCodeAdapter: displayName returns 'Claude Code'", async () => {
  const adapter = new ClaudeCodeAdapter();
  assert.strictEqual(adapter.displayName, "Claude Code");
});

test("ClaudeCodeAdapter: markerFile returns '.refactoring-skill' (backward compat)", async () => {
  const adapter = new ClaudeCodeAdapter();
  assert.strictEqual(adapter.markerFile, ".refactoring-skill");
});

test("ClaudeCodeAdapter: capabilities has expected shape", async () => {
  const adapter = new ClaudeCodeAdapter();
  const caps = adapter.capabilities;
  assert.ok(typeof caps.slashCommands === "boolean", "should have slashCommands");
  assert.ok(typeof caps.workflows === "boolean", "should have workflows");
  assert.ok(typeof caps.separateReferences === "boolean", "should have separateReferences");
  assert.ok(typeof caps.fileGlobs === "boolean", "should have fileGlobs");
  assert.strictEqual(caps.slashCommands, true);
  assert.strictEqual(caps.separateReferences, true);
});

test("ClaudeCodeAdapter: getInstallPath for global scope", async () => {
  const adapter = new ClaudeCodeAdapter();
  const home = adapter.getHome();
  const globalPath = adapter.getInstallPath("global", "/some/project");
  assert.strictEqual(
    globalPath,
    path.join(home, ".claude", "skills", "refactoring"),
    "global path should use $HOME"
  );
});

test("ClaudeCodeAdapter: getInstallPath for project scope", async () => {
  const projectRoot = "/my/project";
  const adapter = new ClaudeCodeAdapter();
  const projectPath = adapter.getInstallPath("project", projectRoot);
  assert.strictEqual(
    projectPath,
    path.join(projectRoot, ".claude", "skills", "refactoring"),
    "project path should use projectRoot"
  );
});

test("ClaudeCodeAdapter: install() with dryRun returns file list without writing", async () => {
  const temp = createTempDir("install-dryrun-");
  try {
    // Create minimal package structure
    const pkgDir = path.join(temp.dir, "package");
    fs.mkdirSync(path.join(pkgDir, "references"), { recursive: true });
    fs.mkdirSync(path.join(pkgDir, "resources"), { recursive: true });
    fs.mkdirSync(path.join(pkgDir, "commands", "refactor"), { recursive: true });
    fs.writeFileSync(path.join(pkgDir, "SKILL.md"), "skill");
    fs.writeFileSync(path.join(pkgDir, "REFERENCE.md"), "ref");
    fs.writeFileSync(path.join(pkgDir, "commands", "refactor.md"), "router");

    const adapter = new ClaudeCodeAdapter();
    const result = adapter.install({
      packageDir: pkgDir,
      scope: "project",
      projectRoot: temp.dir,
      dryRun: true,
    });

    assert.strictEqual(result.success, true, "should succeed");
    assert.ok(Array.isArray(result.files), "should return files array");
    assert.ok(result.files.length > 0, "should list files");

    // Verify nothing was actually written
    const skillDir = path.join(temp.dir, ".claude", "skills", "refactoring");
    assert.strictEqual(
      fs.existsSync(skillDir),
      false,
      "should not create skillDir on dryRun"
    );
  } finally {
    temp.cleanup();
  }
});

test("ClaudeCodeAdapter: install() actually copies files correctly", async () => {
  const temp = createTempDir("install-real-");
  try {
    // Create package structure with real files
    const pkgDir = path.join(temp.dir, "package");
    fs.mkdirSync(path.join(pkgDir, "references"), { recursive: true });
    fs.mkdirSync(path.join(pkgDir, "resources"), { recursive: true });
    fs.mkdirSync(path.join(pkgDir, "commands", "refactor"), { recursive: true });
    fs.writeFileSync(path.join(pkgDir, "SKILL.md"), "skill content");
    fs.writeFileSync(path.join(pkgDir, "REFERENCE.md"), "reference content");
    fs.writeFileSync(path.join(pkgDir, "references", "code-smells.md"), "smells");
    fs.writeFileSync(path.join(pkgDir, "resources", "template.md"), "template");
    fs.writeFileSync(path.join(pkgDir, "commands", "refactor.md"), "router");

    const adapter = new ClaudeCodeAdapter();
    const result = adapter.install({
      packageDir: pkgDir,
      scope: "project",
      projectRoot: temp.dir,
      dryRun: false,
    });

    assert.strictEqual(result.success, true, "install should succeed");

    // Verify files were actually copied
    const skillDir = path.join(temp.dir, ".claude", "skills", "refactoring");
    assert.ok(
      fs.existsSync(path.join(skillDir, "SKILL.md")),
      "SKILL.md should be copied"
    );
    assert.ok(
      fs.existsSync(path.join(skillDir, "REFERENCE.md")),
      "REFERENCE.md should be copied"
    );
    assert.ok(
      fs.existsSync(path.join(skillDir, "references", "code-smells.md")),
      "references/ should be copied"
    );
    assert.ok(
      fs.existsSync(path.join(skillDir, "resources", "template.md")),
      "resources/ should be copied"
    );

    // Verify commands copied
    const commandsDir = path.join(temp.dir, ".claude", "commands");
    assert.ok(
      fs.existsSync(path.join(commandsDir, "refactor.md")),
      "router command should be copied"
    );
  } finally {
    temp.cleanup();
  }
});

test("ClaudeCodeAdapter: uninstall() removes installed files", async () => {
  const temp = createTempDir("uninstall-");
  try {
    // Create the directory structure as if already installed
    const skillDir = path.join(temp.dir, ".claude", "skills", "refactoring");
    const commandsDir = path.join(temp.dir, ".claude", "commands");
    fs.mkdirSync(path.join(skillDir, "references"), { recursive: true });
    fs.mkdirSync(path.join(commandsDir, "refactor"), { recursive: true });
    fs.writeFileSync(path.join(skillDir, "SKILL.md"), "content");
    fs.writeFileSync(
      path.join(commandsDir, "refactor", ".refactoring-skill"),
      "marker"
    );

    // Verify they exist
    assert.ok(fs.existsSync(skillDir), "skillDir should exist before uninstall");

    // Uninstall
    const adapter = new ClaudeCodeAdapter();
    const result = adapter.uninstall({
      scope: "project",
      projectRoot: temp.dir,
      dryRun: false,
    });

    assert.strictEqual(result.success, true, "uninstall should succeed");
    assert.strictEqual(
      fs.existsSync(skillDir),
      false,
      "skillDir should be removed"
    );
  } finally {
    temp.cleanup();
  }
});

// === Test Suite 4: Backward Compatibility ===

test("Backward Compatibility: install-skill.js can be required without error", async () => {
  // install-skill.js requires registry and calls getDefault().install()
  // We just need to ensure it can be required without crashing
  assert.doesNotThrow(() => {
    require("../install-skill.js");
  }, "install-skill.js should be requireable");
});

test("Backward Compatibility: uninstall-skill.js can be required without error", async () => {
  // uninstall-skill.js requires registry and calls getDefault().uninstall()
  // We just need to ensure it can be required without crashing
  assert.doesNotThrow(() => {
    require("../uninstall-skill.js");
  }, "uninstall-skill.js should be requireable");
});

// === Test Suite 5: Integration Tests ===

test("Integration: Registry singleton persists across multiple accesses", async () => {
  const adapter1 = registry.getDefault();
  const adapter2 = registry.getDefault();
  assert.strictEqual(
    adapter1,
    adapter2,
    "getDefault() should return same instance"
  );
});

test("Integration: ClaudeCodeAdapter.getInstallPath consistency", async () => {
  const adapter = new ClaudeCodeAdapter();
  const projectRoot = "/my/project";
  const path1 = adapter.getInstallPath("project", projectRoot);
  const path2 = adapter.getInstallPath("project", projectRoot);
  assert.strictEqual(
    path1,
    path2,
    "getInstallPath should return consistent results"
  );
});

test("Integration: dryRun does not modify filesystem", async () => {
  const temp = createTempDir("integration-dryrun-");
  try {
    const pkgDir = path.join(temp.dir, "pkg");
    fs.mkdirSync(path.join(pkgDir, "references"), { recursive: true });
    fs.mkdirSync(path.join(pkgDir, "commands", "refactor"), { recursive: true });
    fs.writeFileSync(path.join(pkgDir, "SKILL.md"), "skill");
    fs.writeFileSync(path.join(pkgDir, "REFERENCE.md"), "ref");
    fs.writeFileSync(path.join(pkgDir, "commands", "refactor.md"), "router");

    const adapter = new ClaudeCodeAdapter();
    adapter.install({
      packageDir: pkgDir,
      scope: "project",
      projectRoot: temp.dir,
      dryRun: true,
    });

    const claudeDir = path.join(temp.dir, ".claude");
    assert.strictEqual(
      fs.existsSync(claudeDir),
      false,
      "dryRun should not create .claude directory"
    );
  } finally {
    temp.cleanup();
  }
});

test("Integration: hasConflict detects existing files without marker", async () => {
  const temp = createTempDir("conflict-");
  try {
    const filePath = path.join(temp.dir, "test.txt");
    const markerDir = temp.dir;

    // Create file without marker
    fs.writeFileSync(filePath, "existing content");

    const adapter = new ClaudeCodeAdapter();
    const hasConflict = adapter.hasConflict(filePath, markerDir);
    assert.strictEqual(
      hasConflict,
      true,
      "should detect conflict when file exists without marker"
    );

    // Write marker
    adapter.writeMarker(markerDir);
    const noConflict = adapter.hasConflict(filePath, markerDir);
    assert.strictEqual(
      noConflict,
      false,
      "should not detect conflict when marker exists"
    );
  } finally {
    temp.cleanup();
  }
});
