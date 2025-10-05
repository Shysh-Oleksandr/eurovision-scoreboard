import axios from 'axios';

const apiBase = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8001';

export const api = axios.create({
	baseURL: apiBase,
	withCredentials: true,
});

let refreshAttached = false as boolean;
let accessTokenGetter: (() => string | null) | null = null;
let refreshPromise: Promise<string | undefined> | null = null;

// Install a single request interceptor that reads from a dynamic getter
api.interceptors.request.use((config) => {
	const token = accessTokenGetter ? accessTokenGetter() : null;
	if (token) {
		config.headers = config.headers || {};
		(config.headers as any).Authorization = `Bearer ${token}`;
	}
	return config;
});

export function setAccessTokenGetter(getToken: () => string | null) {
	accessTokenGetter = getToken;
}

export function attachRefreshInterceptor(refresh: () => Promise<string | undefined>) {
	if (refreshAttached) return;
	refreshAttached = true;
	api.interceptors.response.use(
		(res) => res,
		async (error) => {
			const { config, response } = error;
			if (!response) throw error;
			// Do not attempt to refresh if the failing request is itself the refresh endpoint
			if (config?.url && /\/auth\/refresh$/.test(config.url)) throw error;
			if (response.status !== 401 || (config as any).__isRetryRequest) throw error;

            if (!refreshPromise) {
                refreshPromise = refresh()
                    .then((token) => {
                        return token;
                    })
                    .finally(() => {
                        refreshPromise = null;
                    });
            }

            const token = await refreshPromise;
            if (token) {
                (config.headers as any).Authorization = `Bearer ${token}`;
            }
            (config as any).__isRetryRequest = true;
            return api(config);
		},
	);
}
