Find and fix lint errors across the project.

## Steps

1. **Scan**: Run `npm run lint` in both backend/ and frontend/. Capture all errors and warnings.
2. **Auto-fix**: Run `npx eslint --fix` on files with auto-fixable issues.
3. **Manual fixes**: For remaining errors:
   - Read the source file
   - Fix the issue (remove unused imports, add types, etc.)
   - Verify the fix doesn't break functionality
4. **Verify**: Re-run `npm run lint` to confirm zero errors.
5. **Report**: Show before/after counts.

## Arguments

- `$ARGUMENTS` - Optional: "backend" or "frontend" to scope to one workspace

## Rules

- Fix errors first, warnings second
- Remove unused imports/variables rather than prefixing with `_`
- Replace `any` types with proper types when the type is inferrable
- Do NOT suppress lint rules with `// eslint-disable` comments
- Run tests after fixing to ensure no regressions
