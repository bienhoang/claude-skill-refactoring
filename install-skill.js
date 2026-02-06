#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const SKILL_NAME = "refactoring";

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

function getInstallTargets() {
  const targets = [];
  const home = process.env.HOME || process.env.USERPROFILE || "";

  // Determine if this is a global or local (project) install
  const isGlobal =
    process.env.npm_config_global === "true" ||
    (process.env.npm_lifecycle_event === "postinstall" &&
      !process.env.INIT_CWD);

  if (isGlobal) {
    // Global install → ~/.claude/skills/
    const globalDir = path.join(home, ".claude", "skills", SKILL_NAME);
    targets.push({ path: globalDir, label: "global (~/.claude/skills/)" });
  } else {
    // Local/project install → .claude/skills/ in the project root
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

function install() {
  const packageDir = __dirname;
  const targets = getInstallTargets();

  const filesToCopy = [
    { src: "SKILL.md", dest: "SKILL.md" },
    { src: "references", dest: "references" },
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

  console.log("");
  console.log(`🎉 Claude Code skill "${SKILL_NAME}" is ready!`);
  console.log(
    '   Use it by asking Claude to "refactor this code" or invoke /refactoring'
  );
}

install();
