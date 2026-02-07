# Refactoring Prioritization Reference

Framework for ranking which code smells to fix first. Use after scoring smells with `references/metrics.md` and `references/security-smells.md`.

## Quick Reference

```yaml
scoring:
  formula: "(Severity x Frequency x Impact) / Effort"
  scales: { min: 1, max: 5 }
  score_range: { min: 0.2, max: 125 }
decision:
  fix_now: ">15"
  defer: "5-15"
  accept: "<5"
overrides: [critical_security, team_blocker, compliance]
tiers:
  quick_wins: { severity: ">=3", effort: ">=4" }
  strategic: { severity: ">=3", effort: "2-3" }
  planned: { score: "5-15", effort: "1-2" }
  accept: { score: "<5" }
```

## Priority Score Formula

```
Score = (Severity x Frequency x Impact) / Effort

Where:
  Severity  (1-5): How bad is the smell? (5=critical, 1=trivial)
  Frequency (1-5): How often is this code changed? (5=daily, 1=never)
  Impact    (1-5): How many files/modules affected? (5=system-wide, 1=isolated)
  Effort    (1-5): How hard to fix? (5=trivial, 1=major rewrite)
```

**Score range:** 0.2 to 125. Higher = higher priority. All scales start at 1 (never 0), so division by zero cannot occur.

### Scale Definitions

**Severity:**
| Value | Label | Criteria |
|-------|-------|----------|
| 5 | Critical | Security vulnerability, data corruption risk, crash |
| 4 | Major | Blocks feature development, causes frequent bugs |
| 3 | Moderate | Slows development, makes code hard to understand |
| 2 | Minor | Cosmetic, readability concern |
| 1 | Trivial | Nitpick, style preference |

**Frequency (change rate):**
| Value | Label | Criteria |
|-------|-------|----------|
| 5 | Very high | Changed daily or multiple times per week |
| 4 | High | Changed weekly |
| 3 | Moderate | Changed monthly |
| 2 | Low | Changed quarterly |
| 1 | Rare | Stable code, changed <1x/year |

**Impact (blast radius):**
| Value | Label | Criteria |
|-------|-------|----------|
| 5 | System-wide | Affects entire codebase or all users |
| 4 | Multi-module | Affects 3+ modules or services |
| 3 | Multi-file | Affects 2-5 files in same module |
| 2 | Single file | Contained to one file |
| 1 | Isolated | Single function or block |

**Effort (inverse — higher = easier):**
| Value | Label | Criteria |
|-------|-------|----------|
| 5 | Trivial | <15 minutes, mechanical change |
| 4 | Easy | <1 hour, straightforward |
| 3 | Moderate | 1-4 hours, some complexity |
| 2 | Hard | 4-8 hours, requires careful planning |
| 1 | Major | 8+ hours, significant rewrite needed |

## Decision Tree: Fix / Defer / Accept

```
Score > 15 ──→ FIX NOW
              • Security/compliance risk? → Fix immediately
              • Blocks new features? → Fix this sprint
              • High churn + low health? → Fix as priority

Score 5-15 ──→ DEFER
              • Low churn rate? → Defer to next cycle
              • No immediate business need? → Batch with related work
              • Moderate risk? → Add to tech debt backlog

Score < 5 ───→ ACCEPT
              • Legacy code with no active changes? → Accept
              • Cost > benefit? → Accept
              • Scheduled for replacement? → Accept
```

**Override rules (always fix regardless of score):**
- Security smell severity = Critical → Fix immediately
- Blocks team members → Fix immediately
- Regulatory/compliance requirement → Fix immediately

## ROI Ranking: Quick Wins First

After scoring all smells, sort by Score descending. Then apply this grouping:

### Tier 1: Quick Wins (high score, low effort)
Severity >= 3, Effort >= 4 (easy fixes). Do these first — maximum improvement for minimum work.

**Examples:** Rename unclear variables, extract duplicated constants, add guard clauses, remove dead code.

### Tier 2: Strategic Improvements (high score, moderate effort)
Severity >= 3, Effort 2-3. Plan these — high impact but need careful execution.

**Examples:** Extract God Class, decompose Long Method, introduce design patterns.

### Tier 3: Planned Overhauls (moderate score, high effort)
Score 5-15, Effort 1-2. Schedule these — worth doing but not urgent.

**Examples:** Replace inheritance with composition, migrate to new patterns, restructure module boundaries.

### Tier 4: Accept or Ignore (low score)
Score < 5. Document and move on.

## Hotspot Analysis (CodeScene Model)

Combine code health with change frequency to find the highest-ROI refactoring targets:

```
Hotspot Priority = (10 - Code Health) x Change Frequency

Code Health: 0-10 (0=worst, 10=best)
Change Frequency: commits touching file in last 90 days
```

**Interpretation:**
- High hotspot (unhealthy + high churn) = refactor first
- Low hotspot (healthy or stable) = leave alone
- Unhealthy + stable = accept (not causing active pain)

## Technical Debt Ratio (SonarQube)

`Debt Ratio = Remediation Cost / Development Cost x 100%`

| Rating | Ratio | Meaning |
|--------|-------|---------|
| A | <5% | Excellent — healthy codebase |
| B | 5-10% | Good — manageable debt |
| C | 10-20% | Moderate — plan remediation |
| D | 20-50% | Poor — debt is slowing development |
| E | >50% | Critical — debt dominates development effort |

## Agent Checklist

When prioritizing refactoring findings, follow this sequence:

1. **Score each smell** using the Priority Score Formula above
2. **Flag overrides** — any Critical security smell or team blocker gets auto-promoted to top
3. **Sort by score** descending
4. **Group into tiers** (Quick Wins → Strategic → Planned → Accept)
5. **Present to user** with score, tier, and recommended action
6. **For `/refactor:review`**: Report all tiers with scores — do not filter
7. **For `/refactor:fast`**: Execute Tier 1 only, report Tiers 2-3 as suggestions
8. **For `/refactor:plan`**: Plan Tiers 1-2, document Tier 3 as future phases
