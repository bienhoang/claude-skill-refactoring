#!/usr/bin/env node

/**
 * Shared content transformation utilities for adapters.
 * Converts canonical markdown (SKILL.md, commands/*.md) into
 * tool-specific formats. Pure functions — no side effects.
 */

const fs = require("fs");
const path = require("path");

const MARKER_START = "<!-- refactoring-kit:start -->";
const MARKER_END = "<!-- refactoring-kit:end -->";

/**
 * Strip YAML frontmatter (---\n...\n---) from markdown content.
 * @param {string} md - markdown with optional frontmatter
 * @returns {string} content without frontmatter
 */
function stripClaudeFrontmatter(md) {
  return md.replace(/^---\n[\s\S]*?\n---\n*/, "");
}

/**
 * Strip Claude Code-specific directives from content.
 * Removes: `Activate \`refactoring\` skill.`, `<target>$ARGUMENTS</target>`
 * @param {string} md - markdown content
 * @returns {string} cleaned content
 */
function stripClaudeDirectives(md) {
  return md
    .replace(/Activate `refactoring` skill\.\n*/g, "")
    .replace(/<target>\$ARGUMENTS<\/target>\n*/g, "");
}

/**
 * Smart truncation to fit within character limit.
 * Trims from end, preferring to cut example blocks and comments.
 * @param {string} content - text to truncate
 * @param {number} maxChars - maximum character count
 * @returns {string} truncated content
 */
function truncateToLimit(content, maxChars) {
  if (content.length <= maxChars) return content;

  // 1. Try removing code example blocks first (preserves prose)
  let trimmed = content.replace(/```[\s\S]*?```\n*/g, "");
  if (trimmed.length <= maxChars) return trimmed;

  // 2. Try removing HTML comments
  trimmed = trimmed.replace(/<!--[\s\S]*?-->\n*/g, "");
  if (trimmed.length <= maxChars) return trimmed;

  // 3. Try removing sections from the end (find last ## heading and trim)
  const sections = trimmed.split(/(?=^## )/m);
  while (sections.length > 1 && sections.join("").length > maxChars) {
    sections.pop();
  }
  trimmed = sections.join("");
  if (trimmed.length <= maxChars) return trimmed;

  // 4. Hard truncate at section boundary or character limit
  return trimmed.slice(0, maxChars - 50) + "\n\n<!-- truncated for size limit -->\n";
}

/**
 * Wrap content in section markers for safe append/replace.
 * @param {string} content - content to wrap
 * @returns {string} content wrapped with start/end markers
 */
function wrapWithMarkers(content) {
  return `${MARKER_START}\n${content}\n${MARKER_END}`;
}

/**
 * Append or replace our section in an existing file.
 * Creates .bak backup before modifying. If markers are damaged,
 * warns and skips rather than corrupting file.
 * Note: .bak files can be safely deleted after verifying the install succeeded.
 * @param {string} filePath - file to modify
 * @param {string} content - new content (unwrapped — will be wrapped)
 * @param {boolean} dryRun - if true, return what would happen without writing
 * @returns {{ action: 'created'|'replaced'|'appended'|'skipped', message: string }}
 */
function appendToExistingFile(filePath, content, dryRun = false) {
  const wrapped = wrapWithMarkers(content);

  if (!fs.existsSync(filePath)) {
    if (!dryRun) {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, wrapped + "\n", "utf-8");
    }
    return { action: "created", message: `Created ${path.basename(filePath)}` };
  }

  const existing = fs.readFileSync(filePath, "utf-8");
  const markerState = validateMarkers(existing, MARKER_START, MARKER_END);

  // Markers damaged — one exists but not the other
  if (!markerState.valid) {
    return {
      action: "skipped",
      message: `Section markers damaged in ${path.basename(filePath)} (found ${markerState.found}, missing ${markerState.missing}). Manual fix needed — remove partial markers and re-run install.`,
    };
  }

  if (markerState.hasMarkers) {
    // Replace existing section
    const regex = new RegExp(
      `${escapeRegex(MARKER_START)}[\\s\\S]*?${escapeRegex(MARKER_END)}`
    );
    const updated = existing.replace(regex, wrapped);
    if (!dryRun) {
      fs.writeFileSync(filePath + ".bak", existing, "utf-8");
      fs.writeFileSync(filePath, updated, "utf-8");
    }
    return { action: "replaced", message: `Updated section in ${path.basename(filePath)} (.bak created)` };
  }

  // Append to end
  if (!dryRun) {
    fs.writeFileSync(filePath + ".bak", existing, "utf-8");
    fs.writeFileSync(filePath, existing.trimEnd() + "\n\n" + wrapped + "\n", "utf-8");
  }
  return { action: "appended", message: `Appended to ${path.basename(filePath)} (.bak created)` };
}

/** Escape string for use in RegExp */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Validate that both start and end markers are present or both absent.
 * @param {string} content - file content to check
 * @param {string} startMarker - start marker string
 * @param {string} endMarker - end marker string
 * @returns {{ valid: boolean, hasMarkers: boolean, found?: string, missing?: string }}
 */
function validateMarkers(content, startMarker, endMarker) {
  const hasStart = content.includes(startMarker);
  const hasEnd = content.includes(endMarker);
  if (hasStart !== hasEnd) {
    return {
      valid: false,
      hasMarkers: false,
      found: hasStart ? "start" : "end",
      missing: hasStart ? "end" : "start",
    };
  }
  return { valid: true, hasMarkers: hasStart && hasEnd };
}

module.exports = {
  stripClaudeFrontmatter,
  stripClaudeDirectives,
  truncateToLimit,
  wrapWithMarkers,
  appendToExistingFile,
  escapeRegex,
  validateMarkers,
  MARKER_START,
  MARKER_END,
};
