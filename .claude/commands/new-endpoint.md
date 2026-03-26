Scaffold a new backend API endpoint end-to-end following the project's layered architecture.

## Arguments

- `$ARGUMENTS` — Required: description of the endpoint (e.g., "GET /api/v1/suppliers/:id/reviews - list reviews for a supplier")

## Steps

1. **Parse** the endpoint description to determine:
   - HTTP method (GET, POST, PUT, DELETE)
   - Route path and params
   - Domain (products, orders, quotations, ratings, admin, auth, or new)
   - Required role/permissions

2. **Read existing patterns** from the matching domain:
   - Route file: `backend/src/routes/<domain>.ts`
   - Controller: `backend/src/controllers/<domain>Controller.ts`
   - Service: `backend/src/services/<domain>Service.ts` or `<domain>.service.ts`
   - Repository: `backend/src/repositories/<domain>.repository.ts` (if exists)
   - Validator: `backend/src/validators/<domain>.validators.ts` (if POST/PUT/PATCH)

3. **Generate files** following the architecture in `backend/CLAUDE.md`:

   **Route** — Add to existing route file:
   ```typescript
   router.<method>('/<path>', authenticateJWT, requirePermission(Permission.<X>), <validation>, <handler>);
   ```

   **Validator** (for POST/PUT/PATCH) — Add to existing validator file:
   ```typescript
   export const <name>Validation = [
     body('field').isType().withMessage('message'),
   ];
   ```

   **Controller** — Thin handler, delegates to service:
   ```typescript
   export const <name> = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
     const result = await <service>.<method>(params);
     res.status(200).json({ success: true, data: result });
   });
   ```

   **Service** — Business logic:
   ```typescript
   async <method>(params): Promise<ReturnType> {
     // validation, business rules, repository calls
   }
   ```

   **Repository** (if new query pattern needed) — Add to existing repo file.

4. **Generate test file** — Create `backend/src/controllers/__tests__/<name>.test.ts` following the pattern in `backend/src/__tests__/CLAUDE.md`.

5. **Verify** — Run `cd backend && npm run build` to confirm no TypeScript errors.

## Rules

- Follow existing naming conventions in the codebase
- Use `requirePermission` or `requireRole` from rbac.ts, not inline role checks
- All POST/PUT/PATCH must have validation middleware
- Controller must NOT contain business logic or direct model access
- Add appropriate rate limiting profile
