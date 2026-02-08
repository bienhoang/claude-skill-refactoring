#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const BaseAdapter = require("./base-adapter");

const SKILL_NAME = "refactoring";
const COMMAND_NAME = "refactor";

/**
 * Claude Code adapter — installs skill files to ~/.claude/skills/
 * and slash commands to ~/.claude/commands/.
 * Extracted from the original install-skill.js.
 */
class ClaudeCodeAdapter extends BaseAdapter {
  get name() {
    return "claude-code";
  }

  get displayName() {
    return "Claude Code";
  }

  // Backward compat: use original marker name so existing installs
  // are recognized during uninstall
  get markerFile() {
    return ".refactoring-skill";
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
      return path.join(this.getHome(), ".claude", "skills", SKILL_NAME);
    }
    return path.join(projectRoot, ".claude", "skills", SKILL_NAME);
  }

  /**
   * Get commands directory for given scope.
   */
  _getCommandsDir(scope, projectRoot) {
    if (scope === "global") {
      return path.join(this.getHome(), ".claude", "commands");
    }
    return path.join(projectRoot, ".claude", "commands");
  }

  install({ packageDir, scope, projectRoot, dryRun = false }) {
    const files = [];
    const skillDir = this.getInstallPath(scope, projectRoot);
    const commandsDir = this._getCommandsDir(scope, projectRoot);

    // Skill files to copy
    const filesToCopy = [
      { src: "SKILL.md", dest: "SKILL.md" },
      { src: "REFERENCE.md", dest: "REFERENCE.md" },
      { src: "references", dest: "references" },
      { src: "resources", dest: "resources" },
    ];

    // Collect skill files
    for (const file of filesToCopy) {
      const srcPath = path.join(packageDir, file.src);
      if (fs.existsSync(srcPath)) {
        if (fs.statSync(srcPath).isDirectory()) {
          files.push(...this.collectFiles(srcPath, path.join(skillDir, file.dest)));
        } else {
          files.push(path.join(skillDir, file.dest));
        }
      }
    }

    // Collect command files
    const commandSrc = path.join(packageDir, "commands");
    if (fs.existsSync(commandSrc)) {
      files.push(path.join(commandsDir, `${COMMAND_NAME}.md`));
      files.push(...this.collectFiles(
        path.join(commandSrc, COMMAND_NAME),
        path.join(commandsDir, COMMAND_NAME)
      ));
    }

    if (dryRun) {
      const label = scope === "global"
        ? "global (~/.claude/skills/)"
        : `project (${skillDir})`;
      return {
        success: true,
        files,
        message: `Would install to ${label}`,
      };
    }

    // --- Actual install ---
    try {
      // Clean existing skill installation
      if (fs.existsSync(skillDir)) {
        fs.rmSync(skillDir, { recursive: true, force: true });
      }
      fs.mkdirSync(skillDir, { recursive: true });

      // Copy skill files
      for (const file of filesToCopy) {
        const src = path.join(packageDir, file.src);
        const dest = path.join(skillDir, file.dest);
        this.copyRecursive(src, dest);
      }

      const label = scope === "global"
        ? "global (~/.claude/skills/)"
        : `project (${skillDir})`;
      console.log(`✅ Installed skill "${SKILL_NAME}" to ${label}`);
    } catch (err) {
      return {
        success: false,
        files: [],
        message: `Could not install skill: ${err.message}`,
      };
    }

    // Install commands
    this._installCommands(packageDir, scope, projectRoot);

    console.log("");
    console.log(`🎉 Claude Code skill "${SKILL_NAME}" is ready!`);
    console.log(
      '   Use it by asking Claude to "refactor this code" or invoke /refactor'
    );

    return {
      success: true,
      files,
      message: `Installed to ${scope === "global" ? "global" : "project"}`,
    };
  }

  /**
   * Install slash commands to .claude/commands/.
   */
  _installCommands(packageDir, scope, projectRoot) {
    const commandsDir = this._getCommandsDir(scope, projectRoot);
    const commandSrc = path.join(packageDir, "commands");

    if (!fs.existsSync(commandSrc)) {
      console.warn(
        "⚠️  commands/ directory not found in package. Skipping command installation."
      );
      return;
    }

    // Collision detection
    const routerDest = path.join(commandsDir, `${COMMAND_NAME}.md`);
    const variantsDest = path.join(commandsDir, COMMAND_NAME);
    const markerPath = path.join(variantsDest, this.markerFile);

    if (fs.existsSync(routerDest) && !fs.existsSync(markerPath)) {
      console.warn(
        `⚠️  /${COMMAND_NAME} command already exists and was not installed by this package. Skipping command installation.`
      );
      console.warn(
        `   To override, remove existing ${COMMAND_NAME}.md and ${COMMAND_NAME}/ from ${commandsDir}`
      );
      return;
    }

    fs.mkdirSync(commandsDir, { recursive: true });

    const commandFiles = [
      { src: `commands/${COMMAND_NAME}.md`, dest: `${COMMAND_NAME}.md` },
      { src: `commands/${COMMAND_NAME}`, dest: COMMAND_NAME },
    ];

    let variantCount = 0;
    for (const file of commandFiles) {
      const src = path.join(packageDir, file.src);
      const dest = path.join(commandsDir, file.dest);
      if (fs.existsSync(src)) {
        this.copyRecursive(src, dest);
        if (fs.statSync(src).isDirectory()) {
          variantCount = fs
            .readdirSync(src)
            .filter((f) => f.endsWith(".md")).length;
        }
      }
    }

    // Write ownership marker
    fs.writeFileSync(
      markerPath,
      `installed-by:refactoring-kit\nversion:${require("../package.json").version}\n`
    );

    const label = scope === "global"
      ? "global (~/.claude/commands/)"
      : `project (${commandsDir})`;
    console.log(
      `✅ Installed /${COMMAND_NAME} commands (${variantCount} variants) to ${label}`
    );
  }

  uninstall({ scope, projectRoot, dryRun = false }) {
    const home = this.getHome();
    const locations = [];

    // Determine which locations to clean based on scope
    if (scope === "global" || !scope) {
      locations.push(path.join(home, ".claude", "skills", SKILL_NAME));
    }
    if (scope === "project" || !scope) {
      if (projectRoot) {
        locations.push(
          path.join(projectRoot, ".claude", "skills", SKILL_NAME)
        );
      }
    }

    if (dryRun) {
      return {
        success: true,
        message: `Would remove from: ${locations.join(", ")}`,
      };
    }

    // Remove skill files
    for (const loc of locations) {
      try {
        if (fs.existsSync(loc)) {
          fs.rmSync(loc, { recursive: true, force: true });
          console.log(`✅ Removed skill "${SKILL_NAME}" from ${loc}`);
        }
      } catch (err) {
        console.warn(`⚠️  Could not remove ${loc}: ${err.message}`);
      }
    }

    // Remove commands
    this._uninstallCommands(scope, projectRoot);

    return { success: true, message: "Uninstalled" };
  }

  /**
   * Remove slash commands from .claude/commands/.
   */
  _uninstallCommands(scope, projectRoot) {
    const home = this.getHome();
    const commandLocations = [];

    if (scope === "global" || !scope) {
      commandLocations.push(path.join(home, ".claude", "commands"));
    }
    if (scope === "project" || !scope) {
      if (projectRoot) {
        commandLocations.push(
          path.join(projectRoot, ".claude", "commands")
        );
      }
    }

    for (const commandsDir of commandLocations) {
      const markerPath = path.join(
        commandsDir,
        COMMAND_NAME,
        this.markerFile
      );

      // Only remove if we installed it
      if (!fs.existsSync(markerPath)) continue;

      try {
        const router = path.join(commandsDir, `${COMMAND_NAME}.md`);
        if (fs.existsSync(router)) fs.unlinkSync(router);

        const variants = path.join(commandsDir, COMMAND_NAME);
        if (fs.existsSync(variants)) {
          fs.rmSync(variants, { recursive: true, force: true });
        }

        console.log(
          `✅ Removed /${COMMAND_NAME} commands from ${commandsDir}`
        );
      } catch (err) {
        console.warn(
          `⚠️  Could not remove commands from ${commandsDir}: ${err.message}`
        );
      }
    }
  }
}

module.exports = ClaudeCodeAdapter;
