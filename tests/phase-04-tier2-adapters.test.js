#!/usr/bin/env node

/**
 * Phase 04 Tier 2 Adapter Tests
 *
 * Tests for Copilot, Roo Code, Antigravity, OpenCode adapters.
 * Covers:
 * - Registry discovery (9 adapters)
 * - Copilot: copilot-instructions.md section, .instructions.md files, references, install/uninstall
 * - Roo Code: .roomodes JSON generation/merge, mode rules directories, install/uninstall
 * - Antigravity: SKILL.md copy, resources dir, project+global paths, install/uninstall
 * - OpenCode: AGENTS.md with OpenCode-specific markers, coexistence with Codex, install/uninstall
 *
 * Run with: node --test tests/phase-04-tier2-adapters.test.js
 */

const test = require("node:test");
const assert = require("node:assert");
const path = require("path");
const fs = require("fs");
const os = require("os");

// === Imports ===
const { MARKER_START, MARKER_END, validateMarkers } = require("../adapters/content-utils");
const CopilotAdapter = require("../adapters/copilot");
const RooCodeAdapter = require("../adapters/roo-code");
const AntigravityAdapter = require("../adapters/antigravity");
const OpenCodeAdapter = require("../adapters/opencode");

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

test("Registry: discovers all 9 adapters (Tier 1 + Tier 2)", () => {
  delete require.cache[require.resolve("../adapters/registry")];
  const registry = require("../adapters/registry");
  const list = registry.list();
  const names = list.map((a) => a.name);
  assert.ok(names.includes("copilot"), "should have copilot");
  assert.ok(names.includes("roo-code"), "should have roo-code");
  assert.ok(names.includes("antigravity"), "should have antigravity");
  assert.ok(names.includes("opencode"), "should have opencode");
  assert.strictEqual(list.length, 9, "should have exactly 9 adapters");
});

// === Copilot Adapter ===

test("Copilot: name and displayName", () => {
  const adapter = new CopilotAdapter();
  assert.strictEqual(adapter.name, "copilot");
  assert.strictEqual(adapter.displayName, "GitHub Copilot");
});

test("Copilot: rejects global scope", () => {
  const adapter = new CopilotAdapter();
  const result = adapter.install({ packageDir: PKG_DIR, scope: "global", projectRoot: "/tmp", dryRun: true });
  assert.strictEqual(result.success, false);
  assert.ok(result.message.includes("global"));
});

test("Copilot: dry-run lists copilot-instructions.md and .instructions.md files", () => {
  const adapter = new CopilotAdapter();
  const temp = createTempDir("copilot-dry-");
  try {
    const result = adapter.install({ packageDir: PKG_DIR, scope: "project", projectRoot: temp.dir, dryRun: true });
    assert.strictEqual(result.success, true);
    assert.ok(result.files.some((f) => f.includes("copilot-instructions.md")), "should list copilot-instructions.md");
    assert.ok(result.files.some((f) => f.endsWith(".instructions.md")), "should list instruction files");
  } finally {
    temp.cleanup();
  }
});

test("Copilot: install creates copilot-instructions.md with section markers", () => {
  const adapter = new CopilotAdapter();
  const temp = createTempDir("copilot-install-");
  try {
    adapter.install({ packageDir: PKG_DIR, scope: "project", projectRoot: temp.dir });
    const mdPath = path.join(temp.dir, ".github", "copilot-instructions.md");
    assert.ok(fs.existsSync(mdPath), "should create copilot-instructions.md");
    const content = fs.readFileSync(mdPath, "utf-8");
    assert.ok(content.includes(MARKER_START), "should have start marker");
    assert.ok(content.includes(MARKER_END), "should have end marker");
    assert.ok(content.includes("Refactoring Skill"), "should have skill section");
  } finally {
    temp.cleanup();
  }
});

test("Copilot: install creates .instructions.md files for commands", () => {
  const adapter = new CopilotAdapter();
  const temp = createTempDir("copilot-instrs-");
  try {
    adapter.install({ packageDir: PKG_DIR, scope: "project", projectRoot: temp.dir });
    const instrDir = path.join(temp.dir, ".github", "instructions");
    assert.ok(fs.existsSync(instrDir), "should create instructions dir");
    const files = fs.readdirSync(instrDir).filter((f) => f.endsWith(".instructions.md"));
    assert.ok(files.length >= 5, `should have at least 5 instruction files (got ${files.length})`);
    assert.ok(files.includes("refactoring-review.instructions.md"), "should have review");
    assert.ok(files.includes("refactoring-fast.instructions.md"), "should have fast");
  } finally {
    temp.cleanup();
  }
});

test("Copilot: instruction files have no Claude-specific syntax", () => {
  const adapter = new CopilotAdapter();
  const temp = createTempDir("copilot-clean-");
  try {
    adapter.install({ packageDir: PKG_DIR, scope: "project", projectRoot: temp.dir });
    const instrDir = path.join(temp.dir, ".github", "instructions");
    for (const file of fs.readdirSync(instrDir).filter((f) => f.endsWith(".instructions.md"))) {
      const content = fs.readFileSync(path.join(instrDir, file), "utf-8");
      assert.ok(!content.includes("$ARGUMENTS"), `${file} should not have $ARGUMENTS`);
      assert.ok(!content.includes("Activate `refactoring`"), `${file} should not have Activate directive`);
    }
  } finally {
    temp.cleanup();
  }
});

test("Copilot: appends to existing copilot-instructions.md with .bak", () => {
  const adapter = new CopilotAdapter();
  const temp = createTempDir("copilot-append-");
  try {
    const githubDir = path.join(temp.dir, ".github");
    fs.mkdirSync(githubDir, { recursive: true });
    const mdPath = path.join(githubDir, "copilot-instructions.md");
    fs.writeFileSync(mdPath, "# My Project\n\nExisting Copilot instructions.\n");

    adapter.install({ packageDir: PKG_DIR, scope: "project", projectRoot: temp.dir });

    const content = fs.readFileSync(mdPath, "utf-8");
    assert.ok(content.includes("My Project"), "should keep existing content");
    assert.ok(content.includes(MARKER_START), "should add section markers");
    assert.ok(fs.existsSync(mdPath + ".bak"), "should create .bak backup");
  } finally {
    temp.cleanup();
  }
});

test("Copilot: uninstall removes instruction files and references", () => {
  const adapter = new CopilotAdapter();
  const temp = createTempDir("copilot-uninstall-");
  try {
    adapter.install({ packageDir: PKG_DIR, scope: "project", projectRoot: temp.dir });
    adapter.uninstall({ scope: "project", projectRoot: temp.dir });

    const instrDir = path.join(temp.dir, ".github", "instructions");
    const instrFiles = fs.existsSync(instrDir)
      ? fs.readdirSync(instrDir).filter((f) => f.startsWith("refactoring-"))
      : [];
    assert.strictEqual(instrFiles.length, 0, "should remove all instruction files");

    const refsDir = path.join(instrDir, "refactoring-references");
    assert.ok(!fs.existsSync(refsDir), "should remove references dir");
  } finally {
    temp.cleanup();
  }
});

test("Copilot: uninstall removes section from copilot-instructions.md", () => {
  const adapter = new CopilotAdapter();
  const temp = createTempDir("copilot-unsection-");
  try {
    const githubDir = path.join(temp.dir, ".github");
    fs.mkdirSync(githubDir, { recursive: true });
    fs.writeFileSync(path.join(githubDir, "copilot-instructions.md"), "# My Project\n\nKeep this.\n");

    adapter.install({ packageDir: PKG_DIR, scope: "project", projectRoot: temp.dir });
    adapter.uninstall({ scope: "project", projectRoot: temp.dir });

    const mdPath = path.join(githubDir, "copilot-instructions.md");
    assert.ok(fs.existsSync(mdPath), "should keep file with user content");
    const content = fs.readFileSync(mdPath, "utf-8");
    assert.ok(!content.includes(MARKER_START), "should remove our section");
    assert.ok(content.includes("My Project"), "should keep user content");
  } finally {
    temp.cleanup();
  }
});

// === Roo Code Adapter ===

test("Roo Code: name and displayName", () => {
  const adapter = new RooCodeAdapter();
  assert.strictEqual(adapter.name, "roo-code");
  assert.strictEqual(adapter.displayName, "Roo Code");
});

test("Roo Code: rejects global scope", () => {
  const adapter = new RooCodeAdapter();
  const result = adapter.install({ packageDir: PKG_DIR, scope: "global", projectRoot: "/tmp", dryRun: true });
  assert.strictEqual(result.success, false);
  assert.ok(result.message.includes("global"));
});

test("Roo Code: dry-run lists rules directories and .roomodes", () => {
  const adapter = new RooCodeAdapter();
  const temp = createTempDir("roo-dry-");
  try {
    const result = adapter.install({ packageDir: PKG_DIR, scope: "project", projectRoot: temp.dir, dryRun: true });
    assert.strictEqual(result.success, true);
    assert.ok(result.files.some((f) => f.includes("rules-refactor")), "should list rules directories");
    assert.ok(result.files.some((f) => f.includes(".roomodes")), "should list .roomodes");
  } finally {
    temp.cleanup();
  }
});

test("Roo Code: install creates .roomodes with 6 modes", () => {
  const adapter = new RooCodeAdapter();
  const temp = createTempDir("roo-install-");
  try {
    adapter.install({ packageDir: PKG_DIR, scope: "project", projectRoot: temp.dir });
    const roomodesPath = path.join(temp.dir, ".roomodes");
    assert.ok(fs.existsSync(roomodesPath), "should create .roomodes");
    const data = JSON.parse(fs.readFileSync(roomodesPath, "utf-8"));
    assert.ok(Array.isArray(data.customModes), "should have customModes array");
    assert.strictEqual(data.customModes.length, 6, "should have 6 modes");
    const slugs = data.customModes.map((m) => m.slug);
    assert.ok(slugs.includes("refactor"), "should have refactor mode");
    assert.ok(slugs.includes("refactor-review"), "should have review mode");
    assert.ok(slugs.includes("refactor-arch"), "should have arch mode");
  } finally {
    temp.cleanup();
  }
});

test("Roo Code: install creates rules directories with numbered files", () => {
  const adapter = new RooCodeAdapter();
  const temp = createTempDir("roo-rules-");
  try {
    adapter.install({ packageDir: PKG_DIR, scope: "project", projectRoot: temp.dir });

    // Main refactor mode should have skill + references
    const mainRules = path.join(temp.dir, ".roo", "rules-refactor");
    assert.ok(fs.existsSync(mainRules), "should create main rules dir");
    assert.ok(fs.existsSync(path.join(mainRules, "01-skill.md")), "should have skill file");
    assert.ok(fs.existsSync(path.join(mainRules, "02-code-smells.md")), "should have code-smells ref");

    // Sub-mode rules directories
    const reviewRules = path.join(temp.dir, ".roo", "rules-refactor-review");
    assert.ok(fs.existsSync(reviewRules), "should create review rules dir");
    assert.ok(fs.existsSync(path.join(reviewRules, "01-workflow.md")), "should have workflow file");
  } finally {
    temp.cleanup();
  }
});

test("Roo Code: rules files have no Claude-specific syntax", () => {
  const adapter = new RooCodeAdapter();
  const temp = createTempDir("roo-clean-");
  try {
    adapter.install({ packageDir: PKG_DIR, scope: "project", projectRoot: temp.dir });
    const skillPath = path.join(temp.dir, ".roo", "rules-refactor", "01-skill.md");
    const content = fs.readFileSync(skillPath, "utf-8");
    assert.ok(!content.includes("$ARGUMENTS"), "should not have $ARGUMENTS");
    assert.ok(!content.includes("Activate `refactoring`"), "should not have Activate directive");
    assert.ok(!content.startsWith("---"), "should not have YAML frontmatter");
  } finally {
    temp.cleanup();
  }
});

test("Roo Code: merges with existing .roomodes", () => {
  const adapter = new RooCodeAdapter();
  const temp = createTempDir("roo-merge-");
  try {
    const roomodesPath = path.join(temp.dir, ".roomodes");
    const existing = {
      customModes: [
        { slug: "my-mode", name: "My Mode", roleDefinition: "Custom mode", groups: ["read"] },
      ],
    };
    fs.writeFileSync(roomodesPath, JSON.stringify(existing, null, 2));

    adapter.install({ packageDir: PKG_DIR, scope: "project", projectRoot: temp.dir });

    const data = JSON.parse(fs.readFileSync(roomodesPath, "utf-8"));
    assert.strictEqual(data.customModes.length, 7, "should have 6 our modes + 1 existing");
    assert.ok(data.customModes.some((m) => m.slug === "my-mode"), "should keep existing mode");
    assert.ok(data.customModes.some((m) => m.slug === "refactor"), "should add our mode");
    assert.ok(fs.existsSync(roomodesPath + ".bak"), "should create .bak backup");
  } finally {
    temp.cleanup();
  }
});

test("Roo Code: replaces our modes on re-install", () => {
  const adapter = new RooCodeAdapter();
  const temp = createTempDir("roo-replace-");
  try {
    adapter.install({ packageDir: PKG_DIR, scope: "project", projectRoot: temp.dir });
    adapter.install({ packageDir: PKG_DIR, scope: "project", projectRoot: temp.dir });
    const data = JSON.parse(fs.readFileSync(path.join(temp.dir, ".roomodes"), "utf-8"));
    assert.strictEqual(data.customModes.length, 6, "should not duplicate modes on re-install");
  } finally {
    temp.cleanup();
  }
});

test("Roo Code: uninstall removes rules directories and modes from .roomodes", () => {
  const adapter = new RooCodeAdapter();
  const temp = createTempDir("roo-uninstall-");
  try {
    // Pre-seed with a user mode
    const roomodesPath = path.join(temp.dir, ".roomodes");
    fs.writeFileSync(roomodesPath, JSON.stringify({
      customModes: [{ slug: "my-mode", name: "My Mode", roleDefinition: "Custom", groups: ["read"] }],
    }));

    adapter.install({ packageDir: PKG_DIR, scope: "project", projectRoot: temp.dir });
    adapter.uninstall({ scope: "project", projectRoot: temp.dir });

    // Rules dirs removed
    assert.ok(!fs.existsSync(path.join(temp.dir, ".roo", "rules-refactor")), "should remove rules-refactor");
    assert.ok(!fs.existsSync(path.join(temp.dir, ".roo", "rules-refactor-review")), "should remove rules-refactor-review");

    // .roomodes should keep user modes
    const data = JSON.parse(fs.readFileSync(roomodesPath, "utf-8"));
    assert.strictEqual(data.customModes.length, 1, "should keep 1 user mode");
    assert.strictEqual(data.customModes[0].slug, "my-mode", "should keep user mode");
  } finally {
    temp.cleanup();
  }
});

test("Roo Code: uninstall removes .roomodes if only our modes", () => {
  const adapter = new RooCodeAdapter();
  const temp = createTempDir("roo-rmfile-");
  try {
    adapter.install({ packageDir: PKG_DIR, scope: "project", projectRoot: temp.dir });
    adapter.uninstall({ scope: "project", projectRoot: temp.dir });
    const roomodesPath = path.join(temp.dir, ".roomodes");
    assert.ok(!fs.existsSync(roomodesPath), "should remove .roomodes when no user modes left");
  } finally {
    temp.cleanup();
  }
});

// === Antigravity Adapter ===

test("Antigravity: name and displayName", () => {
  const adapter = new AntigravityAdapter();
  assert.strictEqual(adapter.name, "antigravity");
  assert.strictEqual(adapter.displayName, "Antigravity");
});

test("Antigravity: supports global scope", () => {
  const adapter = new AntigravityAdapter();
  const globalPath = adapter.getInstallPath("global", "/tmp");
  assert.ok(globalPath.includes(".gemini"), "global path should contain .gemini");
  assert.ok(globalPath.includes("antigravity"), "global path should contain antigravity");
});

test("Antigravity: dry-run lists SKILL.md and resources", () => {
  const adapter = new AntigravityAdapter();
  const temp = createTempDir("anti-dry-");
  try {
    const result = adapter.install({ packageDir: PKG_DIR, scope: "project", projectRoot: temp.dir, dryRun: true });
    assert.strictEqual(result.success, true);
    assert.ok(result.files.some((f) => f.includes("SKILL.md")), "should list SKILL.md");
    assert.ok(result.files.some((f) => f.includes("resources")), "should list resources");
  } finally {
    temp.cleanup();
  }
});

test("Antigravity: install creates SKILL.md in .agent/skills/refactoring/", () => {
  const adapter = new AntigravityAdapter();
  const temp = createTempDir("anti-install-");
  try {
    adapter.install({ packageDir: PKG_DIR, scope: "project", projectRoot: temp.dir });
    const skillPath = path.join(temp.dir, ".agent", "skills", "refactoring", "SKILL.md");
    assert.ok(fs.existsSync(skillPath), "should create SKILL.md");
    const content = fs.readFileSync(skillPath, "utf-8");
    assert.ok(!content.startsWith("---"), "should strip frontmatter");
    assert.ok(!content.includes("Activate `refactoring`"), "should strip Claude directives");
  } finally {
    temp.cleanup();
  }
});

test("Antigravity: install copies references to resources/references/", () => {
  const adapter = new AntigravityAdapter();
  const temp = createTempDir("anti-refs-");
  try {
    adapter.install({ packageDir: PKG_DIR, scope: "project", projectRoot: temp.dir });
    const refsDir = path.join(temp.dir, ".agent", "skills", "refactoring", "resources", "references");
    assert.ok(fs.existsSync(refsDir), "should create references dir");
    assert.ok(fs.existsSync(path.join(refsDir, "code-smells.md")), "should copy code-smells.md");
    assert.ok(fs.existsSync(path.join(refsDir, "metrics.md")), "should copy metrics.md");
  } finally {
    temp.cleanup();
  }
});

test("Antigravity: install copies REFERENCE.md to resources/", () => {
  const adapter = new AntigravityAdapter();
  const temp = createTempDir("anti-refmd-");
  try {
    adapter.install({ packageDir: PKG_DIR, scope: "project", projectRoot: temp.dir });
    const refMd = path.join(temp.dir, ".agent", "skills", "refactoring", "resources", "REFERENCE.md");
    // REFERENCE.md may or may not exist in the package
    if (fs.existsSync(path.join(PKG_DIR, "REFERENCE.md"))) {
      assert.ok(fs.existsSync(refMd), "should copy REFERENCE.md");
    }
  } finally {
    temp.cleanup();
  }
});

test("Antigravity: uninstall removes entire skill directory", () => {
  const adapter = new AntigravityAdapter();
  const temp = createTempDir("anti-uninstall-");
  try {
    adapter.install({ packageDir: PKG_DIR, scope: "project", projectRoot: temp.dir });
    const skillDir = path.join(temp.dir, ".agent", "skills", "refactoring");
    assert.ok(fs.existsSync(skillDir), "should exist after install");

    adapter.uninstall({ scope: "project", projectRoot: temp.dir });
    assert.ok(!fs.existsSync(skillDir), "should remove entire skill dir");
  } finally {
    temp.cleanup();
  }
});

test("Antigravity: uninstall is no-op if not installed", () => {
  const adapter = new AntigravityAdapter();
  const temp = createTempDir("anti-noop-");
  try {
    const result = adapter.uninstall({ scope: "project", projectRoot: temp.dir });
    assert.ok(result.success, "should succeed");
    assert.ok(result.message.includes("nothing to remove"), "should indicate nothing to remove");
  } finally {
    temp.cleanup();
  }
});

// === OpenCode Adapter ===

test("OpenCode: name and displayName", () => {
  const adapter = new OpenCodeAdapter();
  assert.strictEqual(adapter.name, "opencode");
  assert.strictEqual(adapter.displayName, "OpenCode");
});

test("OpenCode: rejects global scope", () => {
  const adapter = new OpenCodeAdapter();
  const result = adapter.install({ packageDir: PKG_DIR, scope: "global", projectRoot: "/tmp", dryRun: true });
  assert.strictEqual(result.success, false);
  assert.ok(result.message.includes("global"));
});

test("OpenCode: dry-run lists AGENTS.md and .opencode files", () => {
  const adapter = new OpenCodeAdapter();
  const temp = createTempDir("oc-dry-");
  try {
    const result = adapter.install({ packageDir: PKG_DIR, scope: "project", projectRoot: temp.dir, dryRun: true });
    assert.strictEqual(result.success, true);
    assert.ok(result.files.some((f) => f.includes("AGENTS.md")), "should list AGENTS.md");
    assert.ok(result.files.some((f) => f.includes(".opencode/")), "should list .opencode/ files");
  } finally {
    temp.cleanup();
  }
});

test("OpenCode: install creates AGENTS.md with OpenCode-specific markers", () => {
  const adapter = new OpenCodeAdapter();
  const temp = createTempDir("oc-install-");
  try {
    adapter.install({ packageDir: PKG_DIR, scope: "project", projectRoot: temp.dir });
    const agentsMd = path.join(temp.dir, "AGENTS.md");
    assert.ok(fs.existsSync(agentsMd), "should create AGENTS.md");
    const content = fs.readFileSync(agentsMd, "utf-8");
    assert.ok(content.includes("refactoring-kit-opencode:start"), "should have OpenCode start marker");
    assert.ok(content.includes("refactoring-kit-opencode:end"), "should have OpenCode end marker");
    assert.ok(content.includes("OpenCode"), "should mention OpenCode in content");
    // Should NOT have standard markers
    assert.ok(!content.includes(MARKER_START), "should not have standard markers");
  } finally {
    temp.cleanup();
  }
});

test("OpenCode: install creates command docs in .opencode/refactoring/commands/", () => {
  const adapter = new OpenCodeAdapter();
  const temp = createTempDir("oc-cmds-");
  try {
    adapter.install({ packageDir: PKG_DIR, scope: "project", projectRoot: temp.dir });
    const cmdDir = path.join(temp.dir, ".opencode", "refactoring", "commands");
    assert.ok(fs.existsSync(cmdDir), "should create commands dir");
    assert.ok(fs.existsSync(path.join(cmdDir, "review.md")), "should have review.md");
    assert.ok(fs.existsSync(path.join(cmdDir, "fast.md")), "should have fast.md");
  } finally {
    temp.cleanup();
  }
});

test("OpenCode: appends to existing AGENTS.md with .bak backup", () => {
  const adapter = new OpenCodeAdapter();
  const temp = createTempDir("oc-append-");
  try {
    const agentsMd = path.join(temp.dir, "AGENTS.md");
    fs.writeFileSync(agentsMd, "# Project Agents\n\nExisting config.\n");

    adapter.install({ packageDir: PKG_DIR, scope: "project", projectRoot: temp.dir });

    const content = fs.readFileSync(agentsMd, "utf-8");
    assert.ok(content.includes("Project Agents"), "should keep existing content");
    assert.ok(content.includes("refactoring-kit-opencode:start"), "should add OpenCode section");
    assert.ok(fs.existsSync(agentsMd + ".bak"), "should create .bak backup");
  } finally {
    temp.cleanup();
  }
});

test("OpenCode: coexists with Codex in same AGENTS.md", () => {
  const CodexCliAdapter = require("../adapters/codex-cli");
  const codex = new CodexCliAdapter();
  const opencode = new OpenCodeAdapter();
  const temp = createTempDir("coexist-");
  try {
    // Install both adapters
    codex.install({ packageDir: PKG_DIR, scope: "project", projectRoot: temp.dir });
    opencode.install({ packageDir: PKG_DIR, scope: "project", projectRoot: temp.dir });

    const agentsMd = path.join(temp.dir, "AGENTS.md");
    const content = fs.readFileSync(agentsMd, "utf-8");

    // Both sections should be present
    assert.ok(content.includes(MARKER_START), "should have Codex start marker");
    assert.ok(content.includes(MARKER_END), "should have Codex end marker");
    assert.ok(content.includes("refactoring-kit-opencode:start"), "should have OpenCode start marker");
    assert.ok(content.includes("refactoring-kit-opencode:end"), "should have OpenCode end marker");

    // Uninstalling Codex should not affect OpenCode section
    codex.uninstall({ scope: "project", projectRoot: temp.dir });
    const afterCodexRemoval = fs.readFileSync(agentsMd, "utf-8");
    assert.ok(!afterCodexRemoval.includes(MARKER_START), "should remove Codex markers");
    assert.ok(afterCodexRemoval.includes("refactoring-kit-opencode:start"), "should keep OpenCode section");
  } finally {
    temp.cleanup();
  }
});

test("OpenCode: uninstall removes section from AGENTS.md and .opencode dir", () => {
  const adapter = new OpenCodeAdapter();
  const temp = createTempDir("oc-uninstall-");
  try {
    const agentsMd = path.join(temp.dir, "AGENTS.md");
    fs.writeFileSync(agentsMd, "# Project Agents\n\nKeep this.\n");

    adapter.install({ packageDir: PKG_DIR, scope: "project", projectRoot: temp.dir });
    adapter.uninstall({ scope: "project", projectRoot: temp.dir });

    // AGENTS.md should keep user content
    const content = fs.readFileSync(agentsMd, "utf-8");
    assert.ok(!content.includes("refactoring-kit-opencode"), "should remove OpenCode markers");
    assert.ok(content.includes("Project Agents"), "should keep user content");

    // .opencode dir should be removed
    assert.ok(!fs.existsSync(path.join(temp.dir, ".opencode", "refactoring")), "should remove .opencode/refactoring/");
  } finally {
    temp.cleanup();
  }
});

test("OpenCode: uninstall removes AGENTS.md if only our content", () => {
  const adapter = new OpenCodeAdapter();
  const temp = createTempDir("oc-rmfile-");
  try {
    adapter.install({ packageDir: PKG_DIR, scope: "project", projectRoot: temp.dir });
    adapter.uninstall({ scope: "project", projectRoot: temp.dir });
    assert.ok(!fs.existsSync(path.join(temp.dir, "AGENTS.md")), "should remove AGENTS.md when empty");
  } finally {
    temp.cleanup();
  }
});

test("OpenCode: handles damaged markers gracefully", () => {
  const adapter = new OpenCodeAdapter();
  const temp = createTempDir("oc-damaged-");
  try {
    const agentsMd = path.join(temp.dir, "AGENTS.md");
    fs.writeFileSync(agentsMd, "# File\n\n<!-- refactoring-kit-opencode:start -->\nonly start marker");

    const result = adapter.install({ packageDir: PKG_DIR, scope: "project", projectRoot: temp.dir });
    // The _appendToAgentsMd should detect damaged markers and skip
    const content = fs.readFileSync(agentsMd, "utf-8");
    // Original content should be preserved (not corrupted)
    assert.ok(content.includes("only start marker"), "should not corrupt file on damaged markers");
  } finally {
    temp.cleanup();
  }
});

// === validateMarkers utility ===

test("validateMarkers: both markers present", () => {
  const content = `${MARKER_START}\ncontent\n${MARKER_END}`;
  const result = validateMarkers(content, MARKER_START, MARKER_END);
  assert.strictEqual(result.valid, true);
  assert.strictEqual(result.hasMarkers, true);
});

test("validateMarkers: no markers present", () => {
  const result = validateMarkers("plain content", MARKER_START, MARKER_END);
  assert.strictEqual(result.valid, true);
  assert.strictEqual(result.hasMarkers, false);
});

test("validateMarkers: only start marker — invalid", () => {
  const content = `${MARKER_START}\ncontent`;
  const result = validateMarkers(content, MARKER_START, MARKER_END);
  assert.strictEqual(result.valid, false);
  assert.strictEqual(result.found, "start");
  assert.strictEqual(result.missing, "end");
});

test("validateMarkers: custom markers (OpenCode)", () => {
  const content = "<!-- refactoring-kit-opencode:start -->\ncontent\n<!-- refactoring-kit-opencode:end -->";
  const result = validateMarkers(content, "<!-- refactoring-kit-opencode:start -->", "<!-- refactoring-kit-opencode:end -->");
  assert.strictEqual(result.valid, true);
  assert.strictEqual(result.hasMarkers, true);
});

// === Roo Code: schema validation ===

test("Roo Code: handles non-object .roomodes gracefully", () => {
  const adapter = new RooCodeAdapter();
  const temp = createTempDir("roo-badschema-");
  try {
    // Write a .roomodes with a JSON array instead of object
    fs.writeFileSync(path.join(temp.dir, ".roomodes"), '"just a string"');
    adapter.install({ packageDir: PKG_DIR, scope: "project", projectRoot: temp.dir });

    const data = JSON.parse(fs.readFileSync(path.join(temp.dir, ".roomodes"), "utf-8"));
    assert.ok(Array.isArray(data.customModes), "should have valid customModes array");
    assert.strictEqual(data.customModes.length, 6, "should have our 6 modes");
  } finally {
    temp.cleanup();
  }
});

// === CLI Integration ===

test("CLI: tools command shows all 9 adapters", () => {
  const { execFileSync } = require("child_process");
  const cliPath = path.resolve(__dirname, "..", "cli.js");
  const output = execFileSync(process.execPath, [cliPath, "tools"], { encoding: "utf-8" });
  assert.ok(output.includes("copilot"), "should list copilot");
  assert.ok(output.includes("roo-code"), "should list roo-code");
  assert.ok(output.includes("antigravity"), "should list antigravity");
  assert.ok(output.includes("opencode"), "should list opencode");
  assert.ok(output.includes("Supported tools (9)"), "should show count 9");
});

// === Install/Uninstall Cycle ===

test("Full cycle: install then uninstall for all 4 Tier 2 adapters", () => {
  const adapters = [
    new CopilotAdapter(),
    new RooCodeAdapter(),
    new AntigravityAdapter(),
    new OpenCodeAdapter(),
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
