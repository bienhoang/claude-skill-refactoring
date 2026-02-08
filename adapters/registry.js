#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

/**
 * Adapter registry with convention-based discovery.
 * Scans adapters/ directory for .js files, instantiates each,
 * and registers by adapter.name. Exported as singleton.
 */
class AdapterRegistry {
  constructor() {
    this._adapters = new Map();
    this._discovered = false;
  }

  /**
   * Scan adapters/ directory for adapter files.
   * Skips base-adapter.js and registry.js.
   * Called lazily on first access.
   */
  _discover() {
    if (this._discovered) return;
    this._discovered = true;

    const dir = __dirname;
    const skipFiles = new Set(["base-adapter.js", "registry.js"]);

    let files;
    try {
      files = fs.readdirSync(dir).filter(
        (f) => f.endsWith(".js") && !skipFiles.has(f)
      );
    } catch {
      return;
    }

    for (const file of files) {
      try {
        const AdapterClass = require(path.join(dir, file));
        const adapter = new AdapterClass();
        this._adapters.set(adapter.name, adapter);
      } catch {
        // Skip invalid adapters — don't crash registry
      }
    }
  }

  /** Get adapter by name. Throws if not found. */
  get(name) {
    this._discover();
    const adapter = this._adapters.get(name);
    if (!adapter) {
      throw new Error(
        `Unknown tool: "${name}". Run "npx refactoring-kit tools" to see available tools.`
      );
    }
    return adapter;
  }

  /** Check if adapter exists by name */
  has(name) {
    this._discover();
    return this._adapters.has(name);
  }

  /** List all registered adapters with name, displayName, capabilities */
  list() {
    this._discover();
    return Array.from(this._adapters.values()).map((a) => ({
      name: a.name,
      displayName: a.displayName,
      capabilities: a.capabilities,
    }));
  }

  /** Get the default adapter (claude-code) */
  getDefault() {
    return this.get("claude-code");
  }
}

module.exports = new AdapterRegistry();
