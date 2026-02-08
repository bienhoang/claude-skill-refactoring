#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const BaseAdapter = require("./base-adapter");
const {
  stripClaudeFrontmatter,
  stripClaudeDirectives,
} = require("./content-utils");

/** Command files to convert to CodeBuddy format */
const COMMAND_FILES = [
  { src: "commands/refactor/review.md", name: "refactor-review" },
  { src: "commands/refactor/fast.md", name: "refactor-fast" },
  { src: "commands/refactor/plan.md", name: "refactor-plan" },
  { src: "commands/refactor/implement.md", name: "refactor-implement" },
  { src: "commands/refactor/architecture.md", name: "refactor-architecture" },
];

/**
 * CodeBuddy adapter — installs to .codebuddy/commands/ as markdown command files.
 * Uses @ syntax for file references: @.codebuddy/references/code-smells.md
 * Supports both project and global (~/.codebuddy/) install paths.
 */
class CodeBuddyAdapter extends BaseAdapter {
  get name() {
    return "codebuddy";
  }

  get displayName() {
    return "CodeBuddy";
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
    if (scope === "global") {
      return path.join(this.getHome(), ".codebuddy");
    }
    return path.join(projectRoot, ".codebuddy");
  }

  /**
   * Adapt command content for CodeBuddy format.
   * Adds @ file references for reference files.
   */
  _adaptCommand(content, refPrefix) {
    let adapted = stripClaudeFrontmatter(content);
    adapted = stripClaudeDirectives(adapted);
    adapted = adapted.replace(/\$ARGUMENTS/g, "the user's request");

    // Append reference file hints using @ syntax
    adapted += "\n\n## References\n";
    adapted += `See @${refPrefix}/code-smells.md for smell catalog.\n`;
    adapted += `See @${refPrefix}/metrics.md for scoring thresholds.\n`;
    adapted += `See @${refPrefix}/refactoring-methods.md for techniques.\n`;

    return adapted;
  }

  install({ packageDir, scope, projectRoot, dryRun = false }) {
    const cbDir = this.getInstallPath(scope, projectRoot);
    const cmdDir = path.join(cbDir, "commands");
    const refsDir = path.join(cbDir, "references");
    const refPrefix = scope === "global" ? "~/.codebuddy/references" : ".codebuddy/references";
    const files = [];

    // 1. Main refactor command from SKILL.md
    const skillContent = this.readCanonical(packageDir, "SKILL.md");
    if (!skillContent) {
      return { success: false, files: [], message: "SKILL.md not found in package" };
    }
    files.push(path.join(cmdDir, "refactor.md"));

    // 2. Sub-command files
    for (const cmd of COMMAND_FILES) {
      const content = this.readCanonical(packageDir, cmd.src);
      if (content) {
        files.push(path.join(cmdDir, `${cmd.name}.md`));
      }
    }

    // 3. Reference files
    const refsSrc = path.join(packageDir, "references");
    if (fs.existsSync(refsSrc)) {
      files.push(...this.collectFiles(refsSrc, refsDir));
    }

    // 4. Marker
    files.push(path.join(cbDir, this.markerFile));

    if (dryRun) {
      return { success: true, files, message: `Would install to ${cbDir}` };
    }

    // --- Actual install ---

    // Main refactor command
    let mainAdapted = stripClaudeFrontmatter(skillContent);
    mainAdapted = stripClaudeDirectives(mainAdapted);
    mainAdapted += `\n\n## References\nSee @${refPrefix}/ for code smell catalogs and metrics.\n`;
    this.writeFile(path.join(cmdDir, "refactor.md"), mainAdapted);

    // Sub-commands
    for (const cmd of COMMAND_FILES) {
      const content = this.readCanonical(packageDir, cmd.src);
      if (!content) continue;
      this.writeFile(
        path.join(cmdDir, `${cmd.name}.md`),
        this._adaptCommand(content, refPrefix)
      );
    }

    // References
    if (fs.existsSync(refsSrc)) {
      this.copyRecursive(refsSrc, refsDir);
    }

    // Marker
    this.writeMarker(cbDir);

    console.log(`Installed refactoring skill for CodeBuddy (${COMMAND_FILES.length + 1} commands)`);
    return { success: true, files, message: `Installed to ${cbDir}` };
  }

  uninstall({ scope, projectRoot, dryRun = false }) {
    const cbDir = this.getInstallPath(scope, projectRoot);

    if (!this.hasMarker(cbDir)) {
      return { success: true, message: "Not installed for CodeBuddy — nothing to remove" };
    }

    if (dryRun) {
      return { success: true, message: `Would remove CodeBuddy files from ${cbDir}` };
    }

    // Remove commands
    const cmdDir = path.join(cbDir, "commands");
    const mainCmd = path.join(cmdDir, "refactor.md");
    if (fs.existsSync(mainCmd)) fs.unlinkSync(mainCmd);

    for (const cmd of COMMAND_FILES) {
      const p = path.join(cmdDir, `${cmd.name}.md`);
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }

    // Remove references
    const refsDir = path.join(cbDir, "references");
    if (fs.existsSync(refsDir)) {
      fs.rmSync(refsDir, { recursive: true, force: true });
    }

    // Remove marker
    this.removeMarker(cbDir);

    console.log(`Removed refactoring skill from CodeBuddy`);
    return { success: true, message: "Uninstalled from CodeBuddy" };
  }
}

module.exports = CodeBuddyAdapter;
