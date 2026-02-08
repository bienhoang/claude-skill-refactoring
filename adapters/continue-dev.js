#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const BaseAdapter = require("./base-adapter");
const {
  stripClaudeFrontmatter,
  stripClaudeDirectives,
} = require("./content-utils");

/** Command files to convert to .prompt format */
const PROMPT_FILES = [
  { src: "commands/refactor/review.md", name: "refactor-review", desc: "Read-only code analysis — scan, score, and report smells" },
  { src: "commands/refactor/fast.md", name: "refactor-fast", desc: "Autonomous refactoring — review, apply, and verify tests" },
  { src: "commands/refactor/plan.md", name: "refactor-plan", desc: "Collaborative refactoring planning with phased approach" },
  { src: "commands/refactor/implement.md", name: "refactor-implement", desc: "Execute refactoring plan phase by phase" },
  { src: "commands/refactor/architecture.md", name: "refactor-architecture", desc: "Deep architectural analysis — detect style, scan for arch-level smells" },
];

/**
 * Continue.dev adapter — installs .prompt files with Handlebars templating.
 * Each command becomes a slash-invocable .prompt file in .continue/prompts/.
 * Supports both project and global (~/.continue/) install paths.
 *
 * Note: References are not inlined into prompts. The command content already
 * includes workflow instructions that reference the original catalogs. Continue
 * prompts load project files via context, so users can manually @-include
 * reference files when needed.
 */
class ContinueDevAdapter extends BaseAdapter {
  get name() {
    return "continue-dev";
  }

  get displayName() {
    return "Continue.dev";
  }

  get capabilities() {
    return {
      slashCommands: true,
      workflows: false,
      separateReferences: false,
      fileGlobs: false,
    };
  }

  getInstallPath(scope, projectRoot) {
    if (scope === "global") {
      return path.join(this.getHome(), ".continue");
    }
    return path.join(projectRoot, ".continue");
  }

  /**
   * Build a .prompt file string from components.
   * @param {string} name - prompt name for frontmatter
   * @param {string} desc - description for frontmatter
   * @param {string} systemInstr - system message instruction line
   * @param {string} body - adapted content body
   */
  _buildPrompt(name, desc, systemInstr, body) {
    return [
      "---",
      `name: ${name}`,
      `description: ${desc}`,
      "---",
      "<s>",
      systemInstr,
      "",
      body.trim(),
      "</s>",
      "",
      "{{{ input }}}",
      "",
    ].join("\n");
  }

  /**
   * Convert a command markdown to Continue .prompt format.
   * Wraps system instructions in <s> tags, uses {{{ input }}} for user input.
   */
  _toPromptFile(name, desc, content) {
    let adapted = stripClaudeFrontmatter(content);
    adapted = stripClaudeDirectives(adapted);
    adapted = adapted.replace(/\$ARGUMENTS/g, "{{{ input }}}");

    return this._buildPrompt(name, desc, "You are a code refactoring expert. Follow the workflow below.", adapted);
  }

  /**
   * Generate main refactor.prompt from SKILL.md as a routing prompt.
   */
  _toRouterPrompt(skillContent) {
    let adapted = stripClaudeFrontmatter(skillContent);
    adapted = stripClaudeDirectives(adapted);

    return this._buildPrompt(
      "refactor",
      "Intelligent code refactoring — detects best approach for the task",
      "You are a code refactoring expert. Analyze the request and follow the appropriate workflow.",
      adapted
    );
  }

  install({ packageDir, scope, projectRoot, dryRun = false }) {
    const continueDir = this.getInstallPath(scope, projectRoot);
    const promptsDir = path.join(continueDir, "prompts");
    const files = [];

    // 1. Main refactor.prompt from SKILL.md
    const skillContent = this.readCanonical(packageDir, "SKILL.md");
    if (!skillContent) {
      return { success: false, files: [], message: "SKILL.md not found in package" };
    }
    files.push(path.join(promptsDir, "refactor.prompt"));

    // 2. Command .prompt files
    for (const cmd of PROMPT_FILES) {
      const content = this.readCanonical(packageDir, cmd.src);
      if (content) {
        files.push(path.join(promptsDir, `${cmd.name}.prompt`));
      }
    }

    // 3. Marker
    files.push(path.join(continueDir, this.markerFile));

    if (dryRun) {
      return { success: true, files, message: `Would install to ${continueDir}` };
    }

    // --- Actual install ---

    // Router prompt
    this.writeFile(path.join(promptsDir, "refactor.prompt"), this._toRouterPrompt(skillContent));

    // Command prompts
    for (const cmd of PROMPT_FILES) {
      const content = this.readCanonical(packageDir, cmd.src);
      if (!content) continue;
      this.writeFile(
        path.join(promptsDir, `${cmd.name}.prompt`),
        this._toPromptFile(cmd.name, cmd.desc, content)
      );
    }

    // Marker
    this.writeMarker(continueDir);

    console.log(`Installed refactoring skill for Continue.dev (${PROMPT_FILES.length + 1} prompts)`);
    return { success: true, files, message: `Installed to ${continueDir}` };
  }

  uninstall({ scope, projectRoot, dryRun = false }) {
    const continueDir = this.getInstallPath(scope, projectRoot);

    if (!this.hasMarker(continueDir)) {
      return { success: true, message: "Not installed for Continue.dev — nothing to remove" };
    }

    if (dryRun) {
      return { success: true, message: `Would remove Continue.dev files from ${continueDir}` };
    }

    const promptsDir = path.join(continueDir, "prompts");

    // Remove prompt files
    const promptFile = path.join(promptsDir, "refactor.prompt");
    if (fs.existsSync(promptFile)) fs.unlinkSync(promptFile);

    for (const cmd of PROMPT_FILES) {
      const p = path.join(promptsDir, `${cmd.name}.prompt`);
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }

    // Remove marker
    this.removeMarker(continueDir);

    console.log(`Removed refactoring skill from Continue.dev`);
    return { success: true, message: "Uninstalled from Continue.dev" };
  }
}

module.exports = ContinueDevAdapter;
