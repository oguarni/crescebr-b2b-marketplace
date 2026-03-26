Perform a security audit of the backend codebase. Check all middleware, routes, and controllers for security issues.

## Audit Checklist

### 1. Authentication
- Verify all protected routes use `authenticateJWT` middleware
- Check JWT configuration (secret strength, expiration, algorithm)
- Review token refresh mechanism
- Check for token in response bodies (should only be in auth endpoints)

### 2. Authorization (RBAC)
- Verify all routes have appropriate role/permission guards
- Check for inline role checks in controllers that should use middleware
- Verify supplier status checks (approved/pending/rejected)
- Check resource ownership validation (canModifyProduct, canAccessOrder)

### 3. Input Validation
- Verify all POST/PUT/PATCH routes have validation middleware
- Check for SQL injection vectors (raw queries, unsanitized input)
- Check for XSS vectors (unescaped output)
- Verify file upload validation (type, size limits)

### 4. Rate Limiting
- Verify all public routes have rate limiting
- Check auth endpoints have strict rate limits
- Verify rate limit headers are set
- Check if rate limiter is distributed-ready (in-memory vs Redis)

### 5. CORS and Headers
- Check CORS configuration
- Verify Helmet.js headers
- Check for information leakage in error responses
- Verify no sensitive data in response headers

### 6. Data Protection
- Check password hashing (bcrypt rounds)
- Verify sensitive fields are excluded from queries
- Check for credential exposure in logs

## Output
Present findings as: PASS / WARN / FAIL for each item with specific file:line references.
