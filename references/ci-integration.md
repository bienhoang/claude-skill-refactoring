# CI/CD Integration Reference

Guidance for integrating refactoring quality gates into CI/CD pipelines. Load when teams want to enforce code quality standards in automated workflows.

## Quick Reference

```yaml
ci_integration:
  pipeline_stages: [lint, test, analyze, gate]
  hard_blocks: [critical_bugs, security_cvss_gt_7, coverage_drop_gt_2pct, new_circular_deps]
  soft_blocks: [minor_smells, duplication_gt_3pct, coverage_lt_80pct]
  strategy: start_loose_tighten_gradually
```

## GitHub Actions Pipeline

Multi-stage workflow for code quality enforcement:

```yaml
# .github/workflows/code-quality.yml
name: Code Quality
on: [pull_request]
jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install dependencies
        run: npm ci  # or pip install, cargo build, etc.
      - name: Lint
        run: npm run lint  # eslint, ruff, golangci-lint, etc.
      - name: Test
        run: npm test  # jest, pytest, go test, cargo test
      - name: Static Analysis
        run: npx sonarqube-scanner  # or codecov, codeclimate
      - name: Quality Gate
        run: |
          # Examples per tool:
          # ESLint: npx eslint src/ --max-warnings 0
          # SonarQube: sonar-scanner -Dsonar.qualitygate.wait=true
          # Ruff: ruff check src/ --select E,W,F
          # golangci-lint: golangci-lint run --max-issues-per-linter 0
```

**Adapt per language** — the stage pattern (lint → test → analyze → gate) is universal:

| Language | Lint | Test | Analyze |
|----------|------|------|---------|
| JS/TS | `eslint`, `prettier` | `jest`, `vitest` | `sonarqube-scanner` |
| Python | `ruff check`, `black` | `pytest` | `sonarqube-scanner`, `bandit` |
| Go | `golangci-lint` | `go test ./...` | `staticcheck` |
| Rust | `clippy` | `cargo test` | `cargo audit` |
| Java | `checkstyle`, `spotless` | `mvn test`, `gradle test` | `sonarqube-scanner`, `spotbugs` |
| C# | `dotnet format` | `dotnet test` | `sonarqube-scanner` |

## Pre-Commit Hooks

Catch smells before they reach CI:

```bash
# Install husky + lint-staged (JS/TS projects)
npx husky init
npm install --save-dev lint-staged
```

In `package.json`:

```json
{
  "lint-staged": {
    "*.{js,ts,tsx}": ["eslint --fix --max-warnings 0", "prettier --write"],
    "*.py": ["ruff check --fix", "ruff format"],
    "*.go": ["gofmt -w", "golangci-lint run"]
  }
}
```

**Non-JS projects:** Use pre-commit framework (`pip install pre-commit`) with `.pre-commit-config.yaml` for language-agnostic hooks.

## Quality Gate Definitions

| Category | Condition | Action | Rationale |
|----------|-----------|--------|-----------|
| **Hard Block** | Critical/blocker bugs | Fail build | Correctness non-negotiable |
| **Hard Block** | Security CVSS > 7.0 | Fail build | High-severity vulnerabilities |
| **Hard Block** | Coverage drop > 2% | Fail build | Prevents test debt |
| **Hard Block** | New circular dependencies | Fail build | Architectural regression |
| **Soft Block** | Minor smells introduced | Warn only | Awareness without blocking velocity |
| **Soft Block** | Duplication > 3% | Warn only | Refactor when time permits |
| **Soft Block** | Coverage < 80% | Warn only | Target, not gatekeeper |

**Start loose, tighten gradually.** Begin with hard blocks only. Add soft blocks as warnings. Convert soft → hard as team builds confidence.

**Legacy vs new code:** Consider separate thresholds. New code: strict. Legacy: looser gates with a roadmap to tighten.

**Team maturity:** Early-stage teams → hard blocks only (critical bugs, security). Established teams → add coverage gates. Mature teams → add smell detection and duplication limits.

## Integration with /refactor:review

Use `/refactor:review` output as a PR quality check:

1. **Manual:** Run `/refactor:review src/` before opening PR. Paste report summary in PR description.
2. **Automated:** In CI, run static analysis tools that produce similar output (SonarQube, CodeClimate). Map findings to the same severity tiers (Critical/Major/Minor).
3. **PR comment:** Post analysis summary as a PR comment using `gh pr comment` or GitHub Actions bot.

**Mapping refactoring review to CI tools:**

| Refactoring Skill Concept | CI Tool Equivalent |
|--------------------------|-------------------|
| Code smells (Bloaters) | SonarQube: Code Smells |
| Security smells | SonarQube: Vulnerabilities, Snyk |
| Metrics thresholds | SonarQube: Quality Profiles |
| Prioritization tiers | SonarQube: Quality Gates |
| Trend tracking | SonarQube: Activity tab, CodeClimate trends |

## Best Practices

- **One tool per concern:** Don't run ESLint + SonarQube + CodeClimate all checking the same rules. Pick one source of truth per category.
- **Fast feedback:** Lint in pre-commit, test in CI, deep analysis nightly or per-PR.
- **Verify latest docs:** CI tool configurations change frequently. Always check the tool's current documentation for correct setup.
- **Incremental adoption:** Week 1: lint only. Week 2: add tests. Week 3: add quality gates. Don't add everything at once.
