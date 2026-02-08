#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const BaseAdapter = require("./base-adapter");
const {
  stripClaudeFrontmatter,
  stripClaudeDirectives,
  appendToExistingFile,
} = require("./content-utils");

/** Command files to convert to .instructions.md */
const COMMAND_FILES = [
  { src: "commands/refactor/review.md", dest: "refactoring-review.instructions.md", desc: "Read-only code analysis" },
  { src: "commands/refactor/fast.md", dest: "refactoring-fast.instructions.md", desc: "Autonomous refactoring" },
  { src: "commands/refactor/plan.md", dest: "refactoring-plan.instructions.md", desc: "Collaborative refactoring planning" },
  { src: "commands/refactor/implement.md", dest: "refactoring-implement.instructions.md", desc: "Execute refactoring plan" },
  { src: "commands/refactor/architecture.md", dest: "refactoring-architecture.instructions.md", desc: "Architectural analysis" },
];

/**
 * GitHub Copilot adapter — installs to .github/ with copilot-instructions.md
 * and path-specific .instructions.md files.
 * Uses section markers + .bak backup for copilot-instructions.md.
 */
class CopilotAdapter extends BaseAdapter {
  get name() {
    return "copilot";
  }

  get displayName() {
    return "GitHub Copilot";
  }

  get capabilities() {
    return {
      slashCommands: false,
      workflows: false,
      separateReferences: true,
      fileGlobs: true,
    };
  }

  getInstallPath(scope, projectRoot) {
    if (scope === "global") return null;
    return path.join(projectRoot, ".github");
  }

  /**
   * Generate copilot-instructions.md section content.
   */
  _generateInstructionsSection(skillContent) {
    let adapted = stripClaudeFrontmatter(skillContent);
    adapted = stripClaudeDirectives(adapted);

    return [
      "## Refactoring Skill",
      "",
      adapted.trim(),
      "",
      "### Workflow Instructions",
      "",
      "When user mentions these keywords, load the corresponding instruction file:",
      "- \"review\", \"analyze\", \"audit\" → `.github/instructions/refactoring-review.instructions.md`",
      "- \"refactor fast\", \"quick refactor\" → `.github/instructions/refactoring-fast.instructions.md`",
      "- \"refactor plan\" → `.github/instructions/refactoring-plan.instructions.md`",
      "- \"implement plan\" → `.github/instructions/refactoring-implement.instructions.md`",
      "- \"architecture\" → `.github/instructions/refactoring-architecture.instructions.md`",
      "",
      "Reference files in `.github/instructions/refactoring-references/` for code smell catalogs and metrics.",
    ].join("\n");
  }

  install({ packageDir, scope, projectRoot, dryRun = false }) {
    if (scope === "global") {
      return {
        success: false,
        files: [],
        message: "GitHub Copilot does not support global instructions. Use --tool=copilot without --global.",
      };
    }

    const githubDir = this.getInstallPath(scope, projectRoot);
    const instrDir = path.join(githubDir, "instructions");
    const refsDir = path.join(instrDir, "refactoring-references");
    const copilotMdPath = path.join(githubDir, "copilot-instructions.md");
    const files = [];

    // 1. copilot-instructions.md
    const skillContent = this.readCanonical(packageDir, "SKILL.md");
    if (!skillContent) {
      return { success: false, files: [], message: "SKILL.md not found in package" };
    }
    files.push(copilotMdPath);

    // 2. Command instruction files
    for (const cmd of COMMAND_FILES) {
      const content = this.readCanonical(packageDir, cmd.src);
      if (content) files.push(path.join(instrDir, cmd.dest));
    }

    // 3. Reference files
    const refsSrc = path.join(packageDir, "references");
    if (fs.existsSync(refsSrc)) {
      files.push(...this.collectFiles(refsSrc, refsDir));
    }

    // 4. Marker
    files.push(path.join(githubDir, this.markerFile));

    if (dryRun) {
      const existing = fs.existsSync(copilotMdPath);
      const msg = existing
        ? `Would install to ${githubDir} (existing copilot-instructions.md will be updated, .bak created)`
        : `Would install to ${githubDir}`;
      return { success: true, files, message: msg };
    }

    // --- Actual install ---

    // copilot-instructions.md (append/replace with .bak)
    const section = this._generateInstructionsSection(skillContent);
    const result = appendToExistingFile(copilotMdPath, section, false);
    console.log(`  ${result.message}`);

    // Command instruction files
    for (const cmd of COMMAND_FILES) {
      const content = this.readCanonical(packageDir, cmd.src);
      if (!content) continue;
      let adapted = stripClaudeFrontmatter(content);
      adapted = stripClaudeDirectives(adapted);
      adapted = adapted.replace(/\$ARGUMENTS/g, "the user's request");
      this.writeFile(path.join(instrDir, cmd.dest), adapted);
    }

    // References
    if (fs.existsSync(refsSrc)) {
      this.copyRecursive(refsSrc, refsDir);
    }

    // Marker
    this.writeMarker(githubDir);

    console.log(`Installed refactoring skill for GitHub Copilot`);
    return { success: true, files, message: `Installed to ${githubDir}` };
  }

  uninstall({ scope, projectRoot, dryRun = false }) {
    if (scope === "global") {
      return { success: true, message: "Copilot does not use global install — nothing to remove" };
    }

    const githubDir = this.getInstallPath(scope, projectRoot);
    if (!this.hasMarker(githubDir)) {
      return { success: true, message: "Not installed for Copilot — nothing to remove" };
    }

    if (dryRun) {
      return { success: true, message: `Would remove Copilot files from ${githubDir}` };
    }

    const instrDir = path.join(githubDir, "instructions");

    // Remove instruction files
    for (const cmd of COMMAND_FILES) {
      const p = path.join(instrDir, cmd.dest);
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }

    // Remove references dir
    const refsDir = path.join(instrDir, "refactoring-references");
    if (fs.existsSync(refsDir)) {
      fs.rmSync(refsDir, { recursive: true, force: true });
    }

    // Remove our section from copilot-instructions.md
    const copilotMdPath = path.join(githubDir, "copilot-instructions.md");
    if (fs.existsSync(copilotMdPath)) {
      const content = fs.readFileSync(copilotMdPath, "utf-8");
      const { escapeRegex, MARKER_START, MARKER_END } = require("./content-utils");
      if (content.includes(MARKER_START) && content.includes(MARKER_END)) {
        const regex = new RegExp(
          `\\n*${escapeRegex(MARKER_START)}[\\s\\S]*?${escapeRegex(MARKER_END)}\\n*`
        );
        const cleaned = content.replace(regex, "\n");
        if (cleaned.trim() === "") {
          fs.unlinkSync(copilotMdPath);
        } else {
          fs.writeFileSync(copilotMdPath, cleaned, "utf-8");
        }
      }
    }

    this.removeMarker(githubDir);
    console.log(`Removed refactoring skill from GitHub Copilot`);
    return { success: true, message: "Uninstalled from GitHub Copilot" };
  }
}

module.exports = CopilotAdapter;
