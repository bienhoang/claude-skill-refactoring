#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const BaseAdapter = require("./base-adapter");
const {
  stripClaudeFrontmatter,
  stripClaudeDirectives,
  appendToExistingFile,
  escapeRegex,
  MARKER_START,
  MARKER_END,
} = require("./content-utils");

const SKILL_NAME = "refactoring";

/** Command files to copy and their $skill invocation names */
const COMMAND_FILES = [
  { src: "commands/refactor/review.md", name: "review", skill: "$refactor-review" },
  { src: "commands/refactor/fast.md", name: "fast", skill: "$refactor-fast" },
  { src: "commands/refactor/plan.md", name: "plan", skill: "$refactor-plan" },
  { src: "commands/refactor/implement.md", name: "implement", skill: "$refactor-implement" },
  { src: "commands/refactor/architecture.md", name: "architecture", skill: "$refactor-architecture" },
];

/**
 * Codex CLI adapter — installs via AGENTS.md with $skill-name invocation.
 * Uses section markers for safe append. Creates .bak backup before modify.
 */
class CodexCliAdapter extends BaseAdapter {
  get name() {
    return "codex-cli";
  }

  get displayName() {
    return "Codex CLI";
  }

  get capabilities() {
    return {
      slashCommands: true,
      workflows: false,
      separateReferences: true,
      fileGlobs: false,
    };
  }

  getInstallPath(scope, projectRoot) {
    if (scope === "global") return null;
    return projectRoot;
  }

  /**
   * Generate AGENTS.md section with $skill invocations.
   */
  _generateAgentsSection(skillContent) {
    let adapted = stripClaudeFrontmatter(skillContent);
    adapted = stripClaudeDirectives(adapted);

    const skillList = COMMAND_FILES
      .map((c) => `- \`${c.skill}\` — ${c.name} workflow`)
      .join("\n");

    return [
      "## Refactoring Skill",
      "",
      adapted.trim(),
      "",
      "### Available Skills",
      "",
      `- \`$refactor\` — intelligent routing (detects best approach)`,
      skillList,
      "",
      `Read \`.codex/${SKILL_NAME}/commands/{name}.md\` for detailed workflow.`,
      `Read \`.codex/${SKILL_NAME}/references/\` for code smell catalogs and metrics.`,
    ].join("\n");
  }

  install({ packageDir, scope, projectRoot, dryRun = false }) {
    if (scope === "global") {
      return {
        success: false,
        files: [],
        message: "Codex CLI does not support global installation. Use --tool=codex-cli without --global.",
      };
    }

    const installPath = this.getInstallPath(scope, projectRoot);
    const codexDir = path.join(projectRoot, ".codex", SKILL_NAME);
    const agentsMdPath = path.join(installPath, "AGENTS.md");
    const files = [];

    // 1. AGENTS.md section
    const skillContent = this.readCanonical(packageDir, "SKILL.md");
    if (!skillContent) {
      return { success: false, files: [], message: "SKILL.md not found in package" };
    }
    files.push(agentsMdPath);

    // 2. Reference files
    const refsSrc = path.join(packageDir, "references");
    if (fs.existsSync(refsSrc)) {
      files.push(...this.collectFiles(refsSrc, path.join(codexDir, "references")));
    }

    // 3. Command docs
    for (const cmd of COMMAND_FILES) {
      const content = this.readCanonical(packageDir, cmd.src);
      if (content) {
        files.push(path.join(codexDir, "commands", `${cmd.name}.md`));
      }
    }

    // 4. Marker
    files.push(path.join(installPath, this.markerFile));

    if (dryRun) {
      const existingAgents = fs.existsSync(agentsMdPath);
      const msg = existingAgents
        ? `Would install to ${installPath} (existing AGENTS.md will be updated, .bak created)`
        : `Would install to ${installPath}`;
      return { success: true, files, message: msg };
    }

    // --- Actual install ---

    // AGENTS.md section (append/replace with .bak)
    const section = this._generateAgentsSection(skillContent);
    const result = appendToExistingFile(agentsMdPath, section, false);
    console.log(`  ${result.message}`);

    // References
    if (fs.existsSync(refsSrc)) {
      this.copyRecursive(refsSrc, path.join(codexDir, "references"));
    }

    // Commands (adapted)
    for (const cmd of COMMAND_FILES) {
      const content = this.readCanonical(packageDir, cmd.src);
      if (!content) continue;
      let adapted = stripClaudeFrontmatter(content);
      adapted = stripClaudeDirectives(adapted);
      this.writeFile(path.join(codexDir, "commands", `${cmd.name}.md`), adapted);
    }

    // Marker
    this.writeMarker(installPath);

    console.log(`Installed refactoring skill for Codex CLI`);
    return { success: true, files, message: `Installed to ${installPath}` };
  }

  uninstall({ scope, projectRoot, dryRun = false }) {
    if (scope === "global") {
      return { success: true, message: "Codex CLI does not use global install — nothing to remove" };
    }

    const installPath = this.getInstallPath(scope, projectRoot);
    const codexDir = path.join(projectRoot, ".codex", SKILL_NAME);

    if (!this.hasMarker(installPath)) {
      return { success: true, message: "Not installed for Codex CLI — nothing to remove" };
    }

    if (dryRun) {
      return { success: true, message: `Would remove Codex CLI files from ${installPath}` };
    }

    // Remove .codex/refactoring/ directory
    if (fs.existsSync(codexDir)) {
      fs.rmSync(codexDir, { recursive: true, force: true });
    }

    // Remove our section from AGENTS.md
    const agentsMdPath = path.join(installPath, "AGENTS.md");
    if (fs.existsSync(agentsMdPath)) {
      const content = fs.readFileSync(agentsMdPath, "utf-8");
      if (content.includes(MARKER_START) && content.includes(MARKER_END)) {
        const regex = new RegExp(
          `\\n*${escapeRegex(MARKER_START)}[\\s\\S]*?${escapeRegex(MARKER_END)}\\n*`
        );
        const cleaned = content.replace(regex, "\n");
        if (cleaned.trim() === "") {
          fs.unlinkSync(agentsMdPath);
        } else {
          fs.writeFileSync(agentsMdPath, cleaned, "utf-8");
        }
      }
    }

    // Remove marker
    this.removeMarker(installPath);

    console.log(`Removed refactoring skill from Codex CLI`);
    return { success: true, message: "Uninstalled from Codex CLI" };
  }
}

module.exports = CodexCliAdapter;
