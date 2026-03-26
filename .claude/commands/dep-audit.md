Audit dependency health and security vulnerabilities across all workspaces.

## Steps

1. **Vulnerability scan**: Run `npm audit` in root, backend/, and frontend/ directories. Report vulnerabilities by severity.
2. **Outdated packages**: Run `npm outdated` in backend/ and frontend/. Flag packages with:
   - Security patches available (patch version behind)
   - Major version upgrades available
   - Known CVEs in current version
3. **Actionable fixes**: Run `npm audit fix --dry-run` to preview safe fixes. Report what would change.
4. **Summary table**: Present findings as:

| Package | Current | Fix Available | Severity | Action |
|---------|---------|---------------|----------|--------|

## Priority

1. Critical/High vulnerabilities with available fixes
2. Packages with known CVEs
3. Major version upgrades for core dependencies

## Rules

- Do NOT run `npm audit fix` without user confirmation
- Flag any fix that would require a major version bump
- Note if a vulnerability is dev-only vs production
