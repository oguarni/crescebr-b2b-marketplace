/**
 * Axios adapter that serves the demo API from inside the browser.
 *
 * Installing an adapter replaces transport entirely, so no request leaves the
 * page: the hosted build needs no backend, no database and no origin to be
 * reachable. Request and response interceptors still run, which is what keeps
 * the app's auth header and 401 handling on their normal paths.
 */

import {
  AxiosError,
  type AxiosAdapter,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import { handleDemoRequest } from './handlers';

/** Enough delay for loading states to render as designed, not enough to annoy. */
const LATENCY_MS = import.meta.env.MODE === 'test' ? 0 : 120;

const API_PREFIX = '/api/v1';

const toPath = (config: InternalAxiosRequestConfig): string => {
  const combined = `${config.baseURL ?? ''}${config.url ?? ''}`;
  const [path, query = ''] = combined.split('?');
  const trimmed = path.startsWith(API_PREFIX) ? path.slice(API_PREFIX.length) : path;

  // `params` set by the caller has to be folded in; the adapter runs before
  // axios would otherwise serialize it onto the URL.
  const search = new URLSearchParams(query);
  for (const [key, value] of Object.entries(config.params ?? {})) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) value.forEach(entry => search.append(key, String(entry)));
    else search.append(key, String(value));
  }

  const serialized = search.toString();
  return serialized ? `${trimmed || '/'}?${serialized}` : trimmed || '/';
};

/**
 * A multipart upload arrives as FormData. Handlers are synchronous, so the file
 * is read here and passed on as text: `{ csvText, fileName }` for the CSV
 * import, plus any plain fields.
 */
/** FileReader rather than Blob.text(): the same code runs in browsers and jsdom. */
const readText = (file: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });

const fromFormData = async (form: FormData): Promise<Record<string, unknown>> => {
  const body: Record<string, unknown> = {};
  for (const [key, value] of form.entries()) {
    if (typeof value === 'string') body[key] = value;
    else {
      body.csvText = await readText(value);
      body.fileName = value.name;
    }
  }
  return body;
};

const toBody = (config: InternalAxiosRequestConfig): Record<string, unknown> => {
  if (config.data === undefined || config.data === null) return {};
  if (typeof config.data === 'string') {
    try {
      return JSON.parse(config.data) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return config.data as Record<string, unknown>;
};

const toToken = (config: InternalAxiosRequestConfig): string | null => {
  const header = config.headers?.Authorization ?? config.headers?.authorization;
  if (typeof header !== 'string') return null;
  return header.startsWith('Bearer ') ? header.slice(7) : header;
};

const delay = (ms: number): Promise<void> =>
  ms > 0 ? new Promise(resolve => setTimeout(resolve, ms)) : Promise.resolve();

/**
 * Puts the body through the same JSON round-trip a real response would take.
 *
 * Without this the handlers hand live `Date` objects to the app, while the
 * Express API always delivers ISO strings — and pages that do `createdAt.split()`
 * crash against the demo but not against the server. Serializing here keeps the
 * wire format identical for every endpoint instead of per handler.
 */
const toWireFormat = (body: unknown): unknown => JSON.parse(JSON.stringify(body));

export const demoAdapter: AxiosAdapter = async config => {
  const requestBody =
    config.data instanceof FormData ? await fromFormData(config.data) : toBody(config);
  const { status, body } = handleDemoRequest(
    config.method ?? 'get',
    toPath(config),
    requestBody,
    toToken(config)
  );

  await delay(LATENCY_MS);

  const response: AxiosResponse = {
    data: toWireFormat(body),
    status,
    statusText: status === 200 || status === 201 ? 'OK' : 'Error',
    headers: {},
    config,
    request: null,
  };

  if (status >= 200 && status < 300) return response;

  // Reject the way a real transport would, so the response interceptor sees the
  // same `error.response.status` it handles today.
  throw new AxiosError(
    (body as { error?: string })?.error ?? `Request failed with status code ${status}`,
    status === 404 ? AxiosError.ERR_BAD_REQUEST : AxiosError.ERR_BAD_RESPONSE,
    config,
    null,
    response
  );
};
