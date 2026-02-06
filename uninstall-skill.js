#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const SKILL_NAME = "refactoring";

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
}

uninstall();
