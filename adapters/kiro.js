#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const BaseAdapter = require("./base-adapter");

/**
 * Kiro adapter — installs to .kiro/specs/refactoring/ with spec-driven format.
 * Generates requirements.md (EARS format), design.md (workflow), tasks.md (checklist).
 * Limited support — Kiro uses spec-driven development, not instruction-based.
 * Project-only (no global scope).
 */
class KiroAdapter extends BaseAdapter {
  get name() {
    return "kiro";
  }

  get displayName() {
    return "Kiro (limited)";
  }

  get capabilities() {
    return {
      slashCommands: false,
      workflows: false,
      separateReferences: false,
      fileGlobs: false,
    };
  }

  getInstallPath(scope, projectRoot) {
    if (scope === "global") return null;
    return path.join(projectRoot, ".kiro", "specs", "refactoring");
  }

  /**
   * Generate requirements.md in EARS format.
   * Content is hardcoded rather than derived from SKILL.md because the EARS
   * (Easy Approach to Requirements Syntax) format requires structured
   * WHEN/SHALL/AND clauses that don't map from free-form markdown.
   * Update these if the core skill workflow changes significantly.
   */
  _generateRequirements() {
    return [
      "## Introduction",
      "",
      "Code refactoring skill for systematic improvement of code structure",
      "while preserving behavior. Covers smell detection, safe transformation,",
      "and test verification.",
      "",
      "## Requirements",
      "",
      "### REQ-001: Code Smell Detection",
      "**WHEN** user asks to refactor, review, or analyze code",
      "**THE SYSTEM SHALL** scan for 25+ code smells across categories:",
      "bloaters, OOP abusers, change preventers, dispensables, couplers, and security smells",
      "**AND** report severity (critical/major/minor) with quantitative metrics",
      "",
      "### REQ-002: Test Safety",
      "**WHEN** refactoring code",
      "**THE SYSTEM SHALL** verify existing tests pass before applying transformations",
      "**AND** revert immediately if any test fails after transformation",
      "",
      "### REQ-003: Read-Only Analysis",
      "**WHEN** user requests a review or analysis",
      "**THE SYSTEM SHALL** analyze and report without modifying any code",
      "",
      "### REQ-004: Prioritized Reporting",
      "**WHEN** reporting code smells",
      "**THE SYSTEM SHALL** rank findings by ROI:",
      "security vulnerabilities > correctness risks > structural smells > DRY violations > naming > style",
      "",
      "### REQ-005: Safe Transformation",
      "**WHEN** applying refactoring transformations",
      "**THE SYSTEM SHALL** use established refactoring methods (Extract Method, Move Field, etc.)",
      "**AND** apply one transformation at a time",
      "**AND** verify tests pass after each transformation",
      "",
      "### REQ-006: Architectural Analysis",
      "**WHEN** user requests architectural analysis",
      "**THE SYSTEM SHALL** detect the architectural style (layered, microservices, etc.)",
      "**AND** scan for architecture-level smells (cyclic dependencies, god components, etc.)",
      "",
    ].join("\n");
  }

  /**
   * Generate design.md from workflow description.
   */
  _generateDesign() {
    return [
      "## Architecture",
      "",
      "### Refactoring Workflow",
      "",
      "```",
      "1. Analyze → 2. Safeguard → 3. Transform → 4. Verify → 5. Report",
      "```",
      "",
      "### Phase 1: Analyze",
      "- Scan target code for smells using 25+ pattern catalog",
      "- Score severity with quantitative metrics (cyclomatic complexity, coupling, etc.)",
      "- Prioritize by ROI: security > correctness > structure > duplication > naming",
      "",
      "### Phase 2: Safeguard",
      "- Check for existing tests covering target code",
      "- Write characterization tests if coverage is insufficient",
      "- Snapshot current behavior before changes",
      "",
      "### Phase 3: Transform",
      "- Apply one refactoring method at a time",
      "- Use established techniques: Extract Method, Move Field, Replace Conditional, etc.",
      "- Keep changes small and focused",
      "",
      "### Phase 4: Verify",
      "- Run all tests after each transformation",
      "- Revert if any test fails",
      "- Confirm behavior preservation",
      "",
      "### Phase 5: Report",
      "- Summarize changes with before/after metrics",
      "- List remaining smells for future iterations",
      "- Generate quantitative improvement report",
      "",
      "### Available Workflows",
      "",
      "| Workflow | Description |",
      "|----------|------------|",
      "| Review | Read-only analysis — scan, score, report |",
      "| Fast | Autonomous refactoring — review + apply + verify |",
      "| Plan | Collaborative planning with phased approach |",
      "| Implement | Execute refactoring plan phase by phase |",
      "| Architecture | Deep architectural analysis |",
      "",
      "### Reference Materials",
      "",
      "- Code smells catalog: 25+ patterns across 6 categories",
      "- Metrics thresholds: cyclomatic complexity, coupling, cohesion, LOC, duplication",
      "- Refactoring methods: 30+ techniques with applicability rules",
      "- Security smells: injection, auth, crypto, data exposure patterns",
      "- Prioritization: ROI-based ranking formula",
      "",
    ].join("\n");
  }

  /**
   * Generate tasks.md as refactoring checklist.
   */
  _generateTasks() {
    return [
      "## Refactoring Tasks",
      "",
      "### Analysis Phase",
      "- [ ] Scout target files/directories and understand code structure",
      "- [ ] Load configuration (.refactoring.yaml) if present",
      "- [ ] Detect code smells using pattern catalog",
      "- [ ] Score severity with quantitative metrics",
      "- [ ] Identify security vulnerabilities",
      "- [ ] Rank findings by ROI priority",
      "",
      "### Safeguard Phase",
      "- [ ] Check for existing test coverage",
      "- [ ] Write characterization tests if needed",
      "- [ ] Snapshot current behavior",
      "",
      "### Transformation Phase",
      "- [ ] Select appropriate refactoring method for each smell",
      "- [ ] Apply transformations one at a time",
      "- [ ] Verify tests pass after each transformation",
      "- [ ] Revert if any test fails",
      "",
      "### Verification Phase",
      "- [ ] Run full test suite",
      "- [ ] Confirm behavior preservation",
      "- [ ] Check for new smells introduced",
      "",
      "### Reporting Phase",
      "- [ ] Generate before/after metrics comparison",
      "- [ ] List remaining smells for future work",
      "- [ ] Provide quantitative improvement summary",
      "",
    ].join("\n");
  }

  install({ packageDir, scope, projectRoot, dryRun = false }) {
    if (scope === "global") {
      return {
        success: false,
        files: [],
        message: "Kiro does not support global install. Use --tool=kiro without --global.",
      };
    }

    const specDir = this.getInstallPath(scope, projectRoot);
    const files = [
      path.join(specDir, "requirements.md"),
      path.join(specDir, "design.md"),
      path.join(specDir, "tasks.md"),
      path.join(specDir, this.markerFile),
    ];

    if (dryRun) {
      return { success: true, files, message: `Would install to ${specDir}` };
    }

    // --- Actual install ---
    this.writeFile(path.join(specDir, "requirements.md"), this._generateRequirements());
    this.writeFile(path.join(specDir, "design.md"), this._generateDesign());
    this.writeFile(path.join(specDir, "tasks.md"), this._generateTasks());
    this.writeMarker(specDir);

    console.log(`Installed refactoring skill for Kiro (limited — spec format)`);
    return { success: true, files, message: `Installed to ${specDir}` };
  }

  uninstall({ scope, projectRoot, dryRun = false }) {
    if (scope === "global") {
      return { success: true, message: "Kiro does not use global install — nothing to remove" };
    }

    const specDir = this.getInstallPath(scope, projectRoot);

    if (!this.hasMarker(specDir)) {
      return { success: true, message: "Not installed for Kiro — nothing to remove" };
    }

    if (dryRun) {
      return { success: true, message: `Would remove Kiro files from ${specDir}` };
    }

    // Remove entire spec directory
    if (fs.existsSync(specDir)) {
      fs.rmSync(specDir, { recursive: true, force: true });
    }

    console.log(`Removed refactoring skill from Kiro`);
    return { success: true, message: "Uninstalled from Kiro" };
  }
}

module.exports = KiroAdapter;
