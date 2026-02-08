#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const BaseAdapter = require("./base-adapter");
const {
  stripClaudeFrontmatter,
  stripClaudeDirectives,
} = require("./content-utils");

const SKILL_NAME = "refactoring";

/** Command files to convert to Cursor rules */
const COMMAND_RULES = [
  { src: "commands/refactor.md", dest: "refactoring-router.mdc", desc: "Intelligent refactoring router — detects best approach based on intent" },
  { src: "commands/refactor/review.md", dest: "refactoring-review.mdc", desc: "Read-only code analysis — scan for smells and generate report" },
  { src: "commands/refactor/fast.md", dest: "refactoring-fast.mdc", desc: "Autonomous refactoring — review, apply, verify tests" },
  { src: "commands/refactor/plan.md", dest: "refactoring-plan.mdc", desc: "Collaborative refactoring plan creation with phases" },
  { src: "commands/refactor/implement.md", dest: "refactoring-implement.mdc", desc: "Execute refactoring plan phase by phase" },
  { src: "commands/refactor/architecture.md", dest: "refactoring-architecture.mdc", desc: "Deep architectural analysis — detect style, scan for arch smells" },
];

/**
 * Cursor adapter — installs skill as .mdc rules in .cursor/rules/.
 * Only refactoring-skill.mdc gets alwaysApply:true (per validation decision).
 * Command rules use alwaysApply:false with description-based matching.
 */
class CursorAdapter extends BaseAdapter {
  get name() {
    return "cursor";
  }

  get displayName() {
    return "Cursor";
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
    if (scope === "global") {
      return null; // Cursor doesn't support global rules
    }
    return path.join(projectRoot, ".cursor", "rules");
  }

  /**
   * Convert markdown to MDC format with YAML frontmatter.
   */
  _toMDC(content, { description, globs = [], alwaysApply = false }) {
    const lines = ["---", `description: "${description}"`];
    if (globs.length) lines.push(`globs: ${JSON.stringify(globs)}`);
    lines.push(`alwaysApply: ${alwaysApply}`, "---");
    return lines.join("\n") + "\n\n" + content;
  }

  /**
   * Adapt Claude command content for Cursor context.
   */
  _adaptContent(md) {
    let content = stripClaudeFrontmatter(md);
    content = stripClaudeDirectives(content);
    content = content.replace(/\$ARGUMENTS/g, "the user's request");
    return content.trim();
  }

  install({ packageDir, scope, projectRoot, dryRun = false }) {
    if (scope === "global") {
      return {
        success: false,
        files: [],
        message: "Cursor does not support global rules. Use --tool=cursor without --global.",
      };
    }

    const rulesDir = this.getInstallPath(scope, projectRoot);
    const refsDir = path.join(rulesDir, "refactoring-references");
    const files = [];

    // 1. Skill rule (alwaysApply: true)
    const skillContent = this.readCanonical(packageDir, "SKILL.md");
    if (skillContent) {
      const skillPath = path.join(rulesDir, "refactoring-skill.mdc");
      files.push(skillPath);
      if (!dryRun) {
        const adapted = this._adaptContent(skillContent);
        const mdc = this._toMDC(adapted, {
          description: "Systematic code refactoring — smell detection, safe transformation, test verification",
          alwaysApply: true,
        });
        this.writeFile(skillPath, mdc);
      }
    }

    // 2. Command rules (alwaysApply: false — description-matched by AI)
    for (const cmd of COMMAND_RULES) {
      const content = this.readCanonical(packageDir, cmd.src);
      if (!content) continue;
      const destPath = path.join(rulesDir, cmd.dest);
      files.push(destPath);
      if (!dryRun) {
        const adapted = this._adaptContent(content);
        const mdc = this._toMDC(adapted, {
          description: cmd.desc,
          alwaysApply: false,
        });
        this.writeFile(destPath, mdc);
      }
    }

    // 3. Reference files as .mdc (alwaysApply: false)
    const refsSrc = path.join(packageDir, "references");
    if (fs.existsSync(refsSrc)) {
      this._convertReferences(refsSrc, refsDir, files, dryRun);
    }

    // 4. Marker
    if (!dryRun) {
      this.writeMarker(rulesDir);
    }
    files.push(path.join(rulesDir, this.markerFile));

    return {
      success: true,
      files,
      message: dryRun
        ? `Would install to ${rulesDir}`
        : `Installed ${files.length} rules to .cursor/rules/`,
    };
  }

  /**
   * Recursively convert reference .md files to .mdc format.
   */
  _convertReferences(srcDir, destDir, files, dryRun, relPath = "") {
    for (const item of fs.readdirSync(srcDir)) {
      const srcPath = path.join(srcDir, item);
      const rel = relPath ? `${relPath}/${item}` : item;

      if (fs.statSync(srcPath).isDirectory()) {
        this._convertReferences(srcPath, destDir, files, dryRun, rel);
        continue;
      }

      if (!item.endsWith(".md")) continue;

      const mdcName = item.replace(/\.md$/, ".mdc");
      const destPath = path.join(destDir, relPath, mdcName);
      files.push(destPath);

      if (!dryRun) {
        const content = fs.readFileSync(srcPath, "utf-8");
        const desc = `Refactoring reference: ${item.replace(/\.md$/, "").replace(/-/g, " ")}`;
        const mdc = this._toMDC(content, { description: desc, alwaysApply: false });
        this.writeFile(destPath, mdc);
      }
    }
  }

  uninstall({ scope, projectRoot, dryRun = false }) {
    if (scope === "global") {
      return { success: true, message: "Cursor does not use global rules — nothing to remove" };
    }

    const rulesDir = this.getInstallPath(scope, projectRoot);
    if (!this.hasMarker(rulesDir)) {
      return { success: true, message: "Not installed for Cursor — nothing to remove" };
    }

    if (dryRun) {
      return { success: true, message: `Would remove Cursor rules from ${rulesDir}` };
    }

    // Remove our files: skill rule, command rules, references dir, marker
    const toRemove = [
      path.join(rulesDir, "refactoring-skill.mdc"),
      ...COMMAND_RULES.map((c) => path.join(rulesDir, c.dest)),
      path.join(rulesDir, "refactoring-references"),
      path.join(rulesDir, this.markerFile),
    ];

    for (const p of toRemove) {
      if (!fs.existsSync(p)) continue;
      if (fs.statSync(p).isDirectory()) {
        fs.rmSync(p, { recursive: true, force: true });
      } else {
        fs.unlinkSync(p);
      }
    }

    console.log(`Removed refactoring rules from .cursor/rules/`);
    return { success: true, message: "Uninstalled from Cursor" };
  }
}

module.exports = CursorAdapter;
