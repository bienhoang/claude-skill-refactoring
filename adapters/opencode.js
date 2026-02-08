#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const BaseAdapter = require("./base-adapter");
const {
  stripClaudeFrontmatter,
  stripClaudeDirectives,
  escapeRegex,
  validateMarkers,
} = require("./content-utils");

const SKILL_NAME = "refactoring";

/** OpenCode-specific markers — different from Codex to allow coexistence in AGENTS.md */
const OC_MARKER_START = "<!-- refactoring-kit-opencode:start -->";
const OC_MARKER_END = "<!-- refactoring-kit-opencode:end -->";

/** Command files to copy as documentation */
const COMMAND_FILES = [
  { src: "commands/refactor/review.md", name: "review" },
  { src: "commands/refactor/fast.md", name: "fast" },
  { src: "commands/refactor/plan.md", name: "plan" },
  { src: "commands/refactor/implement.md", name: "implement" },
  { src: "commands/refactor/architecture.md", name: "architecture" },
];

/**
 * OpenCode adapter — installs via AGENTS.md with OpenCode-specific markers.
 * Uses different markers from Codex CLI to allow both to coexist in the same AGENTS.md.
 * Creates .bak backup before modifying AGENTS.md.
 */
class OpenCodeAdapter extends BaseAdapter {
  get name() {
    return "opencode";
  }

  get displayName() {
    return "OpenCode";
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
   * Generate AGENTS.md section with OpenCode-specific content.
   */
  _generateAgentsSection(skillContent) {
    let adapted = stripClaudeFrontmatter(skillContent);
    adapted = stripClaudeDirectives(adapted);

    return [
      "## Refactoring Skill (OpenCode)",
      "",
      adapted.trim(),
      "",
      "### Skills",
      "",
      "When user asks to refactor code, use these workflows:",
      "- `review` — Read-only code analysis",
      "- `fast` — Autonomous refactoring",
      "- `plan` — Collaborative planning",
      "- `implement` — Execute refactoring plan",
      "- `architecture` — Architectural analysis",
      "",
      `Read \`.opencode/${SKILL_NAME}/commands/\` for detailed workflows.`,
      `Read \`.opencode/${SKILL_NAME}/references/\` for code smell catalogs and metrics.`,
    ].join("\n");
  }

  /**
   * Wrap content with OpenCode-specific markers.
   */
  _wrapWithMarkers(content) {
    return `${OC_MARKER_START}\n${content}\n${OC_MARKER_END}`;
  }

  /**
   * Append or replace our section in AGENTS.md using OpenCode-specific markers.
   * Creates .bak backup before modifying.
   * @param {string} filePath - AGENTS.md path
   * @param {string} content - section content (unwrapped)
   * @returns {{ action: string, message: string }}
   */
  _appendToAgentsMd(filePath, content) {
    const wrapped = this._wrapWithMarkers(content);

    if (!fs.existsSync(filePath)) {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, wrapped + "\n", "utf-8");
      return { action: "created", message: `Created ${path.basename(filePath)}` };
    }

    const existing = fs.readFileSync(filePath, "utf-8");
    const markerState = validateMarkers(existing, OC_MARKER_START, OC_MARKER_END);

    // Markers damaged
    if (!markerState.valid) {
      return {
        action: "skipped",
        message: `OpenCode markers damaged in ${path.basename(filePath)} (found ${markerState.found}, missing ${markerState.missing}). Manual fix needed.`,
      };
    }

    if (markerState.hasMarkers) {
      // Replace existing section
      const regex = new RegExp(
        `${escapeRegex(OC_MARKER_START)}[\\s\\S]*?${escapeRegex(OC_MARKER_END)}`
      );
      const updated = existing.replace(regex, wrapped);
      fs.writeFileSync(filePath + ".bak", existing, "utf-8");
      fs.writeFileSync(filePath, updated, "utf-8");
      return { action: "replaced", message: `Updated OpenCode section in ${path.basename(filePath)} (.bak created)` };
    }

    // Append to end
    fs.writeFileSync(filePath + ".bak", existing, "utf-8");
    fs.writeFileSync(filePath, existing.trimEnd() + "\n\n" + wrapped + "\n", "utf-8");
    return { action: "appended", message: `Appended OpenCode section to ${path.basename(filePath)} (.bak created)` };
  }

  install({ packageDir, scope, projectRoot, dryRun = false }) {
    if (scope === "global") {
      return {
        success: false,
        files: [],
        message: "OpenCode does not support global installation. Use --tool=opencode without --global.",
      };
    }

    const installPath = this.getInstallPath(scope, projectRoot);
    const ocDir = path.join(projectRoot, ".opencode", SKILL_NAME);
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
      files.push(...this.collectFiles(refsSrc, path.join(ocDir, "references")));
    }

    // 3. Command docs
    for (const cmd of COMMAND_FILES) {
      const content = this.readCanonical(packageDir, cmd.src);
      if (content) {
        files.push(path.join(ocDir, "commands", `${cmd.name}.md`));
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

    // AGENTS.md section
    const section = this._generateAgentsSection(skillContent);
    const result = this._appendToAgentsMd(agentsMdPath, section);
    console.log(`  ${result.message}`);

    // References
    if (fs.existsSync(refsSrc)) {
      this.copyRecursive(refsSrc, path.join(ocDir, "references"));
    }

    // Commands (adapted)
    for (const cmd of COMMAND_FILES) {
      const content = this.readCanonical(packageDir, cmd.src);
      if (!content) continue;
      let adapted = stripClaudeFrontmatter(content);
      adapted = stripClaudeDirectives(adapted);
      this.writeFile(path.join(ocDir, "commands", `${cmd.name}.md`), adapted);
    }

    // Marker
    this.writeMarker(installPath);

    console.log(`Installed refactoring skill for OpenCode`);
    return { success: true, files, message: `Installed to ${installPath}` };
  }

  uninstall({ scope, projectRoot, dryRun = false }) {
    if (scope === "global") {
      return { success: true, message: "OpenCode does not use global install — nothing to remove" };
    }

    const installPath = this.getInstallPath(scope, projectRoot);
    const ocDir = path.join(projectRoot, ".opencode", SKILL_NAME);

    if (!this.hasMarker(installPath)) {
      return { success: true, message: "Not installed for OpenCode — nothing to remove" };
    }

    if (dryRun) {
      return { success: true, message: `Would remove OpenCode files from ${installPath}` };
    }

    // Remove .opencode/refactoring/ directory
    if (fs.existsSync(ocDir)) {
      fs.rmSync(ocDir, { recursive: true, force: true });
    }

    // Remove our section from AGENTS.md
    const agentsMdPath = path.join(installPath, "AGENTS.md");
    if (fs.existsSync(agentsMdPath)) {
      const content = fs.readFileSync(agentsMdPath, "utf-8");
      const markerState = validateMarkers(content, OC_MARKER_START, OC_MARKER_END);
      if (markerState.valid && markerState.hasMarkers) {
        const regex = new RegExp(
          `\\n*${escapeRegex(OC_MARKER_START)}[\\s\\S]*?${escapeRegex(OC_MARKER_END)}\\n*`
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

    console.log(`Removed refactoring skill from OpenCode`);
    return { success: true, message: "Uninstalled from OpenCode" };
  }
}

module.exports = OpenCodeAdapter;
