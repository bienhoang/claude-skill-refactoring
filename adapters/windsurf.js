#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const BaseAdapter = require("./base-adapter");
const {
  stripClaudeFrontmatter,
  stripClaudeDirectives,
  truncateToLimit,
} = require("./content-utils");

const WINDSURF_WORKFLOW_LIMIT = 12000;

/** Command files to convert to Windsurf workflows */
const WORKFLOW_MAP = [
  { src: "commands/refactor.md", dest: "refactor.md", desc: "Intelligent refactoring router" },
  { src: "commands/refactor/review.md", dest: "refactor-review.md", desc: "Read-only code analysis" },
  { src: "commands/refactor/fast.md", dest: "refactor-fast.md", desc: "Autonomous refactoring" },
  { src: "commands/refactor/plan.md", dest: "refactor-plan.md", desc: "Collaborative refactoring planning" },
  { src: "commands/refactor/implement.md", dest: "refactor-implement.md", desc: "Execute refactoring plan" },
  { src: "commands/refactor/architecture.md", dest: "refactor-architecture.md", desc: "Architectural analysis" },
];

/** Critical references to inline as rules (AI loads based on description) */
const REFERENCE_RULES = [
  { src: "references/code-smells.md", dest: "refactoring-code-smells.md", desc: "25+ code smell catalog for refactoring analysis" },
  { src: "references/metrics.md", dest: "refactoring-metrics.md", desc: "Quantitative thresholds for code quality scoring" },
  { src: "references/refactoring-methods.md", dest: "refactoring-methods.md", desc: "30+ refactoring techniques with step-by-step mechanics" },
  { src: "references/security-smells.md", dest: "refactoring-security.md", desc: "Security smell patterns and OWASP top 10 detection" },
  { src: "references/prioritization.md", dest: "refactoring-prioritization.md", desc: "ROI scoring and fix/defer/accept decision tree" },
];

/**
 * Windsurf adapter — installs rules (always-on context) and workflows (slash commands).
 * Workflows have a 12,000 char limit per file.
 */
class WindsurfAdapter extends BaseAdapter {
  get name() {
    return "windsurf";
  }

  get displayName() {
    return "Windsurf";
  }

  get capabilities() {
    return {
      slashCommands: false,
      workflows: true,
      separateReferences: false,
      fileGlobs: true,
    };
  }

  getInstallPath(scope, projectRoot) {
    if (scope === "global") return null;
    return path.join(projectRoot, ".windsurf");
  }

  /**
   * Convert Claude command to Windsurf workflow format.
   */
  _toWorkflow(md, description) {
    let content = stripClaudeFrontmatter(md);
    content = stripClaudeDirectives(content);
    content = content.replace(/\$ARGUMENTS/g, "the user's request");

    let result = `---\ndescription: ${description}\n---\n\n${content.trim()}`;
    return truncateToLimit(result, WINDSURF_WORKFLOW_LIMIT);
  }

  install({ packageDir, scope, projectRoot, dryRun = false }) {
    if (scope === "global") {
      return {
        success: false,
        files: [],
        message: "Windsurf does not support global rules. Use --tool=windsurf without --global.",
      };
    }

    const baseDir = this.getInstallPath(scope, projectRoot);
    const rulesDir = path.join(baseDir, "rules");
    const workflowsDir = path.join(baseDir, "workflows");
    const files = [];

    // 1. Core skill as rule
    const skillContent = this.readCanonical(packageDir, "SKILL.md");
    if (skillContent) {
      const skillPath = path.join(rulesDir, "refactoring-skill.md");
      files.push(skillPath);
      if (!dryRun) {
        let adapted = stripClaudeFrontmatter(skillContent);
        adapted = stripClaudeDirectives(adapted);
        this.writeFile(skillPath, adapted.trim());
      }
    }

    // 2. Reference files as rules
    for (const ref of REFERENCE_RULES) {
      const content = this.readCanonical(packageDir, ref.src);
      if (!content) continue;
      const destPath = path.join(rulesDir, ref.dest);
      files.push(destPath);
      if (!dryRun) {
        this.writeFile(destPath, content);
      }
    }

    // 3. Command workflows
    for (const wf of WORKFLOW_MAP) {
      const content = this.readCanonical(packageDir, wf.src);
      if (!content) continue;
      const destPath = path.join(workflowsDir, wf.dest);
      files.push(destPath);
      if (!dryRun) {
        const workflow = this._toWorkflow(content, wf.desc);
        this.writeFile(destPath, workflow);
      }
    }

    // 4. Marker
    if (!dryRun) {
      this.writeMarker(baseDir);
    }
    files.push(path.join(baseDir, this.markerFile));

    return {
      success: true,
      files,
      message: dryRun
        ? `Would install to ${baseDir}`
        : `Installed ${files.length} files to .windsurf/`,
    };
  }

  uninstall({ scope, projectRoot, dryRun = false }) {
    if (scope === "global") {
      return { success: true, message: "Windsurf does not use global rules — nothing to remove" };
    }

    const baseDir = this.getInstallPath(scope, projectRoot);
    if (!this.hasMarker(baseDir)) {
      return { success: true, message: "Not installed for Windsurf — nothing to remove" };
    }

    if (dryRun) {
      return { success: true, message: `Would remove Windsurf files from ${baseDir}` };
    }

    // Remove rules
    const rulesDir = path.join(baseDir, "rules");
    const toRemoveRules = [
      path.join(rulesDir, "refactoring-skill.md"),
      ...REFERENCE_RULES.map((r) => path.join(rulesDir, r.dest)),
    ];
    for (const p of toRemoveRules) {
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }

    // Remove workflows
    const workflowsDir = path.join(baseDir, "workflows");
    for (const wf of WORKFLOW_MAP) {
      const p = path.join(workflowsDir, wf.dest);
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }

    // Remove marker
    this.removeMarker(baseDir);

    console.log(`Removed refactoring files from .windsurf/`);
    return { success: true, message: "Uninstalled from Windsurf" };
  }
}

module.exports = WindsurfAdapter;
