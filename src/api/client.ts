import { API_BASE_URL } from '@/config';

/**
 * Fetch-based API client with an axios-compatible surface. Axios was removed
 * because a stray `Buffer` reference in it forced Next's 34 KB Buffer
 * polyfill into the render-critical chunk (~17 KB gz total with axios
 * itself). Call sites keep working unchanged: `api.method(...)` resolves to
 * `{ data, status, headers }`, and failures throw an error carrying
 * `response: { status, data }` — the shape `parseAxiosError` and the
 * queryClient retry policy duck-type.
 */

export interface ApiRequestConfig {
  params?: Record<string, unknown>;
  headers?: Record<string, string>;
  /** Request body for DELETE (axios parity: `api.delete(url, { data })`). */
  data?: unknown;
}

export interface ApiResponse<T = any> {
  data: T;
  status: number;
  headers: Headers;
}

export class ApiError extends Error {
  response: { status: number; data: any };

  constructor(status: number, data: any) {
    super(`Request failed with status code ${status}`);
    this.name = 'ApiError';
    this.response = { status, data };
  }
}

let accessTokenGetter: (() => string | null) | null = null;
let refreshFn: (() => Promise<string | undefined>) | null = null;
let refreshPromise: Promise<string | undefined> | null = null;

export function setAccessTokenGetter(getToken: () => string | null) {
  accessTokenGetter = getToken;
}

export function attachRefreshInterceptor(
  refresh: () => Promise<string | undefined>,
) {
  if (refreshFn) return;
  refreshFn = refresh;
}

function buildUrl(url: string, params?: Record<string, unknown>) {
  let query = '';

  if (params) {
    const search = new URLSearchParams();

    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null) continue;
      if (Array.isArray(value)) {
        for (const item of value) search.append(`${key}[]`, String(item));
      } else {
        search.append(key, String(value));
      }
    }
    const s = search.toString();

    if (s) query = (url.includes('?') ? '&' : '?') + s;
  }

  return `${API_BASE_URL}${url}${query}`;
}

async function parseBody(res: Response): Promise<any> {
  const text = await res.text();

  if (!text) return null;
  const contentType = res.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  return text;
}

async function request<T>(
  method: string,
  url: string,
  body: unknown,
  config: ApiRequestConfig | undefined,
  retry?: { token: string | undefined },
): Promise<ApiResponse<T>> {
  const headers = new Headers(config?.headers);

  if (body instanceof FormData) {
    // The browser must set the multipart boundary itself; callers that pass
    // an explicit multipart Content-Type (axios habit) would break it.
    headers.delete('content-type');
  } else if (body !== undefined && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }

  // One token policy: a retry prefers the token the refresh returned (axios
  // interceptor parity), falling back to the getter either way.
  const token = retry?.token ?? accessTokenGetter?.() ?? null;

  if (token) headers.set('authorization', `Bearer ${token}`);

  const res = await fetch(buildUrl(url, config?.params), {
    method,
    headers,
    credentials: 'include',
    body:
      body === undefined
        ? undefined
        : body instanceof FormData
        ? body
        : JSON.stringify(body),
  });

  if (!res.ok) {
    // Decide about the refresh before touching the body: a 401 that will be
    // retried discards its error body, and the refresh should start without
    // waiting for it to stream in.
    if (
      res.status === 401 &&
      refreshFn &&
      !retry &&
      !/\/auth\/refresh$/.test(url)
    ) {
      if (!refreshPromise) {
        refreshPromise = refreshFn().finally(() => {
          refreshPromise = null;
        });
      }
      // A rejected refresh propagates instead of the original 401 (axios
      // interceptor parity); a resolved one retries the request exactly once.
      const freshToken = await refreshPromise;

      return request<T>(method, url, body, config, { token: freshToken });
    }

    throw new ApiError(res.status, await parseBody(res));
  }

  const data = (await parseBody(res)) as T;

  return { data, status: res.status, headers: res.headers };
}

export interface UploadProgress {
  loaded: number;
  total: number;
  /** 0–100, rounded. */
  percent: number;
}

export interface ApiUploadConfig {
  onUploadProgress?: (progress: UploadProgress) => void;
  signal?: AbortSignal;
}

function parseXhrHeaders(raw: string): Headers {
  const headers = new Headers();

  for (const line of raw.trim().split(/[\r\n]+/)) {
    const idx = line.indexOf(':');

    if (idx > 0) {
      headers.append(line.slice(0, idx).trim(), line.slice(idx + 1).trim());
    }
  }

  return headers;
}

/**
 * Multipart upload with progress. `fetch` cannot report upload progress, so
 * this path uses XMLHttpRequest with the same token, credentials, error shape
 * and 401 → refresh → retry-once policy as `request()`.
 */
function upload<T>(
  url: string,
  formData: FormData,
  config: ApiUploadConfig | undefined,
  retry?: { token: string | undefined },
): Promise<ApiResponse<T>> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open('POST', buildUrl(url));
    xhr.withCredentials = true;

    const token = retry?.token ?? accessTokenGetter?.() ?? null;

    if (token) xhr.setRequestHeader('authorization', `Bearer ${token}`);

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || !config?.onUploadProgress) return;
      config.onUploadProgress({
        loaded: event.loaded,
        total: event.total,
        percent: Math.round((event.loaded / event.total) * 100),
      });
    };

    xhr.onerror = () => reject(new ApiError(0, null));
    xhr.onabort = () =>
      reject(new DOMException('Upload aborted', 'AbortError'));
    config?.signal?.addEventListener('abort', () => xhr.abort(), {
      once: true,
    });

    xhr.onload = () => {
      const { status } = xhr;
      const contentType = xhr.getResponseHeader('content-type') || '';
      let data: any = xhr.responseText || null;

      if (data && contentType.includes('application/json')) {
        try {
          data = JSON.parse(data);
        } catch {
          // keep the raw text
        }
      }

      if (status >= 200 && status < 300) {
        resolve({
          data: data as T,
          status,
          headers: parseXhrHeaders(xhr.getAllResponseHeaders()),
        });

        return;
      }

      if (
        status === 401 &&
        refreshFn &&
        !retry &&
        !/\/auth\/refresh$/.test(url)
      ) {
        if (!refreshPromise) {
          refreshPromise = refreshFn().finally(() => {
            refreshPromise = null;
          });
        }
        refreshPromise
          .then((freshToken) =>
            upload<T>(url, formData, config, { token: freshToken }),
          )
          .then(resolve, reject);

        return;
      }

      reject(new ApiError(status, data));
    };

    xhr.send(formData);
  });
}

export const api = {
  get: <T = any>(url: string, config?: ApiRequestConfig) =>
    request<T>('GET', url, undefined, config),
  /** POST multipart with upload progress (see `upload`). */
  upload: <T = any>(
    url: string,
    formData: FormData,
    config?: ApiUploadConfig,
  ) => upload<T>(url, formData, config),
  delete: <T = any>(url: string, config?: ApiRequestConfig) =>
    request<T>('DELETE', url, config?.data, config),
  post: <T = any>(url: string, body?: unknown, config?: ApiRequestConfig) =>
    request<T>('POST', url, body, config),
  put: <T = any>(url: string, body?: unknown, config?: ApiRequestConfig) =>
    request<T>('PUT', url, body, config),
  patch: <T = any>(url: string, body?: unknown, config?: ApiRequestConfig) =>
    request<T>('PATCH', url, body, config),
};
