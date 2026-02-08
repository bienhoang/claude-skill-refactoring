#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const SKILL_NAME = "refactoring";
const COMMAND_NAME = "refactor";
const MARKER_FILE = ".refactoring-skill";
const PACKAGE_VERSION = require("./package.json").version;

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return;

  if (fs.statSync(src).isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const item of fs.readdirSync(src)) {
      copyRecursive(path.join(src, item), path.join(dest, item));
    }
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

// Determine if this is a global or local (project) install
function isGlobalInstall() {
  return (
    process.env.npm_config_global === "true" ||
    (process.env.npm_lifecycle_event === "postinstall" &&
      !process.env.INIT_CWD)
  );
}

function getInstallTargets() {
  const targets = [];
  const home = process.env.HOME || process.env.USERPROFILE || "";

  if (isGlobalInstall()) {
    const globalDir = path.join(home, ".claude", "skills", SKILL_NAME);
    targets.push({ path: globalDir, label: "global (~/.claude/skills/)" });
  } else {
    const projectRoot = process.env.INIT_CWD || process.cwd();
    const projectDir = path.join(
      projectRoot,
      ".claude",
      "skills",
      SKILL_NAME
    );
    targets.push({ path: projectDir, label: `project (${projectDir})` });
  }

  return targets;
}

function installCommands(packageDir, isGlobal) {
  const home = process.env.HOME || process.env.USERPROFILE || "";
  const commandsDir = isGlobal
    ? path.join(home, ".claude", "commands")
    : path.join(
        process.env.INIT_CWD || process.cwd(),
        ".claude",
        "commands"
      );

  const commandSrc = path.join(packageDir, "commands");
  if (!fs.existsSync(commandSrc)) {
    console.warn(
      `⚠️  commands/ directory not found in package. Skipping command installation.`
    );
    return;
  }

  // Collision detection: check if /refactor exists but wasn't installed by us
  const routerDest = path.join(commandsDir, `${COMMAND_NAME}.md`);
  const variantsDest = path.join(commandsDir, COMMAND_NAME);
  const markerPath = path.join(variantsDest, MARKER_FILE);

  if (fs.existsSync(routerDest) && !fs.existsSync(markerPath)) {
    console.warn(
      `⚠️  /${COMMAND_NAME} command already exists and was not installed by this package. Skipping command installation.`
    );
    console.warn(
      `   To override, remove existing ${COMMAND_NAME}.md and ${COMMAND_NAME}/ from ${commandsDir}`
    );
    return;
  }

  // Ensure commands directory exists
  fs.mkdirSync(commandsDir, { recursive: true });

  // Copy router file and variants directory
  const commandFiles = [
    { src: `commands/${COMMAND_NAME}.md`, dest: `${COMMAND_NAME}.md` },
    { src: `commands/${COMMAND_NAME}`, dest: COMMAND_NAME },
  ];

  let variantCount = 0;
  for (const file of commandFiles) {
    const src = path.join(packageDir, file.src);
    const dest = path.join(commandsDir, file.dest);
    if (fs.existsSync(src)) {
      copyRecursive(src, dest);
      if (fs.statSync(src).isDirectory()) {
        variantCount = fs.readdirSync(src).filter((f) => f.endsWith(".md")).length;
      }
    }
  }

  // Write ownership marker with version for future migrations
  fs.writeFileSync(
    markerPath,
    `installed-by:refactoring-kit\nversion:${PACKAGE_VERSION}\n`
  );

  const label = isGlobal ? "global (~/.claude/commands/)" : `project (${commandsDir})`;
  console.log(
    `✅ Installed /${COMMAND_NAME} commands (${variantCount} variants) to ${label}`
  );
}

function install() {
  const packageDir = __dirname;
  const targets = getInstallTargets();

  const filesToCopy = [
    { src: "SKILL.md", dest: "SKILL.md" },
    { src: "REFERENCE.md", dest: "REFERENCE.md" },
    { src: "references", dest: "references" },
    { src: "resources", dest: "resources" },
  ];

  for (const target of targets) {
    try {
      // Clean existing installation
      if (fs.existsSync(target.path)) {
        fs.rmSync(target.path, { recursive: true, force: true });
      }

      fs.mkdirSync(target.path, { recursive: true });

      for (const file of filesToCopy) {
        const src = path.join(packageDir, file.src);
        const dest = path.join(target.path, file.dest);
        copyRecursive(src, dest);
      }

      console.log(`✅ Installed skill "${SKILL_NAME}" to ${target.label}`);
    } catch (err) {
      console.warn(
        `⚠️  Could not install to ${target.label}: ${err.message}`
      );
    }
  }

  // Install commands
  installCommands(packageDir, isGlobalInstall());

  console.log("");
  console.log(`🎉 Claude Code skill "${SKILL_NAME}" is ready!`);
  console.log(
    '   Use it by asking Claude to "refactor this code" or invoke /refactor'
  );
}

install();
