#!/usr/bin/env python3
"""Validate Claude Code skill structure and quality. 29-point scoring system."""

import sys
import os
import re
import json

# Constants
PASS_THRESHOLD = 24
MAX_TOKENS = 5000
MAX_NAME_LEN = 64
MAX_DESC_LEN = 1024
MIN_DESC_LEN = 50
NAME_REGEX = r'^[a-z0-9-]+$'

NATURAL_KEYWORDS = [
    'refactor', 'clean up', 'improve', 'fix', 'simplify',
    'messy', 'complex', 'debt', 'quality'
]
TECHNICAL_KEYWORDS = [
    'code smell', 'complexity', 'coupling', 'cohesion',
    'duplication', 'dry', 'pattern'
]


def parse_frontmatter(content):
    """Extract YAML frontmatter between --- delimiters. Returns (data_dict, body, error)."""
    match = re.match(r'^---\s*\n(.*?)\n---\s*\n', content, re.DOTALL)
    if not match:
        return None, content, "No YAML frontmatter found"

    fm_text = match.group(1)
    body = content[match.end():]

    data = {}
    # Extract name: single line
    name_match = re.search(r'^name:\s*(.+)$', fm_text, re.MULTILINE)
    if name_match:
        data['name'] = name_match.group(1).strip().strip('"\'')

    # Extract description: handle multi-line (> or |)
    desc_match = re.search(r'^description:\s*[>|]\s*\n((?:\s+.+\n?)*)', fm_text, re.MULTILINE)
    if desc_match:
        data['description'] = ' '.join(desc_match.group(1).strip().split())
    else:
        inline_match = re.search(r'^description:\s*(.+)$', fm_text, re.MULTILINE)
        if inline_match:
            data['description'] = inline_match.group(1).strip().strip('"\'')

    return data, body, None


def validate_critical(skill_path, content):
    """Run 5 critical checks. Returns list of (name, passed, points, max_points, detail)."""
    checks = []

    # 1. SKILL.md exists
    skill_file = os.path.join(skill_path, 'SKILL.md')
    exists = os.path.isfile(skill_file)
    checks.append(("SKILL.md exists", exists, 3 if exists else 0, 3, ""))

    if not content:
        checks.append(("Valid YAML frontmatter", False, 0, 3, "No content to parse"))
        checks.append(("name field valid", False, 0, 3, ""))
        checks.append(("description field valid", False, 0, 3, ""))
        checks.append(("Body non-empty", False, 0, 3, ""))
        return checks

    # 2. Valid YAML frontmatter
    data, body, error = parse_frontmatter(content)
    fm_valid = data is not None
    checks.append(("Valid YAML frontmatter", fm_valid, 3 if fm_valid else 0, 3,
                    error or ""))

    # 3. Name field valid
    name = data.get('name', '') if data else ''
    name_valid = bool(name and re.match(NAME_REGEX, name) and len(name) <= MAX_NAME_LEN)
    detail = f": {name}" if name_valid else ""
    checks.append(("name field valid", name_valid, 3 if name_valid else 0, 3, detail))

    # 4. Description field valid
    desc = data.get('description', '') if data else ''
    desc_valid = bool(desc and len(desc) <= MAX_DESC_LEN)
    checks.append(("description field valid", desc_valid, 3 if desc_valid else 0, 3, ""))

    # 5. Body non-empty
    body_text = body if data is not None else content
    body_valid = bool(body_text and body_text.strip())
    checks.append(("Body non-empty", body_valid, 3 if body_valid else 0, 3, ""))

    return checks


def validate_structure(skill_path):
    """Run 4 structure checks. Returns list of check results."""
    checks = []

    # 1. references/ exists with .md files
    refs_dir = os.path.join(skill_path, 'references')
    md_count = 0
    if os.path.isdir(refs_dir):
        for root, _, files in os.walk(refs_dir):
            md_count += sum(1 for f in files if f.endswith('.md'))
    refs_valid = md_count > 0
    detail = f" ({md_count} files)" if refs_valid else ""
    checks.append((f"references/ exists{detail}", refs_valid, 2 if refs_valid else 0, 2, ""))

    # 2. commands/ exists with .md files
    cmds_dir = os.path.join(skill_path, 'commands')
    cmd_count = 0
    if os.path.isdir(cmds_dir):
        for root, _, files in os.walk(cmds_dir):
            cmd_count += sum(1 for f in files if f.endswith('.md'))
    cmds_valid = cmd_count > 0
    detail = f" ({cmd_count} files)" if cmds_valid else ""
    checks.append((f"commands/ exists{detail}", cmds_valid, 2 if cmds_valid else 0, 2, ""))

    # 3. .claude-skill.json valid
    json_path = os.path.join(skill_path, '.claude-skill.json')
    json_valid = False
    try:
        if os.path.isfile(json_path):
            with open(json_path, 'r') as f:
                data = json.load(f)
            json_valid = 'name' in data
    except (json.JSONDecodeError, PermissionError):
        pass
    checks.append((".claude-skill.json valid", json_valid, 2 if json_valid else 0, 2, ""))

    # 4. package.json valid
    pkg_path = os.path.join(skill_path, 'package.json')
    pkg_valid = False
    try:
        if os.path.isfile(pkg_path):
            with open(pkg_path, 'r') as f:
                data = json.load(f)
            pkg_valid = 'name' in data and 'version' in data
    except (json.JSONDecodeError, PermissionError):
        pass
    checks.append(("package.json valid", pkg_valid, 1 if pkg_valid else 0, 1, ""))

    return checks


def validate_quality(body, description):
    """Run 4 quality checks. Returns list of check results."""
    checks = []

    # 1. Auto-invocation section present
    auto_present = bool(body and re.search(r'auto.?invoc', body, re.IGNORECASE))
    checks.append(("Auto-invocation section present", auto_present,
                    2 if auto_present else 0, 2, ""))

    # 2. Dual keywords in description
    desc_lower = (description or '').lower()
    has_natural = any(kw in desc_lower for kw in NATURAL_KEYWORDS)
    has_technical = any(kw in desc_lower for kw in TECHNICAL_KEYWORDS)
    dual = has_natural and has_technical
    checks.append(("Dual keywords in description", dual, 2 if dual else 0, 2, ""))

    # 3. Token count < 5k
    token_count = len(body or '') // 4
    token_ok = token_count < MAX_TOKENS
    detail = f": {token_count:,} ({'<' if token_ok else '>'} {MAX_TOKENS:,})"
    checks.append((f"Token count{detail}", token_ok, 2 if token_ok else 0, 2, ""))

    # 4. Description > 50 chars
    desc_len = len(description or '')
    desc_ok = desc_len > MIN_DESC_LEN
    detail = f": {desc_len} chars ({'>' if desc_ok else '<='} {MIN_DESC_LEN})"
    checks.append((f"Description length{detail}", desc_ok, 1 if desc_ok else 0, 1, ""))

    return checks


def print_results(all_checks, score, max_score):
    """Print formatted results with tier headers."""
    sep = "==========================================================="
    print(f"\n{sep}")
    print("SKILL VALIDATION RESULTS")
    print(f"{sep}\n")

    tiers = [
        ("CRITICAL", all_checks[:5]),
        ("STRUCTURE", all_checks[5:9]),
        ("QUALITY", all_checks[9:]),
    ]

    for tier_name, checks in tiers:
        print(f"{tier_name}:")
        for name, passed, pts, max_pts, _detail in checks:
            status = "PASS" if passed else "FAIL"
            print(f"  [{status}]  {name:<45} ({pts}/{max_pts})")
        print()

    pct = round(score / max_score * 100) if max_score else 0
    result = "PASS" if score >= PASS_THRESHOLD else "FAIL"
    print(sep)
    print(f"SCORE: {score}/{max_score} ({pct}%) -- {result}")
    print(sep)


def main():
    skill_path = sys.argv[1] if len(sys.argv) > 1 else '.'
    skill_path = os.path.abspath(skill_path)

    # Read SKILL.md content
    skill_file = os.path.join(skill_path, 'SKILL.md')
    content = None
    if os.path.isfile(skill_file):
        try:
            with open(skill_file, 'r') as f:
                content = f.read()
        except PermissionError:
            print(f"Warning: Cannot read {skill_file}")

    # Parse frontmatter for quality checks
    description = ''
    body = ''
    if content:
        data, body, _ = parse_frontmatter(content)
        if data:
            description = data.get('description', '')

    # Run all checks (never early-exit)
    critical = validate_critical(skill_path, content)
    structure = validate_structure(skill_path)
    quality = validate_quality(body, description)

    all_checks = critical + structure + quality
    score = sum(c[2] for c in all_checks)
    max_score = sum(c[3] for c in all_checks)

    print_results(all_checks, score, max_score)
    sys.exit(0 if score >= PASS_THRESHOLD else 1)


if __name__ == '__main__':
    main()
