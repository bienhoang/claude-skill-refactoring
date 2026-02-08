#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const BaseAdapter = require("./base-adapter");
const {
  stripClaudeFrontmatter,
  stripClaudeDirectives,
} = require("./content-utils");

/** Mode definitions — each gets a rules directory and .roomodes entry */
const MODES = [
  {
    slug: "refactor",
    name: "Refactor",
    roleDefinition: "Systematic code refactoring with smell detection, safe transformation, and test verification.",
    groups: ["read", "edit", "command"],
    skillSrc: "SKILL.md",
    commandSrc: null,
    references: true,
  },
  {
    slug: "refactor-review",
    name: "Refactor: Review",
    roleDefinition: "Read-only code analysis — scan, score, and report smells.",
    groups: ["read"],
    skillSrc: null,
    commandSrc: "commands/refactor/review.md",
    references: false,
  },
  {
    slug: "refactor-fast",
    name: "Refactor: Fast",
    roleDefinition: "Autonomous refactoring — review, apply, and verify tests.",
    groups: ["read", "edit", "command"],
    skillSrc: null,
    commandSrc: "commands/refactor/fast.md",
    references: false,
  },
  {
    slug: "refactor-plan",
    name: "Refactor: Plan",
    roleDefinition: "Collaborative refactoring planning with phased approach.",
    groups: ["read", "edit"],
    skillSrc: null,
    commandSrc: "commands/refactor/plan.md",
    references: false,
  },
  {
    slug: "refactor-implement",
    name: "Refactor: Implement",
    roleDefinition: "Execute refactoring plan phase by phase.",
    groups: ["read", "edit", "command"],
    skillSrc: null,
    commandSrc: "commands/refactor/implement.md",
    references: false,
  },
  {
    slug: "refactor-arch",
    name: "Refactor: Architecture",
    roleDefinition: "Deep architectural analysis — detect style, scan for arch-level smells.",
    groups: ["read"],
    skillSrc: null,
    commandSrc: "commands/refactor/architecture.md",
    references: false,
  },
];

/** Critical reference files to include in main refactor mode */
const REFERENCE_FILES = [
  { src: "references/code-smells.md", num: "02" },
  { src: "references/metrics.md", num: "03" },
  { src: "references/refactoring-methods.md", num: "04" },
  { src: "references/security-smells.md", num: "05" },
  { src: "references/prioritization.md", num: "06" },
];

/**
 * Roo Code adapter — installs as modes with rules directories in .roo/.
 * Generates .roomodes JSON for mode registration (merges with existing).
 */
class RooCodeAdapter extends BaseAdapter {
  get name() {
    return "roo-code";
  }

  get displayName() {
    return "Roo Code";
  }

  get capabilities() {
    return {
      slashCommands: false,
      workflows: false,
      separateReferences: false,
      fileGlobs: false,
    };
  }

  getInstallPath(scope, projectRoot) {
    if (scope === "global") return null;
    return path.join(projectRoot, ".roo");
  }

  install({ packageDir, scope, projectRoot, dryRun = false }) {
    if (scope === "global") {
      return {
        success: false,
        files: [],
        message: "Roo Code does not support global install. Use --tool=roo-code without --global.",
      };
    }

    const rooDir = this.getInstallPath(scope, projectRoot);
    const roomodesPath = path.join(projectRoot, ".roomodes");
    const files = [];

    // Collect files for each mode
    for (const mode of MODES) {
      const rulesDir = path.join(rooDir, `rules-${mode.slug}`);

      if (mode.skillSrc) {
        const content = this.readCanonical(packageDir, mode.skillSrc);
        if (content) {
          files.push(path.join(rulesDir, "01-skill.md"));
          if (!dryRun) {
            let adapted = stripClaudeFrontmatter(content);
            adapted = stripClaudeDirectives(adapted);
            this.writeFile(path.join(rulesDir, "01-skill.md"), adapted);
          }
        }

        // Reference files for main mode
        if (mode.references) {
          for (const ref of REFERENCE_FILES) {
            const refContent = this.readCanonical(packageDir, ref.src);
            if (refContent) {
              const destFile = `${ref.num}-${path.basename(ref.src)}`;
              files.push(path.join(rulesDir, destFile));
              if (!dryRun) {
                this.writeFile(path.join(rulesDir, destFile), refContent);
              }
            }
          }
        }
      }

      if (mode.commandSrc) {
        const content = this.readCanonical(packageDir, mode.commandSrc);
        if (content) {
          files.push(path.join(rulesDir, "01-workflow.md"));
          if (!dryRun) {
            let adapted = stripClaudeFrontmatter(content);
            adapted = stripClaudeDirectives(adapted);
            adapted = adapted.replace(/\$ARGUMENTS/g, "the user's request");
            this.writeFile(path.join(rulesDir, "01-workflow.md"), adapted);
          }
        }
      }
    }

    // .roomodes
    files.push(roomodesPath);

    // Marker
    files.push(path.join(rooDir, this.markerFile));

    if (dryRun) {
      return { success: true, files, message: `Would install to ${rooDir}` };
    }

    // --- Generate .roomodes ---
    this._writeRoomodes(roomodesPath);

    // Marker
    this.writeMarker(rooDir);

    console.log(`Installed refactoring skill for Roo Code (${MODES.length} modes)`);
    return { success: true, files, message: `Installed to ${rooDir}` };
  }

  /**
   * Generate or merge .roomodes JSON file.
   */
  _writeRoomodes(roomodesPath) {
    let existing = { customModes: [] };

    if (fs.existsSync(roomodesPath)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(roomodesPath, "utf-8"));
        if (parsed && typeof parsed === "object") {
          existing = parsed;
          if (!Array.isArray(existing.customModes)) {
            existing.customModes = [];
          }
        } else {
          console.warn(`  Warning: Invalid .roomodes structure — resetting`);
        }
        // Create backup before modifying
        fs.writeFileSync(roomodesPath + ".bak", JSON.stringify(existing, null, 2), "utf-8");
      } catch {
        console.warn(`  Warning: Could not parse existing .roomodes — creating new file`);
        existing = { customModes: [] };
      }
    }

    // Remove any existing refactor modes (ours)
    const ourSlugs = new Set(MODES.map((m) => m.slug));
    existing.customModes = existing.customModes.filter(
      (m) => !ourSlugs.has(m.slug)
    );

    // Add our modes
    for (const mode of MODES) {
      existing.customModes.push({
        slug: mode.slug,
        name: mode.name,
        roleDefinition: mode.roleDefinition,
        groups: mode.groups,
        customInstructions: `Follow rules in .roo/rules-${mode.slug}/`,
      });
    }

    fs.mkdirSync(path.dirname(roomodesPath), { recursive: true });
    fs.writeFileSync(roomodesPath, JSON.stringify(existing, null, 2) + "\n", "utf-8");
  }

  uninstall({ scope, projectRoot, dryRun = false }) {
    if (scope === "global") {
      return { success: true, message: "Roo Code does not use global install — nothing to remove" };
    }

    const rooDir = this.getInstallPath(scope, projectRoot);
    if (!this.hasMarker(rooDir)) {
      return { success: true, message: "Not installed for Roo Code — nothing to remove" };
    }

    if (dryRun) {
      return { success: true, message: `Would remove Roo Code files from ${rooDir}` };
    }

    // Remove rules directories
    for (const mode of MODES) {
      const rulesDir = path.join(rooDir, `rules-${mode.slug}`);
      if (fs.existsSync(rulesDir)) {
        fs.rmSync(rulesDir, { recursive: true, force: true });
      }
    }

    // Remove our modes from .roomodes
    const roomodesPath = path.join(projectRoot, ".roomodes");
    if (fs.existsSync(roomodesPath)) {
      try {
        const data = JSON.parse(fs.readFileSync(roomodesPath, "utf-8"));
        const ourSlugs = new Set(MODES.map((m) => m.slug));
        data.customModes = (data.customModes || []).filter(
          (m) => !ourSlugs.has(m.slug)
        );
        if (data.customModes.length === 0) {
          fs.unlinkSync(roomodesPath);
        } else {
          fs.writeFileSync(roomodesPath, JSON.stringify(data, null, 2) + "\n", "utf-8");
        }
      } catch {
        console.warn(`  Warning: Could not parse .roomodes during uninstall`);
      }
    }

    this.removeMarker(rooDir);
    console.log(`Removed refactoring skill from Roo Code`);
    return { success: true, message: "Uninstalled from Roo Code" };
  }
}

module.exports = RooCodeAdapter;
