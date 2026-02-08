#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const BaseAdapter = require("./base-adapter");
const {
  stripClaudeFrontmatter,
  stripClaudeDirectives,
} = require("./content-utils");

/**
 * Antigravity adapter — installs to .agent/skills/refactoring/.
 * Closest to Claude Code format. Minimal adaptation needed.
 * Supports both project and global install paths.
 */
class AntigravityAdapter extends BaseAdapter {
  get name() {
    return "antigravity";
  }

  get displayName() {
    return "Antigravity";
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
      return path.join(this.getHome(), ".gemini", "antigravity", "skills", "refactoring");
    }
    return path.join(projectRoot, ".agent", "skills", "refactoring");
  }

  install({ packageDir, scope, projectRoot, dryRun = false }) {
    const skillDir = this.getInstallPath(scope, projectRoot);
    const resourcesDir = path.join(skillDir, "resources");
    const files = [];

    // 1. SKILL.md
    const skillContent = this.readCanonical(packageDir, "SKILL.md");
    if (!skillContent) {
      return { success: false, files: [], message: "SKILL.md not found in package" };
    }
    files.push(path.join(skillDir, "SKILL.md"));

    // 2. REFERENCE.md → resources/REFERENCE.md
    const refContent = this.readCanonical(packageDir, "REFERENCE.md");
    if (refContent) {
      files.push(path.join(resourcesDir, "REFERENCE.md"));
    }

    // 3. References → resources/references/
    const refsSrc = path.join(packageDir, "references");
    if (fs.existsSync(refsSrc)) {
      files.push(...this.collectFiles(refsSrc, path.join(resourcesDir, "references")));
    }

    // 4. Marker
    files.push(path.join(skillDir, this.markerFile));

    if (dryRun) {
      return { success: true, files, message: `Would install to ${skillDir}` };
    }

    // --- Actual install ---

    // SKILL.md (adapted)
    let adapted = stripClaudeFrontmatter(skillContent);
    adapted = stripClaudeDirectives(adapted);
    this.writeFile(path.join(skillDir, "SKILL.md"), adapted);

    // REFERENCE.md
    if (refContent) {
      this.writeFile(path.join(resourcesDir, "REFERENCE.md"), refContent);
    }

    // References
    if (fs.existsSync(refsSrc)) {
      this.copyRecursive(refsSrc, path.join(resourcesDir, "references"));
    }

    // Marker
    this.writeMarker(skillDir);

    console.log(`Installed refactoring skill for Antigravity`);
    return { success: true, files, message: `Installed to ${skillDir}` };
  }

  uninstall({ scope, projectRoot, dryRun = false }) {
    const skillDir = this.getInstallPath(scope, projectRoot);

    if (!this.hasMarker(skillDir)) {
      return { success: true, message: "Not installed for Antigravity — nothing to remove" };
    }

    if (dryRun) {
      return { success: true, message: `Would remove Antigravity files from ${skillDir}` };
    }

    // Remove entire skill directory
    if (fs.existsSync(skillDir)) {
      fs.rmSync(skillDir, { recursive: true, force: true });
    }

    console.log(`Removed refactoring skill from Antigravity`);
    return { success: true, message: "Uninstalled from Antigravity" };
  }
}

module.exports = AntigravityAdapter;
