import type {
  Evidence,
  HttpClient,
  HttpRequestOptions,
  HttpResponse,
  ResolvedConfig,
} from '../types.js';

/**
 * HTTP client built on the global `fetch` (Node 18+). Every response is
 * normalized and paired with an {@link Evidence} object so findings can carry
 * reproducible proof.
 *
 * It is deliberately thin: no retries, no following of unexpected redirects by
 * default (we want to observe the raw security posture of each endpoint).
 */
export class FetchHttpClient implements HttpClient {
  constructor(private readonly config: ResolvedConfig) {}

  resolve(path: string): string {
    if (/^https?:\/\//i.test(path)) return path;
    return new URL(path, this.config.baseUrl).toString();
  }

  get(
    path: string,
    options: Omit<HttpRequestOptions, 'path' | 'method'> = {},
  ): Promise<HttpResponse> {
    return this.request({ ...options, path, method: 'GET' });
  }

  async request(options: HttpRequestOptions): Promise<HttpResponse> {
    const method = (options.method ?? 'GET').toUpperCase();
    const url = this.resolve(options.path);

    const headers: Record<string, string> = {
      'user-agent': 'Pentry/security-scanner',
      ...lowerKeys(options.headers ?? {}),
    };

    if (options.includeAuth && this.config.auth) {
      if (this.config.auth.headers) Object.assign(headers, lowerKeys(this.config.auth.headers));
      if (this.config.auth.cookie) headers['cookie'] = this.config.auth.cookie;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.timeout);

    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers,
        body: options.body,
        redirect: 'manual',
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    const responseHeaders = headersToObject(response.headers);
    const setCookies = extractSetCookies(response.headers);
    const rawBody = await safeReadBody(response);
    const body = rawBody.slice(0, this.config.maxBodyCapture);

    const evidence: Evidence = {
      request: {
        method,
        url,
        headers,
        body: options.body,
      },
      response: {
        status: response.status,
        headers: responseHeaders,
        bodySnippet: body ? body.slice(0, Math.min(body.length, 512)) : undefined,
      },
    };

    return {
      status: response.status,
      headers: responseHeaders,
      setCookies,
      body,
      evidence,
    };
  }
}

function lowerKeys(input: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(input)) out[key.toLowerCase()] = value;
  return out;
}

function headersToObject(headers: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  headers.forEach((value, key) => {
    out[key.toLowerCase()] = value;
  });
  return out;
}

/**
 * Pull individual Set-Cookie values. `Headers.get('set-cookie')` flattens
 * multiple cookies into one comma-joined string, which is ambiguous, so we use
 * the undici-specific `getSetCookie()` when available and fall back gracefully.
 */
function extractSetCookies(headers: Headers): string[] {
  const anyHeaders = headers as Headers & { getSetCookie?: () => string[] };
  if (typeof anyHeaders.getSetCookie === 'function') {
    return anyHeaders.getSetCookie();
  }
  const single = headers.get('set-cookie');
  return single ? [single] : [];
}

async function safeReadBody(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return '';
  }
}
