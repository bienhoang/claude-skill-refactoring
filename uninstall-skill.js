#!/usr/bin/env node

/**
 * npm preuninstall hook — delegates to Claude Code adapter.
 * This file is called by `npm uninstall refactoring-kit` and must
 * preserve backward-compatible behavior (console output, cleanup).
 */

const registry = require("./adapters/registry");

const adapter = registry.getDefault();

// Uninstall from both global and project scopes
// (original behavior: always tries both)
adapter.uninstall({
  scope: "global",
  projectRoot: process.env.INIT_CWD || process.cwd(),
  dryRun: false,
});

adapter.uninstall({
  scope: "project",
  projectRoot: process.env.INIT_CWD || process.cwd(),
  dryRun: false,
});
