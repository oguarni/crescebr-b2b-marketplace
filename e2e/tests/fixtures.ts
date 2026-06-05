import { test as base, expect } from '@playwright/test';

/**
 * Zero-token network guard.
 *
 * CresceBR does not call any LLM/AI provider today, so this is a safety net
 * rather than a functional mock: it hard-blocks the browser from reaching any
 * known LLM host and answers with a static, canned JSON response instead.
 *
 * Why it exists: the CI E2E run must NEVER spend Claude/LLM tokens. If a future
 * change (or a transitive dependency) ever issues a request to one of these
 * providers during a test, it is intercepted here and fulfilled with a
 * simulated static body — the request never leaves the runner, so it is
 * impossible to incur token cost. Tests that depend on such a call would receive
 * the stub and still pass, 100% free.
 *
 * Matches the host (with optional subdomain and port) for the major providers.
 */
const LLM_HOST_RE =
  /^https?:\/\/(?:[^/]+\.)?(?:anthropic\.com|openai\.com|openai\.azure\.com|cohere\.ai|cohere\.com|mistral\.ai|x\.ai|generativelanguage\.googleapis\.com)(?::\d+)?\//i;

/** Static response returned in place of any real LLM call. */
const STUB_BODY = JSON.stringify({
  stubbed: true,
  note: 'LLM provider blocked by the E2E network guard — no tokens were spent.',
});

export const test = base.extend({
  page: async ({ page }, use) => {
    await page.route(LLM_HOST_RE, route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: STUB_BODY,
      })
    );
    await use(page);
  },
});

export { expect };
