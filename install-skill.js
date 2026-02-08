#!/usr/bin/env node

/**
 * npm postinstall hook — delegates to Claude Code adapter.
 * This file is called by `npm install refactoring-kit` and must
 * preserve backward-compatible behavior (console output, paths).
 */

const registry = require("./adapters/registry");

// Determine if this is a global or local (project) install
function isGlobalInstall() {
  return (
    process.env.npm_config_global === "true" ||
    (process.env.npm_lifecycle_event === "postinstall" &&
      !process.env.INIT_CWD)
  );
}

const adapter = registry.getDefault();
adapter.install({
  packageDir: __dirname,
  scope: isGlobalInstall() ? "global" : "project",
  projectRoot: process.env.INIT_CWD || process.cwd(),
  dryRun: false,
});
