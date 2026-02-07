# Security Smells Reference

Security-relevant code patterns to detect during the Analyze phase. Always scan for these — no opt-in needed.

Cross-reference: structural code smells are in `references/code-smells.md`. This file covers security-specific patterns that may not appear as traditional smells.

## Quick Reference

```yaml
security_severity:
  critical: [hardcoded_secrets, sql_injection, eval_user_input, command_injection, deserialization_untrusted]
  high: [missing_input_validation, weak_crypto, insecure_deserialization, xxe, xss]
  medium: [logging_sensitive_data, missing_rate_limits, outdated_deps, weak_randomness]
  low: [debug_in_production, commented_security_checks]
always_scan: true
report_section: "Security Findings"
```

## Severity Levels

| Severity | Criteria | Examples |
|----------|----------|----------|
| **Critical** | Direct exploitability, data breach risk | Hardcoded secrets, SQL injection, eval with user input |
| **High** | Exploitable with some effort | Missing input validation, weak crypto, insecure deserialization |
| **Medium** | Indirect risk, defense-in-depth gaps | Logging sensitive data, missing rate limits, outdated deps |
| **Low** | Informational, best-practice violations | Debug code in production, commented-out security checks |

## OWASP Top 10 as Code Patterns

### A01: Broken Access Control
- Missing authorization check before sensitive operations
- Direct object reference without ownership validation
- Path traversal: user input in file paths without sanitization
- **Detection:** Look for CRUD operations without preceding auth/permission checks

### A02: Cryptographic Failures
- Hardcoded encryption keys or salts
- Weak algorithms: MD5, SHA1 for security purposes (acceptable for checksums)
- Missing encryption for sensitive data at rest or in transit
- **Detection:** Search for `md5`, `sha1`, hardcoded key assignments

### A03: Injection
- SQL: string concatenation/formatting with user input in queries
- Command: user input passed to shell execution functions
- LDAP/XPath/NoSQL: dynamic query construction with user input
- **Detection:** String concat/interpolation adjacent to query/exec calls

### A04: Insecure Design
- No rate limiting on authentication or API endpoints
- Missing input validation at trust boundaries
- Business logic without abuse-case handling
- **Detection:** Auth endpoints without rate-limit middleware; missing input schemas

### A05: Security Misconfiguration
- Debug mode enabled in production (`DEBUG=True`, `debug: true`)
- Default credentials in config files
- Overly permissive CORS (`Access-Control-Allow-Origin: *`)
- Verbose error messages exposing stack traces to users
- **Detection:** Debug flags, wildcard CORS, default password values

### A06: Vulnerable Components
- Outdated dependencies with known CVEs
- Importing deprecated/unmaintained packages
- **Detection:** Check lock files against known vulnerability databases

### A07: Authentication Failures
- Weak password requirements (min length <8, no complexity)
- Missing brute-force protection
- Session tokens in URLs
- **Detection:** Password validation logic, session management patterns

### A08: Software & Data Integrity
- Deserialization of untrusted data without validation
- Missing checksum/signature verification for downloads
- CI/CD pipeline without integrity checks
- **Detection:** Deserialize calls on user-supplied data

### A09: Logging Failures
- Logging passwords, tokens, credit card numbers, PII
- No audit trail for security-relevant operations
- **Detection:** Log statements containing variables named password/token/secret/ssn/card

### A10: Server-Side Request Forgery (SSRF)
- User-controlled URLs passed to HTTP clients without validation
- Internal service URLs constructable from user input
- **Detection:** URL parameters passed directly to fetch/request calls

## Hardcoded Secrets Patterns

### Regex Patterns
Scan for these patterns in source code (case-insensitive where noted):

```
# Variable assignments (case-insensitive key names)
(password|passwd|pwd|secret|apikey|api_key|token|auth)\s*=\s*["'][^"']{8,}["']

# AWS Access Keys
(AWS|AKIA)[0-9A-Z]{16,}

# GitHub Tokens
ghp_[a-zA-Z0-9]{36}
github_pat_[a-zA-Z0-9_]{82}

# OpenAI / Anthropic Keys
sk-[a-zA-Z0-9]{32,}

# Private Keys
-----BEGIN (RSA|DSA|EC|OPENSSH) PRIVATE KEY-----

# Connection strings with embedded credentials
(mysql|postgres|mongodb|redis)://[^:]+:[^@]+@
```

### Structural Patterns
- Strings >50 chars assigned to variables named `key`, `secret`, `token`, `password`
- Base64-encoded strings >50 chars in source (not test) files
- Connection strings with embedded usernames and passwords
- `.env` values hardcoded as fallback defaults in source code

## Language-Specific Security Smells

### Python
| Pattern | Risk | Severity |
|---------|------|----------|
| `eval()`, `exec()`, `compile()` with user input | Code injection | Critical |
| `pickle.loads()` on untrusted data | Arbitrary code execution | Critical |
| `os.system()`, `subprocess.call(shell=True)` | Command injection | Critical |
| `__import__()` with dynamic strings | Code injection | High |
| `yaml.load()` without `Loader=SafeLoader` | Arbitrary code execution | High |
| `request.args` used directly in SQL | SQL injection | Critical |

### JavaScript / TypeScript
| Pattern | Risk | Severity |
|---------|------|----------|
| `innerHTML`, `dangerouslySetInnerHTML` with user data | XSS | Critical |
| `eval()`, `Function()` constructor | Code injection | Critical |
| `document.write()` with user data | XSS | Critical |
| `child_process.exec()` with user input | Command injection | Critical |
| `process.env` accessed in client-side code | Secret exposure | High |
| `new RegExp(userInput)` without escaping | ReDoS | Medium |

### SQL (all languages)
| Pattern | Risk | Severity |
|---------|------|----------|
| `"SELECT * FROM " + userInput` | SQL injection | Critical |
| `f"SELECT * FROM {table}"` (Python f-string) | SQL injection | Critical |
| `` `SELECT * FROM ${table}` `` (template literal) | SQL injection | Critical |
| Stored procedures with dynamic SQL from parameters | SQL injection | High |

### Java
| Pattern | Risk | Severity |
|---------|------|----------|
| `Runtime.exec()` with unsanitized input | Command injection | Critical |
| `Class.forName()` with user input | Code injection | High |
| `ObjectInputStream.readObject()` on untrusted data | Deserialization attack | Critical |
| `XMLParser` without disabling external entities | XXE | High |

### Go
| Pattern | Risk | Severity |
|---------|------|----------|
| `os/exec.Command` with unsanitized input | Command injection | Critical |
| SQL string concatenation instead of `db.Query(sql, args...)` | SQL injection | Critical |
| `template.HTML()` with user input | XSS | High |
| Missing `crypto/rand` (using `math/rand` for security) | Weak randomness | High |

## How to Apply

1. **Always scan** for security smells during Analyze phase — no opt-in needed
2. **Report separately** from structural smells — use "Security Findings" section
3. **Critical/High = mandatory fix** before proceeding with structural refactoring
4. **Feed severity** into `references/prioritization.md` for ROI ranking
5. **Language-specific:** Load the relevant language table based on detected language(s)
