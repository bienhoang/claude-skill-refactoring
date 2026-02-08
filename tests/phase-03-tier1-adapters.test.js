#!/usr/bin/env node

/**
 * Phase 03 Tier 1 Adapter Tests
 *
 * Tests for Cursor, Windsurf, Gemini CLI, Codex CLI adapters plus
 * shared content-utils. Covers:
 * - Registry discovery (5 adapters)
 * - Content utils (frontmatter strip, directives, truncate, markers, append)
 * - Cursor: MDC format, alwaysApply rules, install/uninstall
 * - Windsurf: workflows, 12k char limit, rules, install/uninstall
 * - Gemini CLI: GEMINI.md append/replace, .bak backup, install/uninstall
 * - Codex CLI: AGENTS.md append/replace, $skill invocations, install/uninstall
 *
 * Run with: node --test tests/phase-03-tier1-adapters.test.js
 */

const test = require("node:test");
const assert = require("node:assert");
const path = require("path");
const fs = require("fs");
const os = require("os");

// === Imports ===
const {
  stripClaudeFrontmatter,
  stripClaudeDirectives,
  truncateToLimit,
  wrapWithMarkers,
  appendToExistingFile,
  MARKER_START,
  MARKER_END,
} = require("../adapters/content-utils");

const CursorAdapter = require("../adapters/cursor");
const WindsurfAdapter = require("../adapters/windsurf");
const GeminiCliAdapter = require("../adapters/gemini-cli");
const CodexCliAdapter = require("../adapters/codex-cli");

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

// === Content Utils Tests ===

test("content-utils: stripClaudeFrontmatter removes YAML block", () => {
  const input = "---\nname: test\ndescription: foo\n---\n\n# Content";
  assert.strictEqual(stripClaudeFrontmatter(input), "# Content");
});

test("content-utils: stripClaudeFrontmatter handles no frontmatter", () => {
  assert.strictEqual(stripClaudeFrontmatter("# Just content"), "# Just content");
});

test("content-utils: stripClaudeDirectives removes Activate and target", () => {
  const input = 'Activate `refactoring` skill.\n\n## Mission\n<target>$ARGUMENTS</target>\nDo work.';
  const result = stripClaudeDirectives(input);
  assert.ok(!result.includes("Activate"), "should remove Activate directive");
  assert.ok(!result.includes("$ARGUMENTS"), "should remove target directive");
  assert.ok(result.includes("## Mission"), "should keep other content");
});

test("content-utils: truncateToLimit returns content under limit as-is", () => {
  const short = "Hello world";
  assert.strictEqual(truncateToLimit(short, 1000), short);
});

test("content-utils: truncateToLimit trims content exceeding limit", () => {
  const long = "x".repeat(15000);
  const result = truncateToLimit(long, 12000);
  assert.ok(result.length <= 12000, "should be under limit");
  assert.ok(result.includes("truncated"), "should include truncation notice");
});

test("content-utils: wrapWithMarkers adds start/end markers", () => {
  const result = wrapWithMarkers("content");
  assert.ok(result.startsWith(MARKER_START));
  assert.ok(result.endsWith(MARKER_END));
  assert.ok(result.includes("content"));
});

test("content-utils: appendToExistingFile creates new file", () => {
  const temp = createTempDir("append-create-");
  try {
    const filePath = path.join(temp.dir, "NEW.md");
    const result = appendToExistingFile(filePath, "new content");
    assert.strictEqual(result.action, "created");
    assert.ok(fs.existsSync(filePath));
    const content = fs.readFileSync(filePath, "utf-8");
    assert.ok(content.includes(MARKER_START));
    assert.ok(content.includes("new content"));
  } finally {
    temp.cleanup();
  }
});

test("content-utils: appendToExistingFile appends to existing with .bak", () => {
  const temp = createTempDir("append-existing-");
  try {
    const filePath = path.join(temp.dir, "EXISTING.md");
    fs.writeFileSync(filePath, "# Existing content\n\nKeep this.");
    const result = appendToExistingFile(filePath, "appended section");
    assert.strictEqual(result.action, "appended");
    assert.ok(fs.existsSync(filePath + ".bak"), "should create .bak");
    const content = fs.readFileSync(filePath, "utf-8");
    assert.ok(content.includes("Existing content"), "should keep existing");
    assert.ok(content.includes("appended section"), "should add new");
  } finally {
    temp.cleanup();
  }
});

test("content-utils: appendToExistingFile replaces existing section", () => {
  const temp = createTempDir("append-replace-");
  try {
    const filePath = path.join(temp.dir, "REPLACE.md");
    const initial = `# File\n\n${MARKER_START}\nold content\n${MARKER_END}\n\n# Footer`;
    fs.writeFileSync(filePath, initial);
    const result = appendToExistingFile(filePath, "new content");
    assert.strictEqual(result.action, "replaced");
    const content = fs.readFileSync(filePath, "utf-8");
    assert.ok(content.includes("new content"), "should have new content");
    assert.ok(!content.includes("old content"), "should not have old content");
    assert.ok(content.includes("# Footer"), "should keep surrounding content");
  } finally {
    temp.cleanup();
  }
});

test("content-utils: appendToExistingFile skips on damaged markers", () => {
  const temp = createTempDir("append-damaged-");
  try {
    const filePath = path.join(temp.dir, "DAMAGED.md");
    fs.writeFileSync(filePath, `# File\n\n${MARKER_START}\nonly start marker`);
    const result = appendToExistingFile(filePath, "content");
    assert.strictEqual(result.action, "skipped");
    assert.ok(result.message.includes("damaged"));
  } finally {
    temp.cleanup();
  }
});

// === Edge Case Tests ===

test("content-utils: appendToExistingFile handles empty existing file", () => {
  const temp = createTempDir("append-empty-");
  try {
    const filePath = path.join(temp.dir, "EMPTY.md");
    fs.writeFileSync(filePath, "");
    const result = appendToExistingFile(filePath, "new content");
    assert.strictEqual(result.action, "appended");
    const content = fs.readFileSync(filePath, "utf-8");
    assert.ok(content.includes("new content"));
  } finally {
    temp.cleanup();
  }
});

test("content-utils: appendToExistingFile dry-run does not write", () => {
  const temp = createTempDir("append-dryrun-");
  try {
    const filePath = path.join(temp.dir, "DRYRUN.md");
    const result = appendToExistingFile(filePath, "content", true);
    assert.strictEqual(result.action, "created");
    assert.ok(!fs.existsSync(filePath), "should not create file on dry-run");
  } finally {
    temp.cleanup();
  }
});

test("content-utils: truncateToLimit removes sections from end before hard truncate", () => {
  const sections = "## Section 1\nShort.\n\n## Section 2\nAlso short.\n\n## Section 3\n" + "x".repeat(5000);
  const result = truncateToLimit(sections, 200);
  assert.ok(result.length <= 200, "should be under limit");
});

test("content-utils: stripClaudeFrontmatter handles multiline description", () => {
  const input = "---\nname: test\ndescription: >\n  multi\n  line\n---\n\n# Content";
  const result = stripClaudeFrontmatter(input);
  assert.strictEqual(result, "# Content");
});

test("content-utils: escapeRegex escapes special chars", () => {
  const { escapeRegex } = require("../adapters/content-utils");
  const input = "a.b+c*d?e(f)g[h]i{j}";
  const escaped = escapeRegex(input);
  assert.ok(escaped.includes("\\."), "dots should be escaped");
  assert.ok(escaped.includes("\\+"), "plus should be escaped");
  const regex = new RegExp(escaped);
  assert.ok(regex.test(input), "should match literal string");
  assert.ok(!regex.test("axb+c*d?e(f)g[h]i{j}"), "should not match with replaced dot");
});

// === Registry Discovery ===

test("Registry: discovers Tier 1 adapters", () => {
  // Use fresh registry
  delete require.cache[require.resolve("../adapters/registry")];
  const registry = require("../adapters/registry");
  const list = registry.list();
  const names = list.map((a) => a.name);
  assert.ok(names.includes("claude-code"), "should have claude-code");
  assert.ok(names.includes("cursor"), "should have cursor");
  assert.ok(names.includes("windsurf"), "should have windsurf");
  assert.ok(names.includes("gemini-cli"), "should have gemini-cli");
  assert.ok(names.includes("codex-cli"), "should have codex-cli");
  assert.ok(list.length >= 5, "should have at least 5 adapters");
});

// === Cursor Adapter ===

test("Cursor: name and displayName", () => {
  const adapter = new CursorAdapter();
  assert.strictEqual(adapter.name, "cursor");
  assert.strictEqual(adapter.displayName, "Cursor");
});

test("Cursor: rejects global scope", () => {
  const adapter = new CursorAdapter();
  const result = adapter.install({ packageDir: PKG_DIR, scope: "global", projectRoot: "/tmp", dryRun: true });
  assert.strictEqual(result.success, false);
  assert.ok(result.message.includes("global"));
});

test("Cursor: dry-run lists .mdc files", () => {
  const adapter = new CursorAdapter();
  const temp = createTempDir("cursor-dry-");
  try {
    const result = adapter.install({ packageDir: PKG_DIR, scope: "project", projectRoot: temp.dir, dryRun: true });
    assert.strictEqual(result.success, true);
    assert.ok(result.files.length > 0, "should list files");
    assert.ok(result.files.some((f) => f.endsWith(".mdc")), "should have .mdc files");
    assert.ok(result.files.some((f) => f.includes("refactoring-skill.mdc")), "should include skill rule");
  } finally {
    temp.cleanup();
  }
});

test("Cursor: install creates valid MDC with frontmatter", () => {
  const adapter = new CursorAdapter();
  const temp = createTempDir("cursor-install-");
  try {
    adapter.install({ packageDir: PKG_DIR, scope: "project", projectRoot: temp.dir, dryRun: false });
    const skillPath = path.join(temp.dir, ".cursor", "rules", "refactoring-skill.mdc");
    assert.ok(fs.existsSync(skillPath), "should create skill rule");
    const content = fs.readFileSync(skillPath, "utf-8");
    assert.ok(content.startsWith("---"), "should have YAML frontmatter");
    assert.ok(content.includes("alwaysApply: true"), "skill should be alwaysApply");
  } finally {
    temp.cleanup();
  }
});

test("Cursor: command rules have alwaysApply: false", () => {
  const adapter = new CursorAdapter();
  const temp = createTempDir("cursor-cmds-");
  try {
    adapter.install({ packageDir: PKG_DIR, scope: "project", projectRoot: temp.dir, dryRun: false });
    const reviewPath = path.join(temp.dir, ".cursor", "rules", "refactoring-review.mdc");
    if (fs.existsSync(reviewPath)) {
      const content = fs.readFileSync(reviewPath, "utf-8");
      assert.ok(content.includes("alwaysApply: false"), "command rules should not be alwaysApply");
    }
  } finally {
    temp.cleanup();
  }
});

test("Cursor: uninstall removes installed files", () => {
  const adapter = new CursorAdapter();
  const temp = createTempDir("cursor-uninstall-");
  try {
    adapter.install({ packageDir: PKG_DIR, scope: "project", projectRoot: temp.dir, dryRun: false });
    const rulesDir = path.join(temp.dir, ".cursor", "rules");
    assert.ok(fs.existsSync(rulesDir), "should exist after install");

    adapter.uninstall({ scope: "project", projectRoot: temp.dir });
    assert.ok(!fs.existsSync(path.join(rulesDir, "refactoring-skill.mdc")), "should remove skill rule");
    assert.ok(!fs.existsSync(path.join(rulesDir, "refactoring-references")), "should remove refs dir");
  } finally {
    temp.cleanup();
  }
});

// === Windsurf Adapter ===

test("Windsurf: name and displayName", () => {
  const adapter = new WindsurfAdapter();
  assert.strictEqual(adapter.name, "windsurf");
  assert.strictEqual(adapter.displayName, "Windsurf");
});

test("Windsurf: rejects global scope", () => {
  const adapter = new WindsurfAdapter();
  const result = adapter.install({ packageDir: PKG_DIR, scope: "global", projectRoot: "/tmp", dryRun: true });
  assert.strictEqual(result.success, false);
});

test("Windsurf: dry-run lists rules and workflows", () => {
  const adapter = new WindsurfAdapter();
  const temp = createTempDir("windsurf-dry-");
  try {
    const result = adapter.install({ packageDir: PKG_DIR, scope: "project", projectRoot: temp.dir, dryRun: true });
    assert.ok(result.files.some((f) => f.includes("/rules/")), "should list rules");
    assert.ok(result.files.some((f) => f.includes("/workflows/")), "should list workflows");
  } finally {
    temp.cleanup();
  }
});

test("Windsurf: install creates workflow files with frontmatter", () => {
  const adapter = new WindsurfAdapter();
  const temp = createTempDir("windsurf-install-");
  try {
    adapter.install({ packageDir: PKG_DIR, scope: "project", projectRoot: temp.dir, dryRun: false });
    const wfPath = path.join(temp.dir, ".windsurf", "workflows", "refactor-review.md");
    if (fs.existsSync(wfPath)) {
      const content = fs.readFileSync(wfPath, "utf-8");
      assert.ok(content.startsWith("---"), "should have frontmatter");
      assert.ok(content.includes("description:"), "should have description");
    }
  } finally {
    temp.cleanup();
  }
});

test("Windsurf: workflow files respect 12k char limit", () => {
  const adapter = new WindsurfAdapter();
  const temp = createTempDir("windsurf-limit-");
  try {
    adapter.install({ packageDir: PKG_DIR, scope: "project", projectRoot: temp.dir, dryRun: false });
    const wfDir = path.join(temp.dir, ".windsurf", "workflows");
    if (fs.existsSync(wfDir)) {
      for (const file of fs.readdirSync(wfDir)) {
        const content = fs.readFileSync(path.join(wfDir, file), "utf-8");
        assert.ok(content.length <= 12000, `${file} should be under 12k chars (is ${content.length})`);
      }
    }
  } finally {
    temp.cleanup();
  }
});

test("Windsurf: uninstall removes installed files", () => {
  const adapter = new WindsurfAdapter();
  const temp = createTempDir("windsurf-uninstall-");
  try {
    adapter.install({ packageDir: PKG_DIR, scope: "project", projectRoot: temp.dir, dryRun: false });
    adapter.uninstall({ scope: "project", projectRoot: temp.dir });
    assert.ok(!fs.existsSync(path.join(temp.dir, ".windsurf", "rules", "refactoring-skill.md")), "should remove rules");
    assert.ok(!adapter.hasMarker(path.join(temp.dir, ".windsurf")), "should remove marker");
  } finally {
    temp.cleanup();
  }
});

// === Gemini CLI Adapter ===

test("Gemini CLI: name and displayName", () => {
  const adapter = new GeminiCliAdapter();
  assert.strictEqual(adapter.name, "gemini-cli");
  assert.strictEqual(adapter.displayName, "Gemini CLI");
});

test("Gemini CLI: dry-run lists GEMINI.md and reference files", () => {
  const adapter = new GeminiCliAdapter();
  const temp = createTempDir("gemini-dry-");
  try {
    const result = adapter.install({ packageDir: PKG_DIR, scope: "project", projectRoot: temp.dir, dryRun: true });
    assert.ok(result.files.some((f) => f.includes("GEMINI.md")), "should list GEMINI.md");
    assert.ok(result.files.some((f) => f.includes(".gemini/")), "should list .gemini/ files");
  } finally {
    temp.cleanup();
  }
});

test("Gemini CLI: install creates GEMINI.md with @import references", () => {
  const adapter = new GeminiCliAdapter();
  const temp = createTempDir("gemini-install-");
  try {
    adapter.install({ packageDir: PKG_DIR, scope: "project", projectRoot: temp.dir, dryRun: false });
    const geminiMd = path.join(temp.dir, "GEMINI.md");
    assert.ok(fs.existsSync(geminiMd), "should create GEMINI.md");
    const content = fs.readFileSync(geminiMd, "utf-8");
    assert.ok(content.includes("@.gemini/refactoring/"), "should have @import refs");
    assert.ok(content.includes(MARKER_START), "should have section markers");
  } finally {
    temp.cleanup();
  }
});

test("Gemini CLI: appends to existing GEMINI.md without destroying content", () => {
  const adapter = new GeminiCliAdapter();
  const temp = createTempDir("gemini-append-");
  try {
    const geminiMd = path.join(temp.dir, "GEMINI.md");
    fs.writeFileSync(geminiMd, "# My Project\n\nExisting Gemini instructions.\n");

    adapter.install({ packageDir: PKG_DIR, scope: "project", projectRoot: temp.dir, dryRun: false });

    const content = fs.readFileSync(geminiMd, "utf-8");
    assert.ok(content.includes("My Project"), "should keep existing content");
    assert.ok(content.includes("Existing Gemini"), "should keep existing text");
    assert.ok(content.includes(MARKER_START), "should add our section");
    assert.ok(fs.existsSync(geminiMd + ".bak"), "should create .bak backup");
  } finally {
    temp.cleanup();
  }
});

test("Gemini CLI: uninstall removes section from GEMINI.md", () => {
  const adapter = new GeminiCliAdapter();
  const temp = createTempDir("gemini-uninstall-");
  try {
    const geminiMd = path.join(temp.dir, "GEMINI.md");
    fs.writeFileSync(geminiMd, "# My Project\n\nKeep this.\n");

    adapter.install({ packageDir: PKG_DIR, scope: "project", projectRoot: temp.dir });
    adapter.uninstall({ scope: "project", projectRoot: temp.dir });

    assert.ok(fs.existsSync(geminiMd), "should keep GEMINI.md (has user content)");
    const content = fs.readFileSync(geminiMd, "utf-8");
    assert.ok(!content.includes(MARKER_START), "should remove our section");
    assert.ok(content.includes("My Project"), "should keep user content");
  } finally {
    temp.cleanup();
  }
});

// === Codex CLI Adapter ===

test("Codex CLI: name and displayName", () => {
  const adapter = new CodexCliAdapter();
  assert.strictEqual(adapter.name, "codex-cli");
  assert.strictEqual(adapter.displayName, "Codex CLI");
});

test("Codex CLI: rejects global scope", () => {
  const adapter = new CodexCliAdapter();
  const result = adapter.install({ packageDir: PKG_DIR, scope: "global", projectRoot: "/tmp", dryRun: true });
  assert.strictEqual(result.success, false);
});

test("Codex CLI: dry-run lists AGENTS.md and .codex files", () => {
  const adapter = new CodexCliAdapter();
  const temp = createTempDir("codex-dry-");
  try {
    const result = adapter.install({ packageDir: PKG_DIR, scope: "project", projectRoot: temp.dir, dryRun: true });
    assert.ok(result.files.some((f) => f.includes("AGENTS.md")), "should list AGENTS.md");
    assert.ok(result.files.some((f) => f.includes(".codex/")), "should list .codex/ files");
  } finally {
    temp.cleanup();
  }
});

test("Codex CLI: install creates AGENTS.md with $skill invocations", () => {
  const adapter = new CodexCliAdapter();
  const temp = createTempDir("codex-install-");
  try {
    adapter.install({ packageDir: PKG_DIR, scope: "project", projectRoot: temp.dir, dryRun: false });
    const agentsMd = path.join(temp.dir, "AGENTS.md");
    assert.ok(fs.existsSync(agentsMd), "should create AGENTS.md");
    const content = fs.readFileSync(agentsMd, "utf-8");
    assert.ok(content.includes("$refactor"), "should have $refactor skill");
    assert.ok(content.includes("$refactor-review"), "should have $refactor-review skill");
    assert.ok(content.includes(MARKER_START), "should have section markers");
  } finally {
    temp.cleanup();
  }
});

test("Codex CLI: appends to existing AGENTS.md with .bak backup", () => {
  const adapter = new CodexCliAdapter();
  const temp = createTempDir("codex-append-");
  try {
    const agentsMd = path.join(temp.dir, "AGENTS.md");
    fs.writeFileSync(agentsMd, "# Project Agents\n\nExisting agent config.\n");

    adapter.install({ packageDir: PKG_DIR, scope: "project", projectRoot: temp.dir });

    const content = fs.readFileSync(agentsMd, "utf-8");
    assert.ok(content.includes("Project Agents"), "should keep existing");
    assert.ok(content.includes("$refactor"), "should add skill section");
    assert.ok(fs.existsSync(agentsMd + ".bak"), "should create .bak");
  } finally {
    temp.cleanup();
  }
});

test("Codex CLI: uninstall removes section from AGENTS.md", () => {
  const adapter = new CodexCliAdapter();
  const temp = createTempDir("codex-uninstall-");
  try {
    const agentsMd = path.join(temp.dir, "AGENTS.md");
    fs.writeFileSync(agentsMd, "# Project Agents\n\nKeep this.\n");

    adapter.install({ packageDir: PKG_DIR, scope: "project", projectRoot: temp.dir });
    adapter.uninstall({ scope: "project", projectRoot: temp.dir });

    const content = fs.readFileSync(agentsMd, "utf-8");
    assert.ok(!content.includes(MARKER_START), "should remove our section");
    assert.ok(content.includes("Project Agents"), "should keep user content");
  } finally {
    temp.cleanup();
  }
});

// === CLI Integration ===

test("CLI: tools command shows Tier 1 adapters", () => {
  const { execFileSync } = require("child_process");
  const cliPath = path.resolve(__dirname, "..", "cli.js");
  const output = execFileSync(process.execPath, [cliPath, "tools"], { encoding: "utf-8" });
  assert.ok(output.includes("claude-code"), "should list claude-code");
  assert.ok(output.includes("cursor"), "should list cursor");
  assert.ok(output.includes("windsurf"), "should list windsurf");
  assert.ok(output.includes("gemini-cli"), "should list gemini-cli");
  assert.ok(output.includes("codex-cli"), "should list codex-cli");
  assert.ok(output.includes("Supported tools ("), "should show supported tools count");
});
