#!/usr/bin/env node

const { program } = require("commander");
const registry = require("./adapters/registry");
const pkg = require("./package.json");

program
  .name("refactoring-kit")
  .description("Universal refactoring skill for AI coding tools")
  .version(pkg.version);

program
  .command("install")
  .description("Install refactoring skill for specified tool(s)")
  .option(
    "--tool <tools>",
    "comma-separated tool names (default: claude-code)",
    "claude-code"
  )
  .option("--global", "install globally instead of project-level", false)
  .option(
    "--dry-run",
    "show what would be installed without writing files",
    false
  )
  .action((options) => {
    const tools = options.tool.split(",").map((t) => t.trim());
    const scope = options.global ? "global" : "project";
    const projectRoot = process.cwd();
    let hasError = false;

    for (const toolName of tools) {
      try {
        const adapter = registry.get(toolName);
        const result = adapter.install({
          packageDir: __dirname,
          scope,
          projectRoot,
          dryRun: options.dryRun,
        });
        if (result.success) {
          if (options.dryRun) {
            console.log(`${adapter.displayName}: ${result.message}`);
            if (result.files.length) {
              result.files.forEach((f) => console.log(`  would create: ${f}`));
            }
          }
          // Non-dry-run output is handled by the adapter itself
        } else {
          console.error(`${adapter.displayName}: ${result.message}`);
          hasError = true;
        }
      } catch (err) {
        console.error(`${toolName}: ${err.message}`);
        hasError = true;
      }
    }

    if (hasError) process.exit(1);
  });

program
  .command("uninstall")
  .description("Uninstall refactoring skill for specified tool(s)")
  .option(
    "--tool <tools>",
    "comma-separated tool names (default: claude-code)",
    "claude-code"
  )
  .option("--global", "uninstall from global location", false)
  .option(
    "--dry-run",
    "show what would be removed without deleting files",
    false
  )
  .action((options) => {
    const tools = options.tool.split(",").map((t) => t.trim());
    const scope = options.global ? "global" : "project";
    const projectRoot = process.cwd();
    let hasError = false;

    for (const toolName of tools) {
      try {
        const adapter = registry.get(toolName);
        const result = adapter.uninstall({
          scope,
          projectRoot,
          dryRun: options.dryRun,
        });
        if (result.success) {
          if (options.dryRun) {
            console.log(`${adapter.displayName}: ${result.message}`);
          }
        } else {
          console.error(`${adapter.displayName}: ${result.message}`);
          hasError = true;
        }
      } catch (err) {
        console.error(`${toolName}: ${err.message}`);
        hasError = true;
      }
    }

    if (hasError) process.exit(1);
  });

program
  .command("tools")
  .description("List all supported AI coding tools")
  .action(() => {
    const tools = registry.list();
    console.log(`\nSupported tools (${tools.length}):\n`);
    for (const tool of tools) {
      const caps = [];
      if (tool.capabilities.bestEffort) caps.push("best effort");
      if (tool.capabilities.slashCommands) caps.push("commands");
      if (tool.capabilities.separateReferences) caps.push("refs");
      if (tool.capabilities.workflows) caps.push("workflows");
      if (tool.capabilities.fileGlobs) caps.push("globs");
      console.log(
        `  ${tool.name.padEnd(18)} ${tool.displayName.padEnd(20)} [${caps.join(", ")}]`
      );
    }
    console.log(`\nUsage: npx refactoring-kit install --tool=<name>`);
  });

program.parse();
