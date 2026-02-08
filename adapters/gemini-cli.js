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

/** Command files to copy as documentation */
const COMMAND_FILES = [
  "commands/refactor/review.md",
  "commands/refactor/fast.md",
  "commands/refactor/plan.md",
  "commands/refactor/implement.md",
  "commands/refactor/architecture.md",
];

/**
 * Gemini CLI adapter — installs via GEMINI.md with @import references.
 * Uses section markers for safe append to existing GEMINI.md.
 * Creates .bak backup before modifying existing files.
 */
class GeminiCliAdapter extends BaseAdapter {
  get name() {
    return "gemini-cli";
  }

  get displayName() {
    return "Gemini CLI";
  }

  get capabilities() {
    return {
      slashCommands: false,
      workflows: false,
      separateReferences: true,
      fileGlobs: false,
    };
  }

  getInstallPath(scope, projectRoot) {
    if (scope === "global") {
      return path.join(this.getHome(), ".gemini");
    }
    return projectRoot;
  }

  /**
   * Generate GEMINI.md section content with @import directives.
   */
  _generateGeminiSection(skillContent, scope) {
    const geminiDir = scope === "global" ? "~/.gemini" : ".gemini";
    const refBase = `${geminiDir}/${SKILL_NAME}`;

    let adapted = stripClaudeFrontmatter(skillContent);
    adapted = stripClaudeDirectives(adapted);

    const imports = [
      `@${refBase}/reference.md`,
      `@${refBase}/references/code-smells.md`,
      `@${refBase}/references/metrics.md`,
      `@${refBase}/references/refactoring-methods.md`,
      `@${refBase}/references/security-smells.md`,
      `@${refBase}/references/prioritization.md`,
    ];

    return [
      "## Refactoring Skill",
      "",
      adapted.trim(),
      "",
      "### Reference Files",
      "",
      "Load these references as needed:",
      ...imports.map((i) => `- ${i}`),
      "",
      "### Available Commands",
      "",
      `Read \`${refBase}/commands/\` for detailed workflows:`,
      "- review — Read-only code analysis",
      "- fast — Autonomous refactoring",
      "- plan — Collaborative planning",
      "- implement — Execute refactoring plan",
      "- architecture — Architectural analysis",
    ].join("\n");
  }

  install({ packageDir, scope, projectRoot, dryRun = false }) {
    const installPath = this.getInstallPath(scope, projectRoot);
    const geminiDir = scope === "global"
      ? path.join(this.getHome(), ".gemini", SKILL_NAME)
      : path.join(projectRoot, ".gemini", SKILL_NAME);
    const geminiMdPath = path.join(installPath, "GEMINI.md");
    const files = [];

    // 1. GEMINI.md section
    const skillContent = this.readCanonical(packageDir, "SKILL.md");
    if (!skillContent) {
      return { success: false, files: [], message: "SKILL.md not found in package" };
    }
    files.push(geminiMdPath);

    // 2. REFERENCE.md
    const refContent = this.readCanonical(packageDir, "REFERENCE.md");
    if (refContent) {
      files.push(path.join(geminiDir, "reference.md"));
    }

    // 3. Reference files
    const refsSrc = path.join(packageDir, "references");
    if (fs.existsSync(refsSrc)) {
      files.push(...this.collectFiles(refsSrc, path.join(geminiDir, "references")));
    }

    // 4. Command docs
    for (const cmd of COMMAND_FILES) {
      const content = this.readCanonical(packageDir, cmd);
      if (content) {
        const name = path.basename(cmd);
        files.push(path.join(geminiDir, "commands", name));
      }
    }

    // 5. Marker
    files.push(path.join(installPath, this.markerFile));

    if (dryRun) {
      const existingGemini = fs.existsSync(geminiMdPath);
      const msg = existingGemini
        ? `Would install to ${installPath} (existing GEMINI.md will be updated, .bak created)`
        : `Would install to ${installPath}`;
      return { success: true, files, message: msg };
    }

    // --- Actual install ---

    // GEMINI.md section (append/replace with .bak)
    const section = this._generateGeminiSection(skillContent, scope);
    const result = appendToExistingFile(geminiMdPath, section, false);
    console.log(`  ${result.message}`);

    // REFERENCE.md
    if (refContent) {
      this.writeFile(path.join(geminiDir, "reference.md"), refContent);
    }

    // References
    if (fs.existsSync(refsSrc)) {
      this.copyRecursive(refsSrc, path.join(geminiDir, "references"));
    }

    // Commands
    for (const cmd of COMMAND_FILES) {
      const content = this.readCanonical(packageDir, cmd);
      if (!content) continue;
      let adapted = stripClaudeFrontmatter(content);
      adapted = stripClaudeDirectives(adapted);
      const name = path.basename(cmd);
      this.writeFile(path.join(geminiDir, "commands", name), adapted);
    }

    // Marker
    this.writeMarker(installPath);

    console.log(`Installed refactoring skill for Gemini CLI`);
    return { success: true, files, message: `Installed to ${installPath}` };
  }

  uninstall({ scope, projectRoot, dryRun = false }) {
    const installPath = this.getInstallPath(scope, projectRoot);
    const geminiDir = scope === "global"
      ? path.join(this.getHome(), ".gemini", SKILL_NAME)
      : path.join(projectRoot, ".gemini", SKILL_NAME);

    if (!this.hasMarker(installPath)) {
      return { success: true, message: "Not installed for Gemini CLI — nothing to remove" };
    }

    if (dryRun) {
      return { success: true, message: `Would remove Gemini CLI files from ${installPath}` };
    }

    // Remove .gemini/refactoring/ directory
    if (fs.existsSync(geminiDir)) {
      fs.rmSync(geminiDir, { recursive: true, force: true });
    }

    // Remove our section from GEMINI.md (but don't delete the file)
    const geminiMdPath = path.join(installPath, "GEMINI.md");
    if (fs.existsSync(geminiMdPath)) {
      const content = fs.readFileSync(geminiMdPath, "utf-8");
      if (content.includes(MARKER_START) && content.includes(MARKER_END)) {
        const regex = new RegExp(
          `\\n*${escapeRegex(MARKER_START)}[\\s\\S]*?${escapeRegex(MARKER_END)}\\n*`
        );
        const cleaned = content.replace(regex, "\n");
        if (cleaned.trim() === "") {
          fs.unlinkSync(geminiMdPath);
        } else {
          fs.writeFileSync(geminiMdPath, cleaned, "utf-8");
        }
      }
    }

    // Remove marker
    this.removeMarker(installPath);

    console.log(`Removed refactoring skill from Gemini CLI`);
    return { success: true, message: "Uninstalled from Gemini CLI" };
  }
}

module.exports = GeminiCliAdapter;
