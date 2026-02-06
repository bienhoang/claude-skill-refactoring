#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const SKILL_NAME = "refactoring";
const COMMAND_NAME = "refactor";
const MARKER_FILE = ".refactoring-skill";

function uninstall() {
  const home = process.env.HOME || process.env.USERPROFILE || "";
  const locations = [];

  // Global
  locations.push(path.join(home, ".claude", "skills", SKILL_NAME));

  // Project-level
  if (process.env.INIT_CWD) {
    locations.push(
      path.join(process.env.INIT_CWD, ".claude", "skills", SKILL_NAME)
    );
  }

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
  uninstallCommands();
}

function uninstallCommands() {
  const home = process.env.HOME || process.env.USERPROFILE || "";
  const commandLocations = [];

  // Global
  commandLocations.push(path.join(home, ".claude", "commands"));

  // Project-level
  if (process.env.INIT_CWD) {
    commandLocations.push(
      path.join(process.env.INIT_CWD, ".claude", "commands")
    );
  }

  for (const commandsDir of commandLocations) {
    const markerPath = path.join(commandsDir, COMMAND_NAME, MARKER_FILE);

    // Only remove if we installed it (marker file exists)
    if (!fs.existsSync(markerPath)) continue;

    try {
      // Remove router file
      const router = path.join(commandsDir, `${COMMAND_NAME}.md`);
      if (fs.existsSync(router)) fs.unlinkSync(router);

      // Remove variants directory (includes marker file)
      const variants = path.join(commandsDir, COMMAND_NAME);
      if (fs.existsSync(variants)) {
        fs.rmSync(variants, { recursive: true, force: true });
      }

      console.log(`✅ Removed /${COMMAND_NAME} commands from ${commandsDir}`);
    } catch (err) {
      console.warn(
        `⚠️  Could not remove commands from ${commandsDir}: ${err.message}`
      );
    }
  }
}

uninstall();
