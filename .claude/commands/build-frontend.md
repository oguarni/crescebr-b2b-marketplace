Run a production build of the frontend and analyze bundle sizes.

## Steps

1. **Build shared types first**: Run `cd shared && npm run build` (frontend depends on `@shared/types`).
2. **Build frontend**: Execute `cd frontend && npm run build`. Report any TypeScript errors or warnings.
3. **Analyze bundle sizes**: Run `ls -lh frontend/dist/assets/*.js | sort -k5 -rh | head -20` to list the largest JS chunks.
4. **Check for size warnings**: Flag any chunk exceeding 500KB (Vite default warning threshold).
5. **Report**:
   - Total build size (`du -sh frontend/dist/`)
   - Top 5 largest JS chunks with sizes
   - Any chunks over 500KB (requires attention)
   - Confirm `import.meta.env.DEV` blocks are absent from production bundle

## Vite Config Reference

Manual chunks are configured in `frontend/vite.config.ts`. Current split strategy:
- `vendor-react` — React + React DOM
- `vendor-mui` — MUI core + emotion
- `vendor-router` — React Router
- Admin routes should be lazy-loaded via `React.lazy()` if `index.js` exceeds 500KB

## Notes

- Run `grep -r "admin123\|password123\|supplier123\|buyer123" frontend/dist/` to verify no test credentials leaked into production build
