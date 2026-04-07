const RAW_API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api/user').trim();
const RAW_UPLOAD_URL = (import.meta.env.VITE_UPLOAD_URL || '').trim();

function stripTrailingSlash(value: string) {
    return value.replace(/\/+$/, '');
}

function getApiRoot() {
    const normalized = stripTrailingSlash(RAW_API_BASE_URL);
    return normalized.replace(/\/api\/(user|admin|deliverer|public|service)$/i, '/api');
}

export function getApiBaseUrl(scope: 'user' | 'deliverer' | 'public' | 'admin' | 'service') {
    const apiRoot = getApiRoot();
    return `${apiRoot}/${scope}`;
}

export function getSocketBaseUrl() {
    const apiRoot = getApiRoot();

    if (/^https?:\/\//i.test(apiRoot)) {
        return apiRoot.replace(/\/api$/i, '');
    }

    return window.location.origin;
}

export function getAssetBaseUrl() {
    if (RAW_UPLOAD_URL) {
        return stripTrailingSlash(RAW_UPLOAD_URL).replace(/\/uploads$/i, '');
    }

    const apiRoot = getApiRoot();
    if (/^https?:\/\//i.test(apiRoot)) {
        return apiRoot.replace(/\/api$/i, '');
    }

    return window.location.origin;
}

export function resolveAssetUrl(value?: string | null) {
    if (!value) {
        return '';
    }

    if (/^https?:\/\//i.test(value) || value.startsWith('data:') || value.startsWith('blob:')) {
        return value;
    }

    const assetBaseUrl = getAssetBaseUrl();
    if (value.startsWith('/')) {
        return `${assetBaseUrl}${value}`;
    }

    return `${assetBaseUrl}/${value.replace(/^\/+/, '')}`;
}
