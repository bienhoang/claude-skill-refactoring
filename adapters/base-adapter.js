#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

// Lazy-load version to avoid circular require during registry discovery
let _version = null;
function getPackageVersion() {
  if (!_version) {
    _version = require("../package.json").version;
  }
  return _version;
}

/**
 * Abstract base class for tool adapters.
 * Provides shared utilities for file operations, marker management,
 * and conflict detection. All tool-specific adapters extend this.
 */
class BaseAdapter {
  constructor() {
    if (new.target === BaseAdapter) {
      throw new Error("BaseAdapter is abstract — extend it");
    }
  }

  /** @returns {string} Tool identifier (e.g., 'claude-code', 'cursor') */
  get name() {
    throw new Error("Not implemented");
  }

  /** @returns {string} Human-readable name (e.g., 'Claude Code') */
  get displayName() {
    throw new Error("Not implemented");
  }

  /** @returns {string} Tool-specific marker filename */
  get markerFile() {
    return `.refactoring-skill-${this.name}`;
  }

  /**
   * Capabilities this tool supports.
   * @returns {{ slashCommands: boolean, workflows: boolean, separateReferences: boolean, fileGlobs: boolean }}
   */
  get capabilities() {
    throw new Error("Not implemented");
  }

  /**
   * Resolve target directory for installation.
   * @param {'global'|'project'} scope
   * @param {string} projectRoot
   * @returns {string} absolute path
   */
  getInstallPath(scope, projectRoot) {
    throw new Error("Not implemented");
  }

  /**
   * Install skill files for this tool.
   * @param {object} options
   * @param {string} options.packageDir - path to refactoring-kit package
   * @param {'global'|'project'} options.scope
   * @param {string} options.projectRoot
   * @param {boolean} options.dryRun
   * @returns {{ success: boolean, files: string[], message: string }}
   */
  install(options) {
    throw new Error("Not implemented");
  }

  /**
   * Uninstall skill files for this tool.
   * @param {object} options
   * @param {'global'|'project'} options.scope
   * @param {string} options.projectRoot
   * @param {boolean} options.dryRun
   * @returns {{ success: boolean, message: string }}
   */
  uninstall(options) {
    throw new Error("Not implemented");
  }

  // === Shared Utilities ===

  /** Recursively copy src to dest */
  copyRecursive(src, dest) {
    if (!fs.existsSync(src)) return;
    if (fs.statSync(src).isDirectory()) {
      fs.mkdirSync(dest, { recursive: true });
      for (const item of fs.readdirSync(src)) {
        this.copyRecursive(path.join(src, item), path.join(dest, item));
      }
    } else {
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(src, dest);
    }
  }

  /** Write marker file with tool name + version */
  writeMarker(dir) {
    const markerPath = path.join(dir, this.markerFile);
    fs.mkdirSync(path.dirname(markerPath), { recursive: true });
    fs.writeFileSync(
      markerPath,
      `installed-by:refactoring-kit\ntool:${this.name}\nversion:${getPackageVersion()}\n`
    );
  }

  /** Check if our marker exists in dir */
  hasMarker(dir) {
    return fs.existsSync(path.join(dir, this.markerFile));
  }

  /** Remove marker file */
  removeMarker(dir) {
    const p = path.join(dir, this.markerFile);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }

  /** Check for file conflict (exists but not ours) */
  hasConflict(filePath, markerDir) {
    return fs.existsSync(filePath) && !this.hasMarker(markerDir);
  }

  /** Get user home directory */
  getHome() {
    return process.env.HOME || process.env.USERPROFILE || "";
  }

  /** Read canonical source file from package */
  readCanonical(packageDir, relativePath) {
    const fullPath = path.join(packageDir, relativePath);
    if (!fs.existsSync(fullPath)) return null;
    return fs.readFileSync(fullPath, "utf-8");
  }

  /** Write content to file, creating parent dirs as needed */
  writeFile(filePath, content) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content, "utf-8");
  }

  /**
   * Collect files that would be created during install (for dry-run).
   * Lists all files under a source directory as relative dest paths.
   * @param {string} srcDir - source directory to scan
   * @param {string} destDir - target directory prefix
   * @returns {string[]} list of destination file paths
   */
  collectFiles(srcDir, destDir) {
    const files = [];
    if (!fs.existsSync(srcDir)) return files;
    const walk = (dir, rel) => {
      for (const item of fs.readdirSync(dir)) {
        const full = path.join(dir, item);
        const relPath = path.join(rel, item);
        if (fs.statSync(full).isDirectory()) {
          walk(full, relPath);
        } else {
          files.push(path.join(destDir, relPath));
        }
      }
    };
    walk(srcDir, "");
    return files;
  }
}

module.exports = BaseAdapter;
